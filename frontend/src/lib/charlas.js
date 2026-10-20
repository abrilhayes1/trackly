const dos = (n) => String(n).padStart(2, '0')

// "Charla informativa" -> "Charlas"; "Webinar" -> "Webinars"; "Consulta grupal" -> "Consultas"
// (para el menú y el título: la primera palabra, en plural)
export function nombreEventos(termino) {
  const primera = (termino || 'Charla').trim().split(/\s+/)[0]
  return /s$/i.test(primera) ? primera : primera + 's'
}

// "jueves 5 nov · 19:00"
export function fechaCharla(iso) {
  if (!iso) return 'Sin fecha'
  const d = new Date(iso)
  const dia = d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'short' })
  return `${dia} · ${dos(d.getHours())}:${dos(d.getMinutes())}`
}

// de la fecha guardada a los inputs de fecha y hora (en hora local)
export function aInputs(iso) {
  if (!iso) return { dia: '', hora: '19:00' }
  const d = new Date(iso)
  return { dia: `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`, hora: `${dos(d.getHours())}:${dos(d.getMinutes())}` }
}

// de los inputs a la fecha para guardar (la hora local del navegador)
export function desdeInputs(dia, hora) {
  return new Date(`${dia}T${hora}`).toISOString()
}
