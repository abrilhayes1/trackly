// Preferencias de cada persona que se guardan en este navegador (como el modo oscuro).
const CLAVE_POR_SECCION = 'trackly-por-seccion'
const EVENTO = 'trackly-preferencias'

// cuántos contactos se muestran por sección en Mis leads antes de "Ver todos" (0 = todos)
export const OPCIONES_POR_SECCION = [5, 7, 10, 15, 0]
export const POR_SECCION_INICIAL = 7

export function porSeccion() {
  try {
    const n = Number(localStorage.getItem(CLAVE_POR_SECCION))
    return OPCIONES_POR_SECCION.includes(n) && localStorage.getItem(CLAVE_POR_SECCION) !== null ? n : POR_SECCION_INICIAL
  } catch {
    return POR_SECCION_INICIAL
  }
}

export function guardarPorSeccion(n) {
  try {
    localStorage.setItem(CLAVE_POR_SECCION, String(n))
  } catch {
    // sin almacenamiento, vale solo mientras la pestaña esté abierta
  }
  window.dispatchEvent(new Event(EVENTO))
}

export function alCambiarPreferencias(fn) {
  window.addEventListener(EVENTO, fn)
  return () => window.removeEventListener(EVENTO, fn)
}
