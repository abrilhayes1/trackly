// Lógica de la agenda (recordatorios manuales).
const { ErrorHttp, lanzarSiError } = require('../lib/errores');
const { fechaValida, validarRecordatorio, ordenarRecordatorios } = require('../lib/recordatorios');

// Agenda del usuario: los recordatorios desde el día que manda el navegador (?fecha=2026-10-05)
// hasta ?hasta= (opcional, para ver los próximos días), más los de días anteriores que todavía no
// se marcaron como hechos. La "fecha de hoy" la manda el navegador porque el servidor trabaja en UTC.
async function listar(supabase, user, fecha, hasta) {
  if (!fechaValida(fecha)) {
    throw new ErrorHttp(400, 'Falta la fecha (formato AAAA-MM-DD)');
  }
  if (hasta !== undefined && (!fechaValida(hasta) || hasta < fecha)) {
    throw new ErrorHttp(400, 'La fecha "hasta" no es válida');
  }

  const propios = () =>
    supabase.from('recordatorios').select('*').eq('asesor_id', user.id);

  const [delPeriodo, atrasados] = await Promise.all([
    propios().gte('fecha', fecha).lte('fecha', hasta ?? fecha),
    propios().lt('fecha', fecha).eq('hecho', false),
  ]);

  lanzarSiError(delPeriodo.error || atrasados.error);

  return [...atrasados.data, ...delPeriodo.data].sort(ordenarRecordatorios);
}

async function crear(supabase, user, body) {
  const { error: errorValidacion, valores } = validarRecordatorio(body ?? {});
  if (errorValidacion) {
    throw new ErrorHttp(400, errorValidacion);
  }

  // el equipo y el dueño salen del usuario logueado, nunca de lo que mande el navegador
  const { data: perfil, error: errorPerfil } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single();

  if (errorPerfil || !perfil) {
    throw new ErrorHttp(400, 'No se encontró el perfil del usuario');
  }

  const { data, error } = await supabase
    .from('recordatorios')
    .insert({ ...valores, tenant_id: perfil.tenant_id, asesor_id: user.id })
    .select()
    .single();

  lanzarSiError(error);
  return data;
}

// marcar como hecho (o volver a pendiente)
async function marcar(supabase, user, id, body) {
  const { hecho } = body ?? {};

  if (typeof hecho !== 'boolean') {
    throw new ErrorHttp(400, '"hecho" tiene que ser true o false');
  }

  const { data, error } = await supabase
    .from('recordatorios')
    .update({ hecho })
    .eq('id', id)
    .eq('asesor_id', user.id)
    .select()
    .maybeSingle();

  lanzarSiError(error);

  if (!data) {
    throw new ErrorHttp(404, 'Recordatorio no encontrado');
  }

  return data;
}

// editar día, hora, contacto y nota (y opcionalmente si está hecho); si solo viene "hecho", es marcar
async function actualizar(supabase, user, id, body) {
  const datos = body ?? {};
  if (Object.keys(datos).every((k) => k === 'hecho')) {
    return marcar(supabase, user, id, datos);
  }

  const { error: errorValidacion, valores } = validarRecordatorio(datos);
  if (errorValidacion) {
    throw new ErrorHttp(400, errorValidacion);
  }
  if (datos.hecho !== undefined && typeof datos.hecho !== 'boolean') {
    throw new ErrorHttp(400, '"hecho" tiene que ser true o false');
  }

  const { data, error } = await supabase
    .from('recordatorios')
    .update({ ...valores, ...(datos.hecho !== undefined && { hecho: datos.hecho }) })
    .eq('id', id)
    .eq('asesor_id', user.id)
    .select()
    .maybeSingle();

  lanzarSiError(error);

  if (!data) {
    throw new ErrorHttp(404, 'Recordatorio no encontrado');
  }

  return data;
}

module.exports = { listar, crear, marcar, actualizar };
