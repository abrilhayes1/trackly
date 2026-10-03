import { useState, useEffect } from 'react'
import { supabase } from './lib/supabaseClient'
import MisLeads from './pages/MisLeads'
import Sidebar from './components/Sidebar'

function App() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [sesion, setSesion] = useState(null)
  const [error, setError] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSesion(data.session)
      setCargando(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSesion(session)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function iniciarSesion(e) {
    e.preventDefault()
    setError(null)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      return
    }

    setSesion(data.session)
  }

  function cerrarSesion() {
    supabase.auth.signOut()
    setSesion(null)
  }

  if (cargando) {
    return <div className="min-h-screen flex items-center justify-center text-text-secondary text-sm">Cargando...</div>
  }

  if (sesion) {
    return (
      <div className="flex">
        <Sidebar usuario={sesion.user} onCerrarSesion={cerrarSesion} />
        <main className="flex-1 bg-bg-primary overflow-auto">
          <MisLeads />
        </main>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #EEEDFE 0%, #F7F6F2 60%)' }}
    >
      <form
        onSubmit={iniciarSesion}
        className="bg-bg-primary border border-border-tertiary rounded-2xl w-full max-w-sm px-8 py-10"
        style={{ boxShadow: '0 12px 40px rgba(60, 52, 137, 0.08)' }}
      >
        <h1 className="text-center text-2xl font-semibold tracking-tight text-accent-dark mb-1">
          Trackly<span className="text-green-border">.</span>
        </h1>
        <p className="text-center text-xs text-text-secondary mb-7">
          Ingresá a tu cuenta
        </p>

        <div className="mb-3">
          <label className="block text-xs text-text-secondary mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full text-sm px-3 py-2 rounded-md border border-border-secondary bg-bg-secondary text-text-primary focus:outline-none focus:border-accent focus:bg-bg-primary"
          />
        </div>

        <div className="mb-3">
          <label className="block text-xs text-text-secondary mb-1">Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full text-sm px-3 py-2 rounded-md border border-border-secondary bg-bg-secondary text-text-primary focus:outline-none focus:border-accent focus:bg-bg-primary"
          />
        </div>

        <button
          type="submit"
          className="w-full text-sm font-medium text-white bg-accent hover:bg-accent-dark rounded-md py-2.5 mt-1"
        >
          Ingresar
        </button>

        {error && (
          <p className="text-red-border text-xs mt-3 text-center">{error}</p>
        )}
      </form>
    </div>
  )
}

export default App