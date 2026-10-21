// Modo claro / oscuro. Se guarda en el navegador; si nunca se eligió, sigue al sistema.
// index.html lo aplica antes de que cargue la app para que no haya un destello blanco.
const CLAVE = 'trackly-tema'

export function temaActual() {
  return document.documentElement.dataset.tema === 'oscuro' ? 'oscuro' : 'claro'
}

export function aplicarTema(tema) {
  document.documentElement.dataset.tema = tema
  try {
    localStorage.setItem(CLAVE, tema)
  } catch {
    // sin almacenamiento, el modo dura hasta que se cierre la pestaña
  }
}
