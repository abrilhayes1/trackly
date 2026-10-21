// Reportes personalizados (RF45). La RLS decide qué ve cada uno (los suyos y los compartidos)
// y quién puede compartir (solo el líder).
const { ErrorHttp, lanzarSiError } = require('../lib/errores');
const { validarDefinicion } = require('../lib/reportes');

function datos(body) {
  const nombre = typeof body?.nombre === 'string' ? body.nombre.trim() : '';
  if (!nombre) throw new ErrorHttp(400, 'Ponele un nombre al reporte');
  if (nombre.length > 80) throw new ErrorHttp(400, 'El nombre es demasiado largo (hasta 80 letras)');
  return { nombre, definicion: validarDefinicion(body?.definicion), compartido: body?.compartido === true };
}

function errorPermiso(error) {
  if (error?.code === '42501') throw new ErrorHttp(403, 'Solo el líder puede compartir reportes con el equipo');
  lanzarSiError(error);
}

async function listar(supabase) {
  const { data, error } = await supabase.from('reportes').select('*, autor:profiles(nombre)').order('created_at', { ascending: true });
  lanzarSiError(error);
  return data;
}

async function crear(supabase, user, body) {
  const { data: perfil, error: errorPerfil } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single();
  lanzarSiError(errorPerfil);
  const { data, error } = await supabase
    .from('reportes')
    .insert({ ...datos(body), tenant_id: perfil.tenant_id, creado_por: user.id })
    .select('*, autor:profiles(nombre)')
    .single();
  errorPermiso(error);
  return data;
}

async function editar(supabase, id, body) {
  const { data, error } = await supabase
    .from('reportes')
    .update({ ...datos(body), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*, autor:profiles(nombre)')
    .maybeSingle();
  errorPermiso(error);
  if (!data) throw new ErrorHttp(403, 'No podés modificar este reporte');
  return data;
}

async function borrar(supabase, id) {
  const { data, error } = await supabase.from('reportes').delete().eq('id', id).select('id');
  lanzarSiError(error);
  if (!data.length) throw new ErrorHttp(403, 'No podés borrar este reporte');
  return { ok: true };
}

module.exports = { listar, crear, editar, borrar };
