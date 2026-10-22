// Plantillas de mensajes: los datos entre llaves se completan con los del contacto y los tuyos.

export const VARIABLES = [
  { clave: 'nombre', etiqueta: 'Nombre del contacto', ejemplo: 'Lucía' },
  { clave: 'nombre_completo', etiqueta: 'Nombre completo', ejemplo: 'Lucía Gómez' },
  { clave: 'mi_nombre', etiqueta: 'Tu nombre', ejemplo: 'Abril' },
  { clave: 'equipo', etiqueta: 'Equipo', ejemplo: 'Escuela Sur' },
]

export const CANALES = [
  { valor: 'ambos', etiqueta: 'WhatsApp y email' },
  { valor: 'whatsapp', etiqueta: 'Solo WhatsApp' },
  { valor: 'email', etiqueta: 'Solo email' },
]

// el primer nombre: "Gómez, Lucía" → "Lucía"; "Lucía Gómez" → "Lucía"
export function primerNombre(nombre) {
  const texto = String(nombre || '').trim()
  const parte = texto.includes(',') ? texto.split(',')[1] : texto
  return (parte || texto).trim().split(/\s+/)[0] || ''
}

// "Gómez, Lucía" → "Lucía Gómez" (como se escribe en un saludo)
export function nombreParaSaludo(nombre) {
  const texto = String(nombre || '').trim()
  if (!texto.includes(',')) return texto
  const [apellido, nombres] = texto.split(',').map((p) => p.trim())
  return [nombres, apellido].filter(Boolean).join(' ')
}

export function valoresDe(lead, { miNombre = '', equipo = '' } = {}) {
  return {
    nombre: primerNombre(lead?.nombre),
    nombre_completo: nombreParaSaludo(lead?.nombre),
    mi_nombre: primerNombre(miNombre),
    equipo: equipo || '',
  }
}

// reemplaza {variable} por su valor; lo que no se conoce queda como está
export function completar(texto, valores) {
  return String(texto || '').replace(/\{(\w+)\}/g, (todo, clave) => (clave in valores ? valores[clave] : todo))
}

export const sirvePara = (plantilla, canal) => plantilla.canal === 'ambos' || plantilla.canal === canal

export function enlaceWhatsApp(numero, texto) {
  return `https://wa.me/${numero}${texto ? `?text=${encodeURIComponent(texto)}` : ''}`
}

export function enlaceGmail(email, { asunto = '', texto = '' } = {}) {
  const partes = [`to=${encodeURIComponent(email)}`]
  if (asunto) partes.push(`su=${encodeURIComponent(asunto)}`)
  if (texto) partes.push(`body=${encodeURIComponent(texto)}`)
  return `https://mail.google.com/mail/?view=cm&${partes.join('&')}`
}
