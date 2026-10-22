import { supabase } from './supabaseClient'

// dirección del backend: en Vercel se define VITE_API_URL; en la compu se usa el backend local
const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '')

// mensajes claros cuando el servidor no responde o responde algo inesperado
const SIN_CONEXION = 'No se pudo conectar con el servidor. Revisá tu conexión y probá de nuevo.'
const POR_ESTADO = {
  401: 'Tu sesión venció. Volvé a ingresar.',
  413: 'El archivo es demasiado grande.',
  429: 'Hiciste demasiados pedidos seguidos. Esperá un momento y probá de nuevo.',
  502: 'El servidor no está disponible en este momento. Probá de nuevo en un rato.',
  503: 'El servidor no está disponible en este momento. Probá de nuevo en un rato.',
}

export async function apiFetch(path, options = {}) {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token

  let res
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    })
  } catch {
    // sin internet, el servidor apagado o bloqueado (CORS)
    throw new Error(SIN_CONEXION)
  }

  // si el servidor se cayó, puede responder una página HTML en vez de JSON
  // (un null en JSON sí es una respuesta válida: por ejemplo, un contacto que todavía no tiene cierre)
  const SIN_JSON = Symbol('sin json')
  const body = await res.json().catch(() => SIN_JSON)

  if (!res.ok) {
    throw new Error((body !== SIN_JSON && body?.error) || POR_ESTADO[res.status] || 'Algo salió mal. Probá de nuevo.')
  }
  if (body === SIN_JSON) throw new Error('El servidor respondió algo inesperado. Probá de nuevo.')

  return body
}
