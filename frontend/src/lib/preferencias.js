// Preferencias de cada persona que se guardan en este navegador (como el modo oscuro).
const EVENTO = 'trackly-preferencias'

function leer(clave, defecto, valido) {
  try {
    const crudo = localStorage.getItem(clave)
    if (crudo === null) return defecto
    const valor = JSON.parse(crudo)
    return valido(valor) ? valor : defecto
  } catch {
    return defecto
  }
}

function guardar(clave, valor) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor))
  } catch {
    // sin almacenamiento, vale solo mientras la pestaña esté abierta
  }
  window.dispatchEvent(new Event(EVENTO))
}

export function alCambiarPreferencias(fn) {
  window.addEventListener(EVENTO, fn)
  return () => window.removeEventListener(EVENTO, fn)
}

// cuántos contactos se muestran por sección en Mis leads antes de "Ver todos" (0 = todos)
export const OPCIONES_POR_SECCION = [5, 7, 10, 15, 0]
export const POR_SECCION_INICIAL = 7
export const porSeccion = () => leer('trackly-por-seccion', POR_SECCION_INICIAL, (n) => OPCIONES_POR_SECCION.includes(n))
export const guardarPorSeccion = (n) => guardar('trackly-por-seccion', n)

// botones rápidos para programar el próximo contacto (en días, de 1 a 4 botones)
export const OPCIONES_PROXIMOS = [1, 2, 3, 5, 7, 10, 14, 30]
export const PROXIMOS_INICIALES = [1, 3, 7]
export const proximosDias = () =>
  leer(
    'trackly-proximos-dias',
    PROXIMOS_INICIALES,
    (v) => Array.isArray(v) && v.length >= 1 && v.length <= 4 && v.every((n) => OPCIONES_PROXIMOS.includes(n)),
  )
export const guardarProximosDias = (lista) =>
  guardar(
    'trackly-proximos-dias',
    [...lista].sort((a, b) => a - b),
  )

// a qué hora quedan los recordatorios programados con esos botones: null = la misma hora de ahora
export const horaRecordatorios = () => leer('trackly-hora-recordatorios', null, (v) => v === null || /^([01]\d|2[0-3]):[0-5]\d$/.test(v))
export const guardarHoraRecordatorios = (hora) => guardar('trackly-hora-recordatorios', hora)

// pantalla con la que abre la app
export const PANTALLAS_INICIO = [
  { valor: 'leads', etiqueta: 'Mis leads' },
  { valor: 'alertas', etiqueta: 'Alertas de hoy' },
  { valor: 'agenda', etiqueta: 'Agenda' },
]
export const pantallaInicial = () => leer('trackly-pantalla-inicial', 'leads', (v) => PANTALLAS_INICIO.some((p) => p.valor === v))
export const guardarPantallaInicial = (v) => guardar('trackly-pantalla-inicial', v)

// Agenda: no mostrar sábados ni domingos en las vistas Días y Semana (salvo que tengan recordatorios)
export const agendaSinFinde = () => leer('trackly-agenda-sin-finde', false, (v) => typeof v === 'boolean')
export const guardarAgendaSinFinde = (v) => guardar('trackly-agenda-sin-finde', v)
