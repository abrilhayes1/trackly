export function iniciales(nombre) {
  return (nombre || '')
    .split(/[\s,]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('')
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

// "5 oct 2026 · 14:30", igual que en el prototipo y en cualquier navegador
export function fechaHoraCorta(iso) {
  const d = new Date(iso)
  const dos = (n) => String(n).padStart(2, '0')
  return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()} · ${dos(d.getHours())}:${dos(d.getMinutes())}`
}

// ISO -> valor para <input type="datetime-local"> en hora local
export function aInputDateTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const dos = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}T${dos(d.getHours())}:${dos(d.getMinutes())}`
}

// valor de <input type="datetime-local"> (hora local) -> ISO
export function desdeInputDateTime(valor) {
  return valor ? new Date(valor).toISOString() : null
}

// wa.me necesita el número con código de país. Asume celular argentino (549 + número).
export function numeroWhatsApp(telefono) {
  let digitos = (telefono || '').replace(/\D/g, '')
  if (!digitos) return null
  if (digitos.startsWith('54')) return digitos
  digitos = digitos.replace(/^0+/, '')
  return `549${digitos}`
}