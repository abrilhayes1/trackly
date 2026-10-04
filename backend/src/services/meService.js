// Perfil del usuario logueado, con el nombre de su equipo.
const { lanzarSiError } = require('../lib/errores');

// devuelve null si el usuario todavía no completó el onboarding
async function perfil(supabase, user) {
  const { data, error } = await supabase
    .from('profiles')
    .select('nombre, rol, avatar_iniciales, tenants(nombre)')
    .eq('id', user.id)
    .maybeSingle();

  lanzarSiError(error);
  return data;
}

module.exports = { perfil };
