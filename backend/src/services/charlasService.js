// Charlas / eventos (RF29 a RF34). Las funciones de la base validan permisos y datos
// (solo el líder crea, edita y elimina; el asesor invita y marca asistencia de sus leads).
const { ErrorHttp, lanzarSiError } = require('../lib/errores');

function lanzarErrorDeBase(error) {
  if (!error) return;
  if (error.code === '42501') throw new ErrorHttp(403, error.message);
  if (error.code === 'P0002') throw new ErrorHttp(404, error.message);
  if (error.code === '23505') throw new ErrorHttp(409, error.message);
  throw new ErrorHttp(400, error.message);
}

// todas las charlas del equipo, con cuántos invitados y cuántos asistieron
async function listar(supabase) {
  const { data, error } = await supabase.from('charlas').select('*, charla_notificados(asistio)').order('fecha', { ascending: true });
  lanzarSiError(error);

  return data.map(({ charla_notificados: invitados, ...charla }) => ({
    ...charla,
    invitados: invitados.length,
    asistieron: invitados.filter((i) => i.asistio === true).length,
  }));
}

// cuántas charlas no pasaron todavía (contador del menú), contadas en la base sin traer filas.
// Con 3 horas de margen, como en la pantalla: una charla que está ocurriendo sigue contando.
async function contarProximas(supabase) {
  const desde = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
  const { count, error } = await supabase.from('charlas').select('id', { count: 'exact', head: true }).gte('fecha', desde);
  lanzarSiError(error);
  return { proximas: count ?? 0 };
}

// una charla con sus invitados: nivel de interés, asesor del lead y quién lo invitó (RF32)
async function obtener(supabase, id) {
  const { data, error } = await supabase
    .from('charlas')
    .select(
      '*, invitados:charla_notificados(id, asistio, notificado_at, notificado_por, invitador:profiles(nombre), lead:leads(id, nombre, interes, estado, asesor_id, telefono, email, origen, consulta, fecha_ingreso, ultimo_contacto, asesor:profiles(nombre)))',
    )
    .eq('id', id)
    .maybeSingle();
  lanzarSiError(error);
  if (!data) throw new ErrorHttp(404, 'Charla no encontrada');
  return data;
}

function datosCharla(body) {
  const { nombre, fecha, categoria, link } = body ?? {};
  if (typeof nombre !== 'string' || !nombre.trim()) throw new ErrorHttp(400, 'Ingresá el nombre de la charla');
  if (typeof fecha !== 'string' || Number.isNaN(new Date(fecha).getTime())) {
    throw new ErrorHttp(400, 'Indicá una fecha y hora válidas');
  }
  return {
    p_nombre: nombre,
    p_fecha: fecha,
    p_categoria: typeof categoria === 'string' ? categoria : null,
    p_link: typeof link === 'string' ? link : null,
  };
}

async function guardar(supabase, id, body) {
  const { data, error } = await supabase.rpc('guardar_charla', { p_id: id ?? null, ...datosCharla(body) });
  lanzarErrorDeBase(error);
  return data;
}

async function eliminar(supabase, id) {
  const { error } = await supabase.rpc('eliminar_charla', { p_id: id });
  lanzarErrorDeBase(error);
  return { ok: true };
}

async function invitar(supabase, charlaId, body) {
  if (typeof body?.leadId !== 'string' || !body.leadId) throw new ErrorHttp(400, 'Indicá a quién invitar');
  const { data, error } = await supabase.rpc('invitar_a_charla', { p_charla_id: charlaId, p_lead_id: body.leadId });
  lanzarErrorDeBase(error);
  return data;
}

async function marcarAsistencia(supabase, invitacionId, body) {
  const asistio = body?.asistio;
  if (asistio !== true && asistio !== false && asistio !== null) {
    throw new ErrorHttp(400, 'La asistencia tiene que ser true, false o null');
  }
  const { data, error } = await supabase.rpc('marcar_asistencia', { p_invitacion_id: invitacionId, p_asistio: asistio });
  lanzarErrorDeBase(error);
  return data;
}

// las charlas a las que fue invitado un lead (para su tarjeta)
async function delLead(supabase, leadId) {
  const { data, error } = await supabase
    .from('charla_notificados')
    .select('id, asistio, charla:charlas(id, nombre, fecha, carrera)')
    .eq('lead_id', leadId);
  lanzarSiError(error);
  return data.filter((i) => i.charla).sort((a, b) => new Date(a.charla.fecha) - new Date(b.charla.fecha));
}

module.exports = { listar, contarProximas, obtener, guardar, eliminar, invitar, marcarAsistencia, delLead };
