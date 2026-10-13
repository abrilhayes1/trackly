// Alta de un equipo nuevo (CU12): la función crear_equipo de la base crea el equipo, el perfil del
// líder, la configuración y las invitaciones en una sola operación.
const { armarConfig, limpiarEmails, lanzarErrorDeBase } = require('../lib/configEquipo');

async function completar(supabase, user, body) {
  const config = armarConfig(body);
  const invitados = limpiarEmails(body?.invitados);

  const { data: tenantId, error } = await supabase.rpc('crear_equipo', {
    p: { ...config, invitados, nombre_usuario: typeof body?.nombreUsuario === 'string' ? body.nombreUsuario : '' },
  });
  lanzarErrorDeBase(error);

  return { tenantId, invitados: invitados.length };
}

module.exports = { completar };
