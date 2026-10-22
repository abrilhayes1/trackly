const MS_DIA = 1000 * 60 * 60 * 24
const DIAS_ESTA_SEMANA = 3

// Días entre dos momentos, igual que en la base (dias_transcurridos):
// - corridos: días completos de 24 horas
// - hábiles (si el equipo lo eligió): días de lunes a viernes que pasaron enteros, sin contar el día
//   de inicio ni hoy
export function contarDias(desde, ahora = new Date(), habiles = false) {
  const inicio = new Date(desde)
  if (!habiles) return Math.floor((ahora.getTime() - inicio.getTime()) / MS_DIA)
  const primero = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + 1)
  const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate())
  const total = Math.round((hoy - primero) / MS_DIA) // días en [primero, hoy)
  if (total <= 0) return 0
  const semanas = Math.floor(total / 7)
  let cuenta = semanas * 5
  for (let i = 0; i < total % 7; i++) {
    const dia = new Date(primero.getFullYear(), primero.getMonth(), primero.getDate() + semanas * 7 + i).getDay()
    if (dia !== 0 && dia !== 6) cuenta++
  }
  return cuenta
}

export function diasDesde(fecha, habiles = false) {
  return contarDias(fecha, new Date(), habiles)
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
  const habiles = !!config?.dias_habiles

  leads
    .filter((l) => l.asesor_id === userId && l.estado === 'activo')
    .forEach((lead) => {
      // si nunca lo contactaron, los días se cuentan desde que ingresó
      const dias = diasDesde(lead.ultimo_contacto || lead.fecha_ingreso, habiles)
      // corridos: para mostrar "hoy" aunque se cuenten días hábiles
      const item = { ...lead, dias, corridos: habiles ? diasDesde(lead.ultimo_contacto || lead.fecha_ingreso) : dias }

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

// Texto de los botones rápidos para programar el próximo contacto
export function etiquetaProximo(dias) {
  return { 1: 'Mañana', 7: 'En 1 semana', 14: 'En 2 semanas', 30: 'En 1 mes' }[dias] || `En ${dias} días`
}

// fecha del próximo contacto: tantos días después, a la hora elegida ("HH:MM") o a la misma hora
// de ahora en punto
export function fechaProximoContacto(dias, ahora = new Date(), hora = null) {
  const f = new Date(ahora)
  f.setDate(f.getDate() + dias)
  if (hora) {
    const [h, m] = hora.split(':').map(Number)
    f.setHours(h, m, 0, 0)
  } else {
    f.setMinutes(0, 0, 0)
  }
  return f.toISOString()
}
