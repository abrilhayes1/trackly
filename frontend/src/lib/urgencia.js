const MS_DIA = 1000 * 60 * 60 * 24
const DIAS_ESTA_SEMANA = 3

export function diasDesde(fecha) {
  return Math.floor((Date.now() - new Date(fecha).getTime()) / MS_DIA)
}

// tiene un próximo contacto programado: un recordatorio posterior al último contacto
export function tieneProximoPaso(lead) {
  if (!lead.recordatorio) return false
  return !lead.ultimo_contacto || new Date(lead.recordatorio) > new Date(lead.ultimo_contacto)
}

// Grupos de Mis leads, en orden de prioridad:
// - por vencer: llegó al aviso previo del plazo (le gana a todo lo demás)
// - sin contactar: nunca se registró un contacto
// - sin próximo paso: ya se lo contactó pero no tiene un recordatorio pendiente
// - esta semana / al día: contactado y con próximo contacto programado (según hace cuánto)
export function agruparLeads(leads, config, userId) {
  const grupos = { porVencer: [], sinContactar: [], sinProximoPaso: [], estaSemana: [], alDia: [] }

  const vencimientoActivo = config?.vencimiento_habilitado && config?.dias_vencimiento_lead
  const umbralPorVencer = vencimientoActivo ? config.dias_vencimiento_lead - (config.dias_alerta_previa || 0) : null

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
      } else if (!tieneProximoPaso(lead)) {
        grupos.sinProximoPaso.push(item)
      } else if (dias >= DIAS_ESTA_SEMANA) {
        grupos.estaSemana.push(item)
      } else {
        grupos.alDia.push(item)
      }
    })

  Object.values(grupos).forEach((g) => g.sort((a, b) => b.dias - a.dias))
  return grupos
}

// Opciones rápidas para programar el próximo contacto: el mismo horario de ahora (en punto),
// tantos días después
export const PROXIMOS_CONTACTOS = [
  { etiqueta: 'Mañana', dias: 1 },
  { etiqueta: 'En 3 días', dias: 3 },
  { etiqueta: 'En 1 semana', dias: 7 },
]

export function fechaProximoContacto(dias, ahora = new Date()) {
  const f = new Date(ahora)
  f.setDate(f.getDate() + dias)
  f.setMinutes(0, 0, 0)
  return f.toISOString()
}
