// Cierre de sesión por inactividad (RNF01): si pasan HORAS_INACTIVIDAD sin usar la app, hay que
// volver a ingresar. La última actividad se guarda en el navegador, así cuenta para todas las
// pestañas y también cuando se cierra el navegador y se vuelve a abrir al otro día.
// (Supabase deja la sesión abierta sin límite; el límite por tiempo de Supabase es de los planes pagos.)
const CLAVE = 'trackly-ultima-actividad'
export const HORAS_INACTIVIDAD = 8
const LIMITE_MS = HORAS_INACTIVIDAD * 60 * 60 * 1000
const CADA_CUANTO_GUARDAR_MS = 60 * 1000

function leer() {
  try {
    return Number(localStorage.getItem(CLAVE)) || 0
  } catch {
    return 0
  }
}

export function marcarActividad() {
  try {
    localStorage.setItem(CLAVE, String(Date.now()))
  } catch {
    // sin almacenamiento no se puede medir la inactividad entre visitas
  }
}

export function olvidarActividad() {
  try {
    localStorage.removeItem(CLAVE)
  } catch {
    // nada que borrar
  }
}

export function sesionVencida() {
  const ultima = leer()
  return ultima > 0 && Date.now() - ultima > LIMITE_MS
}

// Mientras la app está abierta: cada clic o tecla cuenta como actividad (se guarda como mucho una
// vez por minuto) y cada minuto, o al volver a la pestaña, se revisa si ya venció. Antes de contar
// una actividad se revisa también, por si la compu estuvo suspendida con la app abierta.
export function vigilarActividad(alVencer) {
  let ultimaGuardada = 0

  const actividad = () => {
    if (sesionVencida()) return alVencer()
    const ahora = Date.now()
    if (ahora - ultimaGuardada > CADA_CUANTO_GUARDAR_MS) {
      ultimaGuardada = ahora
      marcarActividad()
    }
  }
  const revisar = () => {
    if (sesionVencida()) alVencer()
  }
  const alVolver = () => {
    if (document.visibilityState === 'visible') revisar()
  }

  const eventos = ['pointerdown', 'keydown', 'wheel']
  eventos.forEach((e) => window.addEventListener(e, actividad, { passive: true }))
  document.addEventListener('visibilitychange', alVolver)
  const reloj = setInterval(revisar, 60 * 1000)

  return () => {
    eventos.forEach((e) => window.removeEventListener(e, actividad))
    document.removeEventListener('visibilitychange', alVolver)
    clearInterval(reloj)
  }
}
