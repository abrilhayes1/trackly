const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, async (req, res) => {
  const { data, error } = await req.supabase.from('leads').select('*');

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.json(data);
});

module.exports = router;

router.post('/', requireAuth, async (req, res) => {
  const { nombre, telefono, email, origen, consulta } = req.body;

  if (!nombre) {
    return res.status(400).json({ error: 'El nombre es obligatorio' });
  }

  const tenantId = req.user.user_metadata?.tenant_id || null;

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
  const camposPermitidos = ['interes', 'estado', 'ultimo_contacto', 'recordatorio', 'telefono', 'email', 'consulta'];

  const cambios = {};
  for (const campo of camposPermitidos) {
    if (req.body[campo] !== undefined) {
      cambios[campo] = req.body[campo];
    }
  }

  if (Object.keys(cambios).length === 0) {
    return res.status(400).json({ error: 'No mandaste ningún campo válido para actualizar' });
  }

  cambios.updated_at = new Date().toISOString();

  const { data, error } = await req.supabase
    .from('leads')
    .update(cambios)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  if (!data) {
    return res.status(404).json({ error: 'Lead no encontrado o no tenés permiso para editarlo' });
  }

  res.json(data);
});