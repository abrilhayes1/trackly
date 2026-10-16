import { supabase } from './supabaseClient'

// dirección del backend: en Vercel se define VITE_API_URL; en la compu se usa el backend local
const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '')

export async function apiFetch(path, options = {}) {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  const body = await res.json()

  if (!res.ok) {
    throw new Error(body.error || 'Error en la petición')
  }

  return body
}