// Alta de un equipo nuevo: crea el tenant, el perfil del líder y la configuración.
const { ErrorHttp } = require('../lib/errores');

async function completar(supabase, user, body) {
  const { equipoNombre, rubro, vencimientoHabilitado, diasVencimiento, diasAlertaPrevia } = body ?? {};

  if (!equipoNombre) {
    throw new ErrorHttp(400, 'El nombre del equipo es obligatorio');
  }

  // chequeamos que este usuario no tenga ya un perfil (no se puede onboardear dos veces)
  const { data: perfilExistente } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (perfilExistente) {
    throw new ErrorHttp(409, 'Este usuario ya tiene un equipo configurado');
  }

  // 1. crear el tenant
  const { data: tenant, error: errorTenant } = await supabase
    .from('tenants')
    .insert({ nombre: equipoNombre, plan: 'individual', created_by: user.id })
    .select()
    .single();

  if (errorTenant) {
    throw new ErrorHttp(400, 'Error creando el equipo: ' + errorTenant.message);
  }

  // 2. crear el perfil del líder
  const nombreUsuario = user.email.split('@')[0];
  const { error: errorPerfil } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      tenant_id: tenant.id,
      nombre: nombreUsuario,
      rol: 'lider'
    });

  if (errorPerfil) {
    throw new ErrorHttp(400, 'Error creando el perfil: ' + errorPerfil.message);
  }

  // 3. crear la config del tenant
  const { error: errorConfig } = await supabase
    .from('tenant_config')
    .insert({
      tenant_id: tenant.id,
      rubro: rubro || null,
      vencimiento_habilitado: vencimientoHabilitado || false,
      dias_vencimiento_lead: vencimientoHabilitado ? diasVencimiento : null,
      dias_alerta_previa: vencimientoHabilitado ? diasAlertaPrevia : null
    });

  if (errorConfig) {
    throw new ErrorHttp(400, 'Error creando la configuración: ' + errorConfig.message);
  }

  return { tenant, mensaje: 'Onboarding completado' };
}

module.exports = { completar };
