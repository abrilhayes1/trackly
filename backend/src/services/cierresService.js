// Lógica de los cierres de leads (ganado / perdido).
const { ErrorHttp, lanzarSiError } = require('../lib/errores');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_POR_PAGINA = 100;

// Listado de cierres. La RLS hace que el asesor vea solo los suyos y el líder todos los del equipo.
// - ?campos=analisis: todos, solo lead_id, tipo y datos (lo que usan los Reportes).
// - ?limite=30&desde=0 (y ?asesor=<id> para el líder): una página para "Casos exitosos" y
//   "Cerrados perdidos", del más nuevo al más viejo; devuelve { cierres, hayMas }.
// - sin nada: todos con el lead (como antes).
async function listar(supabase, { tipo, campos, limite, desde, asesor } = {}) {
  const filtrarTipo = (consulta) => (tipo === 'ganado' || tipo === 'perdido' ? consulta.eq('tipo', tipo) : consulta);

  if (campos === 'analisis') {
    const { data, error } = await filtrarTipo(supabase.from('cierres').select('lead_id, tipo, datos'));
    lanzarSiError(error);
    return data;
  }

  if (asesor !== undefined && !UUID.test(String(asesor))) {
    throw new ErrorHttp(400, 'El asesor no es válido');
  }
  const paginado = limite !== undefined;
  const cantidad = Number(limite);
  const inicio = Number(desde ?? 0);
  if (paginado && (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > MAX_POR_PAGINA || !Number.isInteger(inicio) || inicio < 0)) {
    throw new ErrorHttp(400, `"limite" va de 1 a ${MAX_POR_PAGINA} y "desde" tiene que ser 0 o más`);
  }

  // con filtro por asesor, el lead tiene que existir y ser de ese asesor (!inner)
  const lead = asesor ? 'lead:leads!inner(*, asesor:profiles(nombre))' : 'lead:leads(*, asesor:profiles(nombre))';
  let consulta = filtrarTipo(
    supabase
      .from('cierres')
      .select(`*, ${lead}, cerrador:profiles(nombre)`)
      .order('updated_at', { ascending: false })
      .order('id', { ascending: true }),
  );
  if (asesor) consulta = consulta.eq('lead.asesor_id', asesor);
  // se pide uno de más para saber si hay otra página
  if (paginado) consulta = consulta.range(inicio, inicio + cantidad);

  const { data, error } = await consulta;
  lanzarSiError(error);
  return paginado ? { cierres: data.slice(0, cantidad), hayMas: data.length > cantidad } : data;
}

// el cierre de un lead (null si todavía no tiene)
async function obtener(supabase, leadId) {
  const { data, error } = await supabase.from('cierres').select('*').eq('lead_id', leadId).maybeSingle();

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
    p_datos: tipo === 'ganado' ? (datos ?? {}) : {},
    p_motivo: tipo === 'perdido' ? (motivo ?? null) : null,
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
