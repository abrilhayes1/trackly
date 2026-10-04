const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { ETIQUETA_INTERES, construirEntradasHistorial } = require('../lib/historial');

const INTERES_VALIDOS = Object.keys(ETIQUETA_INTERES);

function fechaValida(valor) {
  return typeof valor === 'string' && !Number.isNaN(new Date(valor).getTime());
}

router.get('/', requireAuth, async (req, res) => {
  const { data, error } = await req.supabase.from('leads').select('*');

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.json(data);
});

// buscador global: nombre, teléfono o email, en todo el equipo (la RLS limita al tenant)
router.get('/buscar', requireAuth, async (req, res) => {
  const q = String(req.query.q || '').trim();

  // sacamos comillas, barras y comodines para que no rompan el filtro
  const texto = q.replace(/["\\%*]/g, '').trim();

  if (texto.length < 2) {
    return res.json([]);
  }

  const filtros = [
    `nombre.ilike."%${texto}%"`,
    `email.ilike."%${texto}%"`,
    `telefono.ilike."%${texto}%"`,
  ];

  // si escribió un teléfono con espacios o guiones, probamos también solo con los números
  const digitos = texto.replace(/\D/g, '');
  if (digitos.length >= 3 && digitos !== texto) {
    filtros.push(`telefono.ilike."%${digitos}%"`);
  }

  const { data, error } = await req.supabase
    .from('leads')
    .select('*, asesor:profiles(nombre)')
    .or(filtros.join(','))
    .order('fecha_ingreso', { ascending: false })
    .limit(30);

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.json(data);
});

router.post('/', requireAuth, async (req, res) => {
  const { nombre, telefono, email, origen, consulta } = req.body ?? {};

  if (!nombre) {
    return res.status(400).json({ error: 'El nombre es obligatorio' });
  }

  // buscamos el tenant_id real desde profiles, no confiamos en lo que mande el cliente
  const { data: perfil, error: errorPerfil } = await req.supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', req.user.id)
    .single();

  if (errorPerfil || !perfil) {
    return res.status(400).json({ error: 'No se encontró el perfil del usuario' });
  }

  const { data, error } = await req.supabase
    .from('leads')
    .insert({
      tenant_id: perfil.tenant_id,
      asesor_id: req.user.id,
      nombre,
      telefono,
      email,
      origen,
      consulta,
      estado: 'activo'
    })
    .select()
    .single();

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.status(201).json(data);
});

router.patch('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const body = req.body ?? {};
  const camposPermitidos = ['interes', 'estado', 'ultimo_contacto', 'recordatorio', 'telefono', 'email', 'consulta'];

  const cambios = {};
  for (const campo of camposPermitidos) {
    if (body[campo] !== undefined) {
      cambios[campo] = body[campo];
    }
  }

  if (Object.keys(cambios).length === 0) {
    return res.status(400).json({ error: 'No mandaste ningún campo válido para actualizar' });
  }

  if (cambios.interes !== undefined && cambios.interes !== null && !INTERES_VALIDOS.includes(cambios.interes)) {
    return res.status(400).json({ error: 'Nivel de interés inválido' });
  }

  for (const campo of ['ultimo_contacto', 'recordatorio']) {
    if (cambios[campo] !== undefined && cambios[campo] !== null && !fechaValida(cambios[campo])) {
      return res.status(400).json({ error: `Fecha inválida en ${campo}` });
    }
  }

  // leemos cómo estaba el lead para poder registrar qué cambió
  const { data: antes, error: errorAntes } = await req.supabase
    .from('leads')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (errorAntes) {
    return res.status(400).json({ error: errorAntes.message });
  }

  if (!antes) {
    return res.status(404).json({ error: 'Lead no encontrado' });
  }

  cambios.updated_at = new Date().toISOString();

  const { data, error } = await req.supabase
    .from('leads')
    .update(cambios)
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  // si el lead existe pero el update no devolvió nada, la RLS no te dejó editarlo
  if (!data) {
    return res.status(403).json({ error: 'No tenés permiso para modificar este lead' });
  }

  // historial automático: cada cambio queda registrado con fecha, hora y quién lo hizo
  const entradas = construirEntradasHistorial(antes, cambios);
  let advertencia = null;

  if (entradas.length > 0) {
    const { error: errorHistorial } = await req.supabase
      .from('lead_historial')
      .insert(entradas.map((texto) => ({ lead_id: id, texto, autor_id: req.user.id })));

    if (errorHistorial) {
      console.error('No se pudo registrar el historial:', errorHistorial.message);
      advertencia = 'El cambio se guardó, pero no pudo registrarse en el historial.';
    }
  }

  res.json(advertencia ? { ...data, advertencia } : data);
});

router.get('/:id/historial', requireAuth, async (req, res) => {
  const { data, error } = await req.supabase
    .from('lead_historial')
    .select('id, texto, created_at, autor:profiles(nombre)')
    .eq('lead_id', req.params.id)
    .order('created_at', { ascending: false });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.json(data);
});

router.post('/:id/historial', requireAuth, async (req, res) => {
  const texto = String((req.body ?? {}).texto || '').trim();

  if (!texto) {
    return res.status(400).json({ error: 'Escribí algo para registrar' });
  }

  if (texto.length > 1000) {
    return res.status(400).json({ error: 'El texto es demasiado largo (máximo 1000 caracteres)' });
  }

  const { data, error } = await req.supabase
    .from('lead_historial')
    .insert({ lead_id: req.params.id, texto, autor_id: req.user.id })
    .select('id, texto, created_at, autor:profiles(nombre)')
    .single();

  if (error) {
    // 42501 = la RLS no te dejó insertar (el lead no es tuyo)
    if (error.code === '42501') {
      return res.status(403).json({ error: 'No tenés permiso para registrar actividad en este lead' });
    }
    return res.status(400).json({ error: error.message });
  }

  res.status(201).json(data);
});

module.exports = router;