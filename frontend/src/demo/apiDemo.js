// Reemplaza a lib/api.js en el prototipo: misma función apiFetch, pero responde el servidor de
// ejemplo (servidor.js) en vez del backend. Tarda un poco a propósito, como una conexión real.
import { responder } from './servidor'
import { usuarioActual } from './supabaseDemo'

export async function apiFetch(path, options = {}) {
  await new Promise((r) => setTimeout(r, 120))
  let cuerpo = options.body
  if (typeof cuerpo === 'string') {
    try {
      cuerpo = JSON.parse(cuerpo)
    } catch {
      // no era JSON
    }
  }
  try {
    return await responder((options.method || 'GET').toUpperCase(), path, cuerpo, usuarioActual())
  } catch (e) {
    throw new Error(e.message || 'Algo salió mal. Probá de nuevo.', { cause: e })
  }
}
