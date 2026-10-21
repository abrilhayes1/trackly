// Configuración del equipo (la RLS devuelve solo la del equipo del usuario).
const { lanzarSiError } = require('../lib/errores');
const { armarConfig, limpiarEmails, lanzarErrorDeBase } = require('../lib/configEquipo');

async function obtener(supabase) {
  const { data, error } = await supabase
    .from('tenant_config')
    .select('*')
    .maybeSingle();

  lanzarSiError(error);
  return data;
}

// Solo el líder (lo valida la función de la base)
async function guardar(supabase, body) {
  const { data, error } = await supabase.rpc('guardar_config_equipo', { p: armarConfig(body) });
  lanzarErrorDeBase(error);
  return data;
}

// Miembros del equipo e invitaciones pendientes (las invitaciones solo las ve el líder)
async function equipo(supabase) {
  const [miembros, invitaciones] = await Promise.all([
    // con '*' sigue andando aunque todavía no se haya corrido 14_perfil.sql (avatar_url)
    supabase.from('profiles').select('*').order('nombre'),
    supabase
      .from('invitaciones')
      .select('id, email, rol, created_at')
      .is('aceptada_at', null)
      .order('created_at', { ascending: false }),
  ]);

  lanzarSiError(miembros.error);
  lanzarSiError(invitaciones.error);
  return { miembros: miembros.data, invitaciones: invitaciones.data };
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

module.exports = { obtener, guardar, equipo, invitar, borrarInvitacion };
