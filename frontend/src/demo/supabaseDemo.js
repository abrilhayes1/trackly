// Reemplaza a lib/supabaseClient.js en el prototipo: el mismo "supabase.auth" que usa la app, pero
// sin servidor. Cualquier contraseña sirve para los usuarios de ejemplo; crear una cuenta lleva al
// onboarding como en la app real. La sesión dura mientras la pestaña está abierta.
import { db, guardar, nuevoId } from './datos'

const CLAVE = 'trackly-prototipo-sesion'
const oyentes = new Set()

function armarSesion(usuario) {
  return {
    access_token: 'prototipo',
    token_type: 'bearer',
    expires_at: Math.floor(Date.now() / 1000) + 86400,
    user: {
      id: usuario.id,
      email: usuario.email,
      aud: 'authenticated',
      role: 'authenticated',
      created_at: new Date().toISOString(),
      app_metadata: { provider: usuario.google ? 'google' : 'email', providers: [usuario.google ? 'google' : 'email'] },
      user_metadata: { full_name: usuario.nombre },
    },
  }
}

let sesion = (() => {
  try {
    const id = sessionStorage.getItem(CLAVE)
    const usuario = db.usuarios.find((u) => u.id === id)
    return usuario ? armarSesion(usuario) : null
  } catch {
    return null
  }
})()

function cambiar(nueva, evento) {
  sesion = nueva
  try {
    if (nueva) sessionStorage.setItem(CLAVE, nueva.user.id)
    else sessionStorage.removeItem(CLAVE)
  } catch {
    // sin almacenamiento, la sesión dura hasta recargar
  }
  oyentes.forEach((cb) => cb(evento, nueva))
}

const pausa = () => new Promise((r) => setTimeout(r, 250))

export const supabase = {
  auth: {
    getSession: async () => ({ data: { session: sesion }, error: null }),
    onAuthStateChange(cb) {
      oyentes.add(cb)
      return { data: { subscription: { unsubscribe: () => oyentes.delete(cb) } } }
    },
    async signInWithPassword({ email }) {
      await pausa()
      const usuario = db.usuarios.find((u) => u.email === String(email).trim().toLowerCase())
      if (!usuario) {
        return {
          data: {},
          error: { message: 'En el prototipo podés entrar con lider@demo.trackly o martin@demo.trackly (cualquier contraseña).' },
        }
      }
      cambiar(armarSesion(usuario), 'SIGNED_IN')
      return { data: { session: sesion, user: sesion.user }, error: null }
    },
    async signUp({ email, options }) {
      await pausa()
      const correo = String(email).trim().toLowerCase()
      if (db.usuarios.some((u) => u.email === correo)) return { data: {}, error: { message: 'Ya hay una cuenta con ese email.' } }
      const usuario = { id: nuevoId(), email: correo, nombre: options?.data?.full_name || correo.split('@')[0] }
      db.usuarios.push(usuario)
      guardar()
      cambiar(armarSesion(usuario), 'SIGNED_IN')
      return { data: { session: sesion, user: sesion.user }, error: null }
    },
    // "Continuar con Google" entra como la líder del equipo de ejemplo
    async signInWithOAuth() {
      await pausa()
      cambiar(armarSesion({ ...db.usuarios[0], google: true }), 'SIGNED_IN')
      return { data: {}, error: null }
    },
    resetPasswordForEmail: async () => ({ data: {}, error: null }),
    updateUser: async () => ({ data: { user: sesion?.user }, error: null }),
    async signOut() {
      cambiar(null, 'SIGNED_OUT')
      return { error: null }
    },
  },
}

// para la barra del prototipo: entrar directo como un usuario de ejemplo
export function entrarComo(id) {
  const usuario = db.usuarios.find((u) => u.id === id)
  try {
    sessionStorage.setItem(CLAVE, usuario.id)
    localStorage.setItem('trackly-ya-ingreso', '1')
  } catch {
    // sin almacenamiento
  }
}

export const usuarioActual = () => sesion?.user.id ?? null
