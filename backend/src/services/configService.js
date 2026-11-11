// Configuración del equipo (la RLS devuelve solo la del equipo del usuario).
const { ErrorHttp, lanzarSiError } = require('../lib/errores');
const { armarConfig, limpiarEmails, lanzarErrorDeBase } = require('../lib/configEquipo');

async function obtener(supabase) {
  const { data, error } = await supabase.from('tenant_config').select('*').maybeSingle();

  lanzarSiError(error);
  return data;
}

// Solo el líder (lo valida la función de la base)
async function guardar(supabase, body) {
  const { data, error } = await supabase.rpc('guardar_config_equipo', { p: armarConfig(body) });
  lanzarErrorDeBase(error);
  return data;
}

// Miembros del equipo (activos, desactivados e históricos), invitaciones pendientes y licencias
async function equipo(supabase) {
  const [miembros, invitaciones, equipoActual] = await Promise.all([
    // con '*' sigue andando aunque todavía no se haya corrido 14_perfil.sql (avatar_url)
    supabase.from('profiles').select('*').order('nombre'),
    supabase.from('invitaciones').select('id, email, rol, created_at').is('aceptada_at', null).order('created_at', { ascending: false }),
    // la regla de la base solo deja ver el equipo propio; con '*' anda antes de 19_licencias.sql
    supabase.from('tenants').select('*').limit(1),
  ]);

  lanzarSiError(miembros.error);
  lanzarSiError(invitaciones.error);
  lanzarSiError(equipoActual.error);
  return {
    miembros: miembros.data,
    invitaciones: invitaciones.data,
    licencias: equipoActual.data?.[0]?.licencias ?? null,
  };
}

// El líder desactiva, reactiva o cambia el rol de un miembro (lo valida la función de la base)
async function desactivarMiembro(supabase, id) {
  const { data, error } = await supabase.rpc('desactivar_miembro', { p_id: id });
  lanzarErrorDeBase(error);
  return { leads: data };
}

async function reactivarMiembro(supabase, id) {
  const { error } = await supabase.rpc('reactivar_miembro', { p_id: id });
  lanzarErrorDeBase(error);
  return { ok: true };
}

async function cambiarRol(supabase, id, body) {
  const rol = body?.rol;
  if (rol !== 'asesor' && rol !== 'lider') throw new ErrorHttp(400, 'Rol inválido');
  const { error } = await supabase.rpc('cambiar_rol_miembro', { p_id: id, p_rol: rol });
  lanzarErrorDeBase(error);
  return { ok: true };
}

async function invitar(supabase, body) {
  const emails = limpiarEmails(body?.emails);
  if (emails.length === 0) return { agregadas: 0 };

  const { data, error } = await supabase.rpc('invitar_miembros', { p_emails: emails });
  lanzarErrorDeBase(error);
  return { agregadas: data };
}

async function borrarInvitacion(supabase, id) {
  const { error } = await supabase.from('invitaciones').delete().eq('id', id);
  lanzarSiError(error);
  return { ok: true };
}

module.exports = { obtener, guardar, equipo, invitar, borrarInvitacion, desactivarMiembro, reactivarMiembro, cambiarRol };
