// Configuración del equipo (la RLS devuelve solo la del equipo del usuario).
const { lanzarSiError } = require('../lib/errores');

async function obtener(supabase) {
  const { data, error } = await supabase
    .from('tenant_config')
    .select('*')
    .maybeSingle();

  lanzarSiError(error);
  return data;
}

module.exports = { obtener };
