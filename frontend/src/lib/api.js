import { supabase } from './supabaseClient'

const API_URL = 'http://localhost:3000'

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