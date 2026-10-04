import { useState, useEffect } from 'react'
import { supabase } from './lib/supabaseClient'
import { apiFetch } from './lib/api'
import MisLeads from './pages/MisLeads'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import ResultadosBusqueda from './components/ResultadosBusqueda'
import DetalleLead from './components/DetalleLead'

function App() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [sesion, setSesion] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [leadAbierto, setLeadAbierto] = useState(null)
  const [cambios, setCambios] = useState(0)
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

  const userId = sesion?.user.id

  useEffect(() => {
    if (!userId) {
      setPerfil(null)
      return
    }
    apiFetch('/api/me')
      .then(setPerfil)
      .catch(() => setPerfil(null))
  }, [userId])

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
    setBusqueda('')
    setLeadAbierto(null)
  }

  // cuando se modifica un lead desde la tarjeta: la tarjeta se actualiza
  // y las listas (Mis leads / búsqueda) se vuelven a cargar
  function alCambiarLead(datos) {
    setLeadAbierto((actual) => (actual ? { ...actual, ...datos } : actual))
    setCambios((n) => n + 1)
  }

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center text-text-secondary text-sm">
        Cargando...
      </div>
    )
  }

  if (sesion) {
    const textoBusqueda = busqueda.trim()
    const buscando = textoBusqueda.length >= 2

    return (
      <div className="flex min-h-screen">
        <Sidebar
          email={sesion.user.email}
          perfil={perfil}
          onCerrarSesion={cerrarSesion}
        />
        <main className="flex-1 min-w-0 bg-bg-primary">
          <Topbar busqueda={busqueda} onBuscar={setBusqueda} />

          {buscando && (
            <ResultadosBusqueda
              q={textoBusqueda}
              userId={userId}
              onAbrirLead={setLeadAbierto}
              cambios={cambios}
            />
          )}

          {/* Mis leads queda montada pero oculta mientras se busca, así no se vuelve a cargar */}
          <div className={buscando ? 'hidden' : ''}>
            <MisLeads onAbrirLead={setLeadAbierto} cambios={cambios} />
          </div>
        </main>

        {leadAbierto && (
          <DetalleLead
            key={leadAbierto.id}
            lead={leadAbierto}
            userId={userId}
            rol={perfil?.rol}
            onCerrar={() => setLeadAbierto(null)}
            onCambio={alCambiarLead}
          />
        )}
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