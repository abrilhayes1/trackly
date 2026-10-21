// Modo claro / oscuro. La preferencia ('claro', 'oscuro' o 'sistema') se guarda en el navegador;
// con 'sistema' (o si nunca se eligió) sigue al sistema operativo. index.html lo aplica antes de
// que cargue la app para que no haya un destello blanco.
const CLAVE = 'trackly-tema'
const EVENTO = 'trackly-tema'

const consultaOscuro = () => window.matchMedia?.('(prefers-color-scheme: dark)')

export function preferenciaTema() {
  try {
    const guardado = localStorage.getItem(CLAVE)
    return guardado === 'claro' || guardado === 'oscuro' ? guardado : 'sistema'
  } catch {
    return 'sistema'
  }
}

export function temaActual() {
  return document.documentElement.dataset.tema === 'oscuro' ? 'oscuro' : 'claro'
}

export function aplicarTema(preferencia) {
  document.documentElement.dataset.tema = preferencia === 'sistema' ? (consultaOscuro()?.matches ? 'oscuro' : 'claro') : preferencia
  try {
    if (preferencia === 'sistema') localStorage.removeItem(CLAVE)
    else localStorage.setItem(CLAVE, preferencia)
  } catch {
    // sin almacenamiento, el modo dura hasta que se cierre la pestaña
  }
  window.dispatchEvent(new Event(EVENTO))
}

// avisa cuando cambia el modo (desde otra parte de la app o, con 'sistema', desde el sistema)
export function alCambiarTema(fn) {
  const delSistema = () => {
    if (preferenciaTema() === 'sistema') aplicarTema('sistema')
  }
  window.addEventListener(EVENTO, fn)
  consultaOscuro()?.addEventListener?.('change', delSistema)
  return () => {
    window.removeEventListener(EVENTO, fn)
    consultaOscuro()?.removeEventListener?.('change', delSistema)
  }
}
