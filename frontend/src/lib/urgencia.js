const MS_DIA = 1000 * 60 * 60 * 24
const DIAS_ESTA_SEMANA = 3

export function diasDesde(fecha) {
    return Math.floor((Date.now() - new Date(fecha).getTime()) / MS_DIA)
}

export function agruparLeads(leads, config, userId) {
    const grupos = { porVencer: [], estaSemana: [], sinContactar: [], alDia: [] }

    const vencimientoActivo =
        config?.vencimiento_habilitado && config?.dias_vencimiento_lead
    const umbralPorVencer = vencimientoActivo
        ? config.dias_vencimiento_lead - (config.dias_alerta_previa || 0)
        : null

    leads
        .filter((l) => l.asesor_id === userId && l.estado === 'activo')
        .forEach((lead) => {
            // si nunca lo contactaron, los días se cuentan desde que ingresó
            const dias = diasDesde(lead.ultimo_contacto || lead.fecha_ingreso)
            const item = { ...lead, dias }

            if (umbralPorVencer !== null && dias >= umbralPorVencer) {
                grupos.porVencer.push(item)
            } else if (!lead.ultimo_contacto) {
                grupos.sinContactar.push(item)
            } else if (dias >= DIAS_ESTA_SEMANA) {
                grupos.estaSemana.push(item)
            } else {
                grupos.alDia.push(item)
            }
        })

    Object.values(grupos).forEach((g) => g.sort((a, b) => b.dias - a.dias))
    return grupos
}