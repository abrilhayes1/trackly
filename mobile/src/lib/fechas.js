// Fechas en el formato de la app ("Jueves 15 de octubre"). Lo demás (fechaLocal, hhmm, etc.) sale
// de la misma lógica de la web: frontend/src/lib/agenda.js
const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export const fechaLarga = (d = new Date()) => `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`

// "2 oct 2026"
export const fechaCorta = (iso) => {
  const d = new Date(iso)
  return `${d.getDate()} ${CORTOS[d.getMonth()]} ${d.getFullYear()}`
}

// "Hoy · 17:00", "Mañana · 9:30" o "20 oct · 17:00"
export function cuando(iso, ahora = new Date()) {
  const d = new Date(iso)
  const h = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  const dia = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diferencia = Math.round((dia(d) - dia(ahora)) / 864e5)
  if (diferencia === 0) return `Hoy · ${h}`
  if (diferencia === 1) return `Mañana · ${h}`
  if (diferencia === -1) return `Ayer · ${h}`
  return `${d.getDate()} ${CORTOS[d.getMonth()]} · ${h}`
}
