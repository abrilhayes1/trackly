import { supabase } from './supabase'

// el mismo servidor que usa la web (Railway); los mensajes de error son los mismos
const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'https://trackly-production-6424.up.railway.app').replace(/\/$/, '')

const SIN_CONEXION = 'No se pudo conectar con el servidor. Revisá tu conexión y probá de nuevo.'
const POR_ESTADO = {
  401: 'Tu sesión venció. Volvé a ingresar.',
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
    throw new Error(SIN_CONEXION)
  }

  // un null en JSON es una respuesta válida (por ejemplo, un contacto sin cierre)
  const SIN_JSON = Symbol('sin json')
  const body = await res.json().catch(() => SIN_JSON)
  if (!res.ok) {
    throw new Error((body !== SIN_JSON && body?.error) || POR_ESTADO[res.status] || 'Algo salió mal. Probá de nuevo.')
  }
  if (body === SIN_JSON) throw new Error('El servidor respondió algo inesperado. Probá de nuevo.')
  return body
}
