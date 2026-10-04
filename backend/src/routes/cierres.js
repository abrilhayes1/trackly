const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { validarCierre, textoHistorial } = require('../lib/cierres');

// listado de cierres (para "Casos exitosos" y "Cerrados perdidos")
// la RLS hace que el asesor vea solo los suyos y el líder todos los del equipo
router.get('/', requireAuth, async (req, res) => {
  const { tipo } = req.query;

  let consulta = req.supabase
    .from('cierres')
    .select('*, lead:leads(*, asesor:profiles(nombre)), cerrador:profiles(nombre)')
    .order('updated_at', { ascending: false });

  if (tipo === 'ganado' || tipo === 'perdido') {
    consulta = consulta.eq('tipo', tipo);
  }

  const { data, error } = await consulta;

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.json(data);
});

// el cierre de un lead (null si todavía no tiene)
router.get('/:leadId', requireAuth, async (req, res) => {
  const { data, error } = await req.supabase
    .from('cierres')
    .select('*')
    .eq('lead_id', req.params.leadId)
    .maybeSingle();

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.json(data);
});

// cierra un lead, o modifica su cierre. La función cerrar_lead de la base guarda
// el cierre, cambia el estado y escribe el historial como una sola operación.
router.put('/:leadId', requireAuth, async (req, res) => {
  const { leadId } = req.params;

  const { error: errorValidacion, valores } = validarCierre(req.body ?? {});
  if (errorValidacion) {
    return res.status(400).json({ error: errorValidacion });
  }

  // para saber si es un cierre nuevo, una modificación o un cambio de ganado a perdido
  const { data: anterior, error: errorAnterior } = await req.supabase
    .from('cierres')
    .select('tipo')
    .eq('lead_id', leadId)
    .maybeSingle();

  if (errorAnterior) {
    return res.status(400).json({ error: errorAnterior.message });
  }

  const { data, error } = await req.supabase.rpc('cerrar_lead', {
    p_lead_id: leadId,
    p_tipo: valores.tipo,
    p_producto: valores.producto,
    p_modalidad: valores.modalidad,
    p_descuento: valores.descuento,
    p_importe: valores.importe,
    p_motivo: valores.motivo,
    p_historial: textoHistorial(anterior?.tipo ?? null, valores),
  });

  if (error) {
    if (error.code === '42501') {
      return res.status(403).json({ error: 'No tenés permiso para cerrar este lead' });
    }
    if (error.code === 'P0002') {
      return res.status(404).json({ error: 'Lead no encontrado' });
    }
    if (error.code === '23514') {
      return res.status(400).json({ error: 'Los datos del cierre no son válidos' });
    }
    return res.status(400).json({ error: error.message });
  }

  res.json(data);
});

module.exports = router;
