// Perfil del usuario logueado, con el nombre de su equipo.
const { lanzarSiError } = require('../lib/errores');

async function buscarPerfil(supabase, user) {
  const { data, error } = await supabase
    .from('profiles')
    .select('nombre, rol, avatar_iniciales, tenants(nombre)')
    .eq('id', user.id)
    .maybeSingle();

  lanzarSiError(error);
  return data;
}

// Devuelve null si el usuario todavía no tiene equipo (tiene que hacer el onboarding).
// Si no tiene equipo pero alguien lo invitó, lo suma a ese equipo antes de responder.
async function perfil(supabase, user) {
  const encontrado = await buscarPerfil(supabase, user);
  if (encontrado) return encontrado;

  const { data: unido, error } = await supabase.rpc('aceptar_invitacion');
  lanzarSiError(error);
  return unido ? buscarPerfil(supabase, user) : null;
}

module.exports = { perfil };
