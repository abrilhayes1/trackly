// Lógica de los cierres de leads (ganado / perdido).
const { ErrorHttp, lanzarSiError } = require('../lib/errores');

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

// cierra un lead, o modifica su cierre (CU07). La función registrar_cierre de la base valida los
// datos contra los campos de cierre del equipo (RF06), guarda el cierre, cambia el estado y
// escribe el historial como una sola operación.
async function cerrar(supabase, leadId, body) {
  const { tipo, datos, motivo } = body ?? {};

  if (tipo !== 'ganado' && tipo !== 'perdido') {
    throw new ErrorHttp(400, 'El tipo de cierre tiene que ser "ganado" o "perdido"');
  }
  if (datos !== undefined && (datos === null || typeof datos !== 'object' || Array.isArray(datos))) {
    throw new ErrorHttp(400, 'Los datos del cierre no tienen el formato correcto');
  }
  if (motivo !== undefined && motivo !== null && typeof motivo !== 'string') {
    throw new ErrorHttp(400, 'El motivo tiene que ser un texto');
  }

  const { data, error } = await supabase.rpc('registrar_cierre', {
    p_lead_id: leadId,
    p_tipo: tipo,
    p_datos: tipo === 'ganado' ? datos ?? {} : {},
    p_motivo: tipo === 'perdido' ? motivo ?? null : null,
  });

  if (error) {
    if (error.code === '42501') throw new ErrorHttp(403, 'No tenés permiso para cerrar este lead');
    if (error.code === 'P0002') throw new ErrorHttp(404, 'Lead no encontrado');
    if (error.code === '22023') throw new ErrorHttp(400, error.message);
    throw new ErrorHttp(400, error.message);
  }

  return data;
}

module.exports = { listar, obtener, cerrar };
