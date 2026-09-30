const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

router.post('/', requireAuth, async (req, res) => {
    const { equipoNombre, rubro, vencimientoHabilitado, diasVencimiento, diasAlertaPrevia } = req.body;

    if (!equipoNombre) {
        return res.status(400).json({ error: 'El nombre del equipo es obligatorio' });
    }

    // chequeamos que este usuario no tenga ya un perfil (no se puede onboardear dos veces)
    const { data: perfilExistente } = await req.supabase
        .from('profiles')
        .select('id')
        .eq('id', req.user.id)
        .maybeSingle();

    if (perfilExistente) {
        return res.status(409).json({ error: 'Este usuario ya tiene un equipo configurado' });
    }

    // 1. crear el tenant
        // 1. crear el tenant
    const { data: tenant, error: errorTenant } = await req.supabase
        .from('tenants')
        .insert({ nombre: equipoNombre, plan: 'individual', created_by: req.user.id })
        .select()
        .single();

    if (errorTenant) {
        return res.status(400).json({ error: 'Error creando el equipo: ' + errorTenant.message });
    }

    // 2. crear el perfil del líder
    const nombreUsuario = req.user.email.split('@')[0];
    const { error: errorPerfil } = await req.supabase
        .from('profiles')
        .insert({
            id: req.user.id,
            tenant_id: tenant.id,
            nombre: nombreUsuario,
            rol: 'lider'
        });

    if (errorPerfil) {
        return res.status(400).json({ error: 'Error creando el perfil: ' + errorPerfil.message });
    }

    // 3. crear la config del tenant
    const { error: errorConfig } = await req.supabase
        .from('tenant_config')
        .insert({
            tenant_id: tenant.id,
            rubro: rubro || null,
            vencimiento_habilitado: vencimientoHabilitado || false,
            dias_vencimiento_lead: vencimientoHabilitado ? diasVencimiento : null,
            dias_alerta_previa: vencimientoHabilitado ? diasAlertaPrevia : null
        });

    if (errorConfig) {
        return res.status(400).json({ error: 'Error creando la configuración: ' + errorConfig.message });
    }

    res.status(201).json({ tenant, mensaje: 'Onboarding completado' });
});

module.exports = router;