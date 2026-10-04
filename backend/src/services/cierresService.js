// Lógica de los cierres de leads (ganado / perdido).
const { ErrorHttp, lanzarSiError } = require('../lib/errores');
const { validarCierre, textoHistorial } = require('../lib/cierres');

// listado de cierres (para "Casos exitosos" y "Cerrados perdidos")
// la RLS hace que el asesor vea solo los suyos y el líder todos los del equipo
async function listar(supabase, tipo) {
  let consulta = supabase
    .from('cierres')
    .select('*, lead:leads(*, asesor:profiles(nombre)), cerrador:profiles(nombre)')
    .order('updated_at', { ascending: false });

  if (tipo === 'ganado' || tipo === 'perdido') {
    consulta = consulta.eq('tipo', tipo);
  }

  const { data, error } = await consulta;
  lanzarSiError(error);
  return data;
}

// el cierre de un lead (null si todavía no tiene)
async function obtener(supabase, leadId) {
  const { data, error } = await supabase
    .from('cierres')
    .select('*')
    .eq('lead_id', leadId)
    .maybeSingle();

  lanzarSiError(error);
  return data;
}

// cierra un lead, o modifica su cierre. La función cerrar_lead de la base guarda
// el cierre, cambia el estado y escribe el historial como una sola operación.
async function cerrar(supabase, leadId, body) {
  const { error: errorValidacion, valores } = validarCierre(body ?? {});
  if (errorValidacion) {
    throw new ErrorHttp(400, errorValidacion);
  }

  // para saber si es un cierre nuevo, una modificación o un cambio de ganado a perdido
  const { data: anterior, error: errorAnterior } = await supabase
    .from('cierres')
    .select('tipo')
    .eq('lead_id', leadId)
    .maybeSingle();

  lanzarSiError(errorAnterior);

  const { data, error } = await supabase.rpc('cerrar_lead', {
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
    if (error.code === '42501') throw new ErrorHttp(403, 'No tenés permiso para cerrar este lead');
    if (error.code === 'P0002') throw new ErrorHttp(404, 'Lead no encontrado');
    if (error.code === '23514') throw new ErrorHttp(400, 'Los datos del cierre no son válidos');
    throw new ErrorHttp(400, error.message);
  }

  return data;
}

module.exports = { listar, obtener, cerrar };
