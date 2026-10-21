import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const campo =
  'w-full text-sm px-3 py-2 rounded-md border border-border-secondary bg-bg-secondary text-text-primary focus:outline-none focus:border-accent focus:bg-bg-primary'

// Elegir una contraseña nueva (desde Mi perfil o al volver del email de recuperación).
// La cambia Supabase Auth directamente: el backend nunca ve las contraseñas.
export default function CambioContrasena({ onListo, textoBoton = 'Cambiar contraseña' }) {
  const [nueva, setNueva] = useState('')
  const [repetida, setRepetida] = useState('')
  const [error, setError] = useState(null)
  const [ok, setOk] = useState(false)
  const [guardando, setGuardando] = useState(false)

  async function guardar(e) {
    e.preventDefault()
    setError(null)
    setOk(false)
    if (nueva.length < 6) return setError('La contraseña tiene que tener al menos 6 caracteres.')
    if (nueva !== repetida) return setError('Las dos contraseñas no coinciden.')

    setGuardando(true)
    const { error: errorAuth } = await supabase.auth.updateUser({ password: nueva })
    setGuardando(false)
    if (errorAuth) {
      // Supabase avisa en inglés si la nueva es igual a la anterior
      return setError(
        /different from the old/i.test(errorAuth.message)
          ? 'La contraseña nueva tiene que ser distinta de la anterior.'
          : errorAuth.message,
      )
    }
    setNueva('')
    setRepetida('')
    setOk(true)
    onListo?.()
  }

  return (
    <form onSubmit={guardar}>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <label className="block text-[11px] font-medium text-text-secondary mb-1">Contraseña nueva</label>
          <input type="password" autoComplete="new-password" className={campo} value={nueva} onChange={(e) => setNueva(e.target.value)} />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-text-secondary mb-1">Repetila</label>
          <input
            type="password"
            autoComplete="new-password"
            className={campo}
            value={repetida}
            onChange={(e) => setRepetida(e.target.value)}
          />
        </div>
      </div>
      {error && <p className="text-xs text-red-text bg-red-bg border border-red-border rounded-md px-3 py-2 mb-3">{error}</p>}
      {ok && (
        <p className="text-xs text-green-text bg-green-bg border border-green-border rounded-md px-3 py-2 mb-3">
          Listo, tu contraseña cambió.
        </p>
      )}
      <button
        type="submit"
        disabled={guardando || !nueva}
        className="text-xs font-medium px-3 py-2 rounded-md bg-accent text-white hover:bg-accent-dark disabled:opacity-50"
      >
        {guardando ? 'Guardando...' : textoBoton}
      </button>
    </form>
  )
}
