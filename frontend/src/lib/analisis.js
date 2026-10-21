import { apiFetch } from './api'

// Historial de leads para análisis (solo las columnas de Estadísticas, Reportes y Mi perfil).
// Si varias pantallas lo piden seguido, se reutiliza el mismo pedido durante un minuto, mientras no
// cambie nada (clave = usuario + contador de cambios de App).
const VIGENCIA_MS = 60 * 1000
let guardado = null

export function leadsParaAnalisis(clave) {
  const ahora = Date.now()
  if (guardado && guardado.clave === clave && ahora - guardado.en < VIGENCIA_MS) return guardado.promesa

  const promesa = apiFetch('/api/leads?campos=analisis')
  guardado = { clave, en: ahora, promesa }
  // si falla, no se guarda: el próximo pedido lo intenta de nuevo
  promesa.catch(() => {
    if (guardado?.promesa === promesa) guardado = null
  })
  return promesa
}
