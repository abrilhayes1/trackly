// Ingresar, crear una cuenta o recuperar la contraseña (RF01). Pantalla dividida: a la izquierda el
// panel de marca (en pantallas anchas) y a la derecha el formulario, con Google abajo.
import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import CampoContrasena from '../components/CampoContrasena'
import Logo from '../components/Logo'

export default function Login({ modoInicial = 'ingresar', emailInicial = '', mensajeInicial = null, onSesion, onVolver }) {
  const [modoLogin, setModoLogin] = useState(modoInicial) // 'ingresar' | 'crear' | 'recuperar'
  const [email, setEmail] = useState(emailInicial)
  const [password, setPassword] = useState('')
  // solo al crear la cuenta
  const [nombre, setNombre] = useState('')
  const [aceptaTerminos, setAceptaTerminos] = useState(false)
  const [error, setError] = useState(null)
  const [mensajeLogin, setMensajeLogin] = useState(mensajeInicial)

  async function iniciarSesion(e) {
    e.preventDefault()
    setError(null)
    setMensajeLogin(null)

    if (modoLogin === 'recuperar') {
      if (!email.trim()) {
        setError('Escribí el email con el que creaste tu cuenta.')
        return
      }
      // Supabase manda un email con un enlace que vuelve a la app para elegir la contraseña nueva
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin })
      if (error) {
        setError(/rate limit/i.test(error.message) ? 'Se mandaron demasiados emails. Probá de nuevo en un rato.' : error.message)
        return
      }
      setMensajeLogin('Si hay una cuenta con ese email, te llegó un enlace para elegir una contraseña nueva.')
      setModoLogin('ingresar')
      return
    }

    if (modoLogin === 'crear') {
      if (!nombre.trim()) {
        setError('Escribí tu nombre.')
        return
      }
      if (password.length < 6) {
        setError('La contraseña tiene que tener al menos 6 caracteres.')
        return
      }
      if (!aceptaTerminos) {
        setError('Para crear la cuenta tenés que aceptar los términos y la política de privacidad.')
        return
      }
      // el nombre lo toma el onboarding; la fecha de aceptación queda guardada con la cuenta
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: nombre.trim(), terminos_aceptados: new Date().toISOString() } },
      })
      if (error) {
        setError(error.message)
        return
      }
      // si Supabase pide confirmar el email, todavía no hay sesión
      if (!data.session) {
        setMensajeLogin('Te mandamos un email para confirmar tu cuenta. Después volvé e ingresá.')
        setModoLogin('ingresar')
        return
      }
      onSesion(data.session)
      return
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      return
    }

    onSesion(data.session)
  }

  // RF01: ingresar con Google. Supabase lleva a Google y vuelve a esta misma dirección con la sesión
  async function entrarConGoogle() {
    setError(null)
    setMensajeLogin(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) {
      setError(
        /provider is not enabled/i.test(error.message) ? 'El ingreso con Google todavía no está activado en Supabase.' : error.message,
      )
    }
  }

  const campo =
    'w-full text-sm px-3 py-2.5 rounded-lg border border-border-secondary bg-bg-primary text-text-primary focus:outline-none focus:border-accent'
  const cambiarModo = (modo) => {
    setModoLogin(modo)
    setError(null)
    setMensajeLogin(null)
  }

  return (
    <div className="min-h-screen md:grid md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] bg-bg-primary">
      {/* panel de marca: solo en pantallas anchas */}
      <aside
        className="hidden md:flex flex-col justify-between p-10 lg:p-14 text-white"
        style={{ background: 'linear-gradient(160deg, #2b2566 0%, #1c1844 100%)' }}
      >
        <img src="/logos/trackly-logo-oscuro.png" alt="Trackly" className="h-8 w-auto self-start" />
        <div className="max-w-[400px]">
          <p className="text-[34px] lg:text-[40px] leading-[1.1] font-semibold tracking-[-0.03em] text-balance">
            Que ningún lead se enfríe.
          </p>
          <p className="mt-4 text-[15px] leading-relaxed text-white/70">
            Trackly te dice a quién contactar hoy, te avisa antes de que algo se venza y le muestra al líder cómo viene el equipo.
          </p>
          <ul className="mt-10 space-y-4">
            {[
              ['62%', 'de los asesores pierde contactos seguido o todo el tiempo por falta de aviso.'],
              ['62%', 'dedica más de una hora por semana solo a ordenar información.'],
              ['100%', 'valoró con 4 o 5 puntos que la herramienta priorice sola.'],
            ].map(([cifra, texto]) => (
              <li key={texto} className="flex items-baseline gap-3 text-[14px] text-white/80">
                <span className="w-12 shrink-0 font-semibold text-[#c4bdff] tabular-nums">{cifra}</span>
                {texto}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-[12px] text-white/45">Encuesta a 8 asesores comerciales, 2026.</p>
      </aside>

      <main className="min-h-screen flex flex-col px-5 py-5 sm:px-10">
        <button
          type="button"
          onClick={onVolver}
          className="self-start text-[13px] text-text-secondary hover:text-text-primary -ml-2 px-2 py-1"
        >
          ← Conocé Trackly
        </button>

        <form onSubmit={iniciarSesion} className="w-full max-w-[380px] m-auto py-10">
          <div className="md:hidden mb-8">
            <Logo alto="h-7" />
          </div>
          <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-text-primary">
            {modoLogin === 'crear' ? 'Creá tu cuenta' : modoLogin === 'recuperar' ? 'Recuperá tu contraseña' : 'Ingresá a tu cuenta'}
          </h1>
          <p className="mt-1.5 mb-7 text-[14px] text-text-secondary">
            {modoLogin === 'crear'
              ? 'Es gratis y tarda un minuto.'
              : modoLogin === 'recuperar'
                ? 'Te mandamos un enlace para elegir una contraseña nueva.'
                : 'Qué bueno verte de nuevo.'}
          </p>

          {modoLogin === 'crear' && (
            <div className="mb-4">
              <label htmlFor="login-nombre" className="block text-[13px] font-medium text-text-primary mb-1.5">
                Nombre y apellido
              </label>
              <input
                id="login-nombre"
                type="text"
                autoComplete="name"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className={campo}
              />
            </div>
          )}

          <div className="mb-4">
            <label htmlFor="login-email" className="block text-[13px] font-medium text-text-primary mb-1.5">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={campo}
            />
          </div>

          {modoLogin !== 'recuperar' && (
            <div className="mb-4">
              <div className="flex items-baseline justify-between mb-1.5">
                <label htmlFor="login-contrasena" className="block text-[13px] font-medium text-text-primary">
                  Contraseña
                </label>
                {modoLogin === 'ingresar' && (
                  <button type="button" onClick={() => cambiarModo('recuperar')} className="text-[12px] text-accent hover:underline">
                    ¿Olvidaste tu contraseña?
                  </button>
                )}
              </div>
              <CampoContrasena
                id="login-contrasena"
                autoComplete={modoLogin === 'crear' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={campo}
              />
              {modoLogin === 'crear' && (
                <p className={`mt-1.5 text-[12px] ${password.length >= 6 ? 'text-green-text' : 'text-text-tertiary'}`}>
                  {password.length >= 6 ? '✓ ' : ''}Mínimo 6 caracteres
                </p>
              )}
            </div>
          )}

          {modoLogin === 'crear' && (
            <label className="flex items-start gap-2.5 mb-5 text-[13px] leading-snug text-text-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={aceptaTerminos}
                onChange={(e) => setAceptaTerminos(e.target.checked)}
                className="mt-0.5 size-4 shrink-0 accent-[var(--color-accent)] cursor-pointer"
              />
              <span>
                Acepto los{' '}
                <a href="?legal=terminos" target="_blank" rel="noopener" className="text-accent hover:underline">
                  términos y condiciones
                </a>{' '}
                y la{' '}
                <a href="?legal=privacidad" target="_blank" rel="noopener" className="text-accent hover:underline">
                  política de privacidad
                </a>
                .
              </span>
            </label>
          )}

          <button
            type="submit"
            className="w-full text-sm font-medium text-white bg-accent hover:bg-accent-dark rounded-lg py-2.5 mt-1 transition-colors"
          >
            {modoLogin === 'crear' ? 'Crear cuenta' : modoLogin === 'recuperar' ? 'Mandarme el enlace' : 'Ingresar'}
          </button>

          {error && (
            <p role="alert" className="text-red-border text-[13px] mt-3">
              {error}
            </p>
          )}
          {mensajeLogin && (
            <p role="status" className="text-green-text text-[13px] mt-3">
              {mensajeLogin}
            </p>
          )}

          {modoLogin !== 'recuperar' && (
            <>
              <div className="flex items-center gap-3 my-5 text-[12px] text-text-tertiary">
                <span className="flex-1 h-px bg-border-tertiary" />o<span className="flex-1 h-px bg-border-tertiary" />
              </div>

              <button
                type="button"
                onClick={entrarConGoogle}
                className="w-full flex items-center justify-center gap-2 text-sm font-medium text-text-primary bg-bg-primary border border-border-secondary hover:bg-bg-secondary rounded-lg py-2.5 transition-colors"
              >
                <svg width="15" height="15" viewBox="0 0 18 18" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 01-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
                  />
                  <path
                    fill="#34A853"
                    d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.02-3.7H.96v2.34A9 9 0 009 18z"
                  />
                  <path fill="#FBBC05" d="M3.98 10.72a5.4 5.4 0 010-3.44V4.94H.96a9 9 0 000 8.12l3.02-2.34z" />
                  <path
                    fill="#EA4335"
                    d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 00.96 4.94l3.02 2.34C4.68 5.16 6.66 3.58 9 3.58z"
                  />
                </svg>
                Continuar con Google
              </button>
              {modoLogin === 'crear' && (
                <p className="mt-2.5 text-[12px] text-text-tertiary text-center">
                  Si seguís con Google, aceptás los mismos términos y la política de privacidad.
                </p>
              )}
            </>
          )}

          <p className="text-center text-[13px] text-text-secondary mt-8">
            {modoLogin === 'ingresar' ? '¿Todavía no tenés cuenta? ' : modoLogin === 'crear' ? '¿Ya tenés cuenta? ' : ''}
            <button
              type="button"
              onClick={() => cambiarModo(modoLogin === 'ingresar' ? 'crear' : 'ingresar')}
              className="text-accent font-medium hover:underline"
            >
              {modoLogin === 'ingresar' ? 'Creá una' : modoLogin === 'crear' ? 'Ingresá' : 'Volver a ingresar'}
            </button>
          </p>
        </form>
      </main>
    </div>
  )
}
