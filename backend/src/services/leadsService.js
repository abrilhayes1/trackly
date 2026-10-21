// Lógica de negocio y consultas a Supabase de los leads. No sabe nada de HTTP:
// recibe datos, devuelve datos y, si algo está mal, lanza un ErrorHttp.
const { ErrorHttp, lanzarSiError } = require('../lib/errores');
const { ETIQUETA_INTERES, construirEntradasHistorial } = require('../lib/historial');

const INTERES_VALIDOS = Object.keys(ETIQUETA_INTERES);
// el estado no se edita directo: cambia solo al cerrar, reclamar o reactivar (cada uno con su historial)
const CAMPOS_EDITABLES = ['interes', 'destacado', 'ultimo_contacto', 'recordatorio', 'telefono', 'email', 'consulta'];

function fechaValida(valor) {
  return typeof valor === 'string' && !Number.isNaN(new Date(valor).getTime());
}

const ESTADOS_VALIDOS = ['activo', 'vencido', 'archivo', 'ganado', 'perdido'];

// Columnas que alcanzan para Estadísticas y Reportes (no hace falta nombre, contacto ni consulta)
const COLUMNAS_ANALISIS = 'id, estado, asesor_id, fecha_ingreso, ultimo_contacto, origen, interes, destacado';

// Sin filtro devuelve todos los leads del equipo. Con ?estado=activo,vencido devuelve solo esos
// (y trae el nombre del asesor): es la lista de trabajo de la app, sin el historial de cerrados.
// Con ?campos=analisis devuelve todos, pero solo las columnas que usan Estadísticas y Reportes.
async function listar(supabase, estados, campos) {
  if (campos !== undefined && campos !== 'analisis') {
    throw new ErrorHttp(400, 'Campos inválidos (usá analisis)');
  }

  let consulta = supabase.from('leads').select(campos === 'analisis' ? COLUMNAS_ANALISIS : '*, asesor:profiles(nombre)');

  if (estados !== undefined && estados !== '') {
    const lista = String(estados)
      .split(',')
      .map((e) => e.trim());
    if (lista.some((e) => !ESTADOS_VALIDOS.includes(e))) {
      throw new ErrorHttp(400, 'Estado inválido (usá activo, vencido, archivo, ganado o perdido)');
    }
    consulta = consulta.in('estado', lista);
  }

  const { data, error } = await consulta;
  lanzarSiError(error);
  return data;
}

// Cuántos ganados y perdidos hay (para los contadores del menú), contados en la base sin traer filas.
// El asesor cuenta los suyos; el líder, los de todo el equipo (como en sus pantallas).
async function totales(supabase, user) {
  const { data: perfil, error: errorPerfil } = await supabase.from('profiles').select('rol').eq('id', user.id).maybeSingle();
  lanzarSiError(errorPerfil);

  const contar = (estado) => {
    let q = supabase.from('leads').select('id', { count: 'exact', head: true }).eq('estado', estado);
    if (perfil?.rol !== 'lider') q = q.eq('asesor_id', user.id);
    return q;
  };

  const [ganados, perdidos] = await Promise.all([contar('ganado'), contar('perdido')]);
  lanzarSiError(ganados.error || perdidos.error);
  return { ganados: ganados.count ?? 0, perdidos: perdidos.count ?? 0 };
}

// buscador global: nombre, teléfono o email, en todo el equipo (la RLS limita al tenant)
async function buscar(supabase, consulta) {
  const q = String(consulta || '').trim();

  // sacamos comillas, barras y comodines para que no rompan el filtro
  const texto = q.replace(/["\\%*]/g, '').trim();

  if (texto.length < 2) {
    return [];
  }

  const filtros = [`nombre.ilike."%${texto}%"`, `email.ilike."%${texto}%"`, `telefono.ilike."%${texto}%"`];

  // si escribió un teléfono con espacios o guiones, probamos también solo con los números
  const digitos = texto.replace(/\D/g, '');
  if (digitos.length >= 3 && digitos !== texto) {
    filtros.push(`telefono.ilike."%${digitos}%"`);
  }

  const { data, error } = await supabase
    .from('leads')
    .select('*, asesor:profiles(nombre)')
    .or(filtros.join(','))
    .order('fecha_ingreso', { ascending: false })
    .limit(30);

  lanzarSiError(error);
  return data;
}

async function crear(supabase, user, body) {
  const { nombre, telefono, email, origen, consulta } = body ?? {};

  if (!nombre) {
    throw new ErrorHttp(400, 'El nombre es obligatorio');
  }

  // buscamos el tenant_id real desde profiles, no confiamos en lo que mande el cliente
  const { data: perfil, error: errorPerfil } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single();

  if (errorPerfil || !perfil) {
    throw new ErrorHttp(400, 'No se encontró el perfil del usuario');
  }

  const { data, error } = await supabase
    .from('leads')
    .insert({
      tenant_id: perfil.tenant_id,
      asesor_id: user.id,
      nombre,
      telefono,
      email,
      origen,
      consulta,
      estado: 'activo',
    })
    .select()
    .single();

  lanzarSiError(error);
  return data;
}

async function actualizar(supabase, user, id, body) {
  body = body ?? {};

  const cambios = {};
  for (const campo of CAMPOS_EDITABLES) {
    if (body[campo] !== undefined) {
      cambios[campo] = body[campo];
    }
  }

  if (Object.keys(cambios).length === 0) {
    throw new ErrorHttp(400, 'No mandaste ningún campo válido para actualizar');
  }

  if (cambios.interes !== undefined && cambios.interes !== null && !INTERES_VALIDOS.includes(cambios.interes)) {
    throw new ErrorHttp(400, 'Nivel de interés inválido');
  }

  if (cambios.destacado !== undefined && typeof cambios.destacado !== 'boolean') {
    throw new ErrorHttp(400, 'El campo destacado tiene que ser true o false');
  }

  for (const campo of ['ultimo_contacto', 'recordatorio']) {
    if (cambios[campo] !== undefined && cambios[campo] !== null && !fechaValida(cambios[campo])) {
      throw new ErrorHttp(400, `Fecha inválida en ${campo}`);
    }
  }

  // leemos cómo estaba el lead para poder registrar qué cambió
  const { data: antes, error: errorAntes } = await supabase.from('leads').select('*').eq('id', id).maybeSingle();

  lanzarSiError(errorAntes);

  if (!antes) {
    throw new ErrorHttp(404, 'Lead no encontrado');
  }

  cambios.updated_at = new Date().toISOString();

  const { data, error } = await supabase.from('leads').update(cambios).eq('id', id).select().maybeSingle();

  lanzarSiError(error);

  // si el lead existe pero el update no devolvió nada, la RLS no te dejó editarlo
  if (!data) {
    throw new ErrorHttp(403, 'No tenés permiso para modificar este lead');
  }

  // historial automático: cada cambio queda registrado con fecha, hora y quién lo hizo
  const entradas = construirEntradasHistorial(antes, cambios);
  let advertencia = null;

  if (entradas.length > 0) {
    const { error: errorHistorial } = await supabase
      .from('lead_historial')
      .insert(entradas.map((texto) => ({ lead_id: id, texto, autor_id: user.id })));

    if (errorHistorial) {
      console.error('No se pudo registrar el historial:', errorHistorial.message);
      advertencia = 'El cambio se guardó, pero no pudo registrarse en el historial.';
    }
  }

  return advertencia ? { ...data, advertencia } : data;
}

async function listarHistorial(supabase, leadId) {
  const { data, error } = await supabase
    .from('lead_historial')
    .select('id, texto, created_at, autor:profiles(nombre)')
    .eq('lead_id', leadId)
    .order('created_at', { ascending: false });

  lanzarSiError(error);
  return data;
}

async function agregarHistorial(supabase, user, leadId, body) {
  const texto = String((body ?? {}).texto || '').trim();

  if (!texto) {
    throw new ErrorHttp(400, 'Escribí algo para registrar');
  }

  if (texto.length > 1000) {
    throw new ErrorHttp(400, 'El texto es demasiado largo (máximo 1000 caracteres)');
  }

  const { data, error } = await supabase
    .from('lead_historial')
    .insert({ lead_id: leadId, texto, autor_id: user.id })
    .select('id, texto, created_at, autor:profiles(nombre)')
    .single();

  if (error) {
    // 42501 = la RLS no te dejó insertar (el lead no es tuyo)
    if (error.code === '42501') {
      throw new ErrorHttp(403, 'No tenés permiso para registrar actividad en este lead');
    }
    throw new ErrorHttp(400, error.message);
  }

  return data;
}

// Reclamar un vencido (CU06) o reactivar un archivado (CU10): el lead queda activo, a nombre de
// quien lo toma, y el conteo de días sin contacto vuelve a empezar. Las funciones de la base hacen
// todo junto (estado, asesor e historial) y frenan a un segundo asesor que llegue tarde.
async function tomarLead(supabase, funcion, leadId) {
  const { data, error } = await supabase.rpc(funcion, { p_lead_id: leadId });

  if (error) {
    if (error.code === '42501') throw new ErrorHttp(403, error.message);
    if (error.code === 'P0002') throw new ErrorHttp(404, 'Lead no encontrado');
    if (error.code === '23514') throw new ErrorHttp(409, error.message);
    throw new ErrorHttp(400, error.message);
  }

  return data;
}

const reclamar = (supabase, leadId) => tomarLead(supabase, 'reclamar_lead', leadId);

// CU14 / RF39: el líder asigna un lead sin asesor o lo pasa a otro miembro del equipo
async function reasignar(supabase, leadId, body) {
  const asesorId = body?.asesorId;
  if (typeof asesorId !== 'string' || !asesorId) {
    throw new ErrorHttp(400, 'Indicá a qué persona del equipo se asigna el lead');
  }

  const { data, error } = await supabase.rpc('reasignar_lead', { p_lead_id: leadId, p_asesor_id: asesorId });
  if (error) {
    if (error.code === '42501') throw new ErrorHttp(403, error.message);
    if (error.code === 'P0002') throw new ErrorHttp(404, 'Lead no encontrado');
    if (error.code === '23514') throw new ErrorHttp(409, error.message);
    throw new ErrorHttp(400, error.message);
  }
  return data;
}
const reactivar = (supabase, leadId) => tomarLead(supabase, 'reactivar_lead', leadId);

module.exports = { listar, totales, buscar, crear, actualizar, listarHistorial, agregarHistorial, reclamar, reactivar, reasignar };
