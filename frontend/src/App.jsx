import { useState, useEffect } from 'react'
import { supabase } from './lib/supabaseClient'
import { apiFetch } from './lib/api'
import MisLeads from './pages/MisLeads'
import AlertasHoy from './pages/AlertasHoy'
import CasosCerrados from './pages/CasosCerrados'
import Agenda from './pages/Agenda'
import Archivo from './pages/Archivo'
import Onboarding from './pages/Onboarding'
import Configuracion from './pages/Configuracion'
import PanelLider from './pages/PanelLider'
import Charlas from './pages/Charlas'
import Estadisticas from './pages/Estadisticas'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import ResultadosBusqueda from './components/ResultadosBusqueda'
import DetalleLead from './components/DetalleLead'
import { ConfigEquipoContext } from './lib/configEquipo'
import { calcularContadores } from './lib/contadores'
import { fechaLocal } from './lib/agenda'

function App() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [sesion, setSesion] = useState(null)
  // undefined = todavía no se sabe; null = no tiene equipo (va al onboarding)
  const [perfil, setPerfil] = useState(undefined)
  const [errorPerfil, setErrorPerfil] = useState(null)
  const [recargasPerfil, setRecargasPerfil] = useState(0)
  const [configEquipo, setConfigEquipo] = useState(null)
  const [recargasConfig, setRecargasConfig] = useState(0)
  const [contadores, setContadores] = useState(null)
  const [modoLogin, setModoLogin] = useState('ingresar') // 'ingresar' | 'crear'
  const [mensajeLogin, setMensajeLogin] = useState(null)
  const [vista, setVista] = useState('leads')
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
      setPerfil(undefined)
      return
    }
    apiFetch('/api/me')
      .then((data) => {
        setPerfil(data)
        setErrorPerfil(null)
      })
      .catch((e) => setErrorPerfil(e.message))
  }, [userId, recargasPerfil])

  // configuración del equipo (terminología, vencimiento...), compartida por toda la app
  const tieneEquipo = !!perfil
  useEffect(() => {
    if (!tieneEquipo) return
    apiFetch('/api/config')
      .then(setConfigEquipo)
      .catch(() => setConfigEquipo(null))
  }, [tieneEquipo, recargasConfig])

  // contadores del menú: se recalculan al cambiar de pantalla y cada vez que se modifica un lead
  useEffect(() => {
    if (!tieneEquipo) return
    Promise.all([
      apiFetch('/api/leads'),
      apiFetch(`/api/recordatorios?fecha=${fechaLocal()}`),
      apiFetch('/api/charlas').catch(() => []),
    ])
      .then(([leads, recordatorios, charlas]) => setContadores({ leads, recordatorios, charlas, ahora: Date.now() }))
      .catch(() => setContadores(null))
  }, [tieneEquipo, vista, cambios])

  async function iniciarSesion(e) {
    e.preventDefault()
    setError(null)
    setMensajeLogin(null)

    if (modoLogin === 'crear') {
      if (password.length < 6) {
        setError('La contraseña tiene que tener al menos 6 caracteres.')
        return
      }
      const { data, error } = await supabase.auth.signUp({ email, password })
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
      setSesion(data.session)
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

    setSesion(data.session)
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
        /provider is not enabled/i.test(error.message)
          ? 'El ingreso con Google todavía no está activado en Supabase.'
          : error.message
      )
    }
  }

  function cerrarSesion() {
    supabase.auth.signOut()
    setSesion(null)
    setBusqueda('')
    setLeadAbierto(null)
    setVista('leads')
    setPerfil(undefined)
  }

  // al cambiar de pantalla se limpia la búsqueda, para no quedar viendo resultados viejos
  function navegar(nuevaVista) {
    setVista(nuevaVista)
    setBusqueda('')
  }

  // cuando se modifica un lead desde la tarjeta: la tarjeta se actualiza
  // y las pantallas (Mis leads, Alertas, búsqueda) se vuelven a cargar
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

  if (sesion && perfil === undefined) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-text-secondary text-sm">
        {errorPerfil ? (
          <>
            <p>No pudimos cargar tu cuenta: {errorPerfil}</p>
            <button onClick={() => setRecargasPerfil((n) => n + 1)} className="text-xs text-accent underline">
              Reintentar
            </button>
          </>
        ) : (
          'Cargando...'
        )}
      </div>
    )
  }

  // usuario sin equipo: arma el suyo (si alguien lo invitó, /api/me ya lo sumó a ese equipo)
  if (sesion && perfil === null) {
    return (
      <Onboarding
        email={sesion.user.email}
        nombreSugerido={sesion.user.user_metadata?.full_name || sesion.user.user_metadata?.name || ''}
        onListo={() => setRecargasPerfil((n) => n + 1)}
        onCerrarSesion={cerrarSesion}
      />
    )
  }

  if (sesion) {
    const textoBusqueda = busqueda.trim()
    const buscando = textoBusqueda.length >= 2

    // la web es de escritorio (el celular lo cubre la app mobile): en una ventana más angosta que
    // 1024 px se desplaza hacia el costado en vez de aplastarse
    const contextoConfig = { config: tieneEquipo ? configEquipo : null, recargar: () => setRecargasConfig((n) => n + 1) }

    return (
      <ConfigEquipoContext.Provider value={contextoConfig}>
      <div className="flex min-h-screen min-w-[1024px]">
        <Sidebar
          email={sesion.user.email}
          perfil={perfil}
          vista={vista}
          onNavegar={navegar}
          onCerrarSesion={cerrarSesion}
          contadores={
            contadores && configEquipo
              ? calcularContadores({ ...contadores, config: configEquipo, userId, rol: perfil?.rol })
              : null
          }
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

          {!buscando && vista === 'alertas' && (
            <AlertasHoy userId={userId} onAbrirLead={setLeadAbierto} cambios={cambios} />
          )}

          {!buscando && vista === 'agenda' && <Agenda userId={userId} onAbrirLead={setLeadAbierto} cambios={cambios} />}

          {!buscando && vista === 'charlas' && (
            <Charlas
              userId={userId}
              rol={perfil?.rol}
              onAbrirLead={setLeadAbierto}
              cambios={cambios}
              onCambio={() => setCambios((n) => n + 1)}
            />
          )}

          {!buscando && vista === 'stats' && <Estadisticas userId={userId} rol={perfil?.rol} cambios={cambios} />}

          {!buscando && vista === 'panel' && (
            <PanelLider
              rol={perfil?.rol}
              onAbrirLead={setLeadAbierto}
              cambios={cambios}
              onCambio={() => setCambios((n) => n + 1)}
            />
          )}

          {!buscando && vista === 'config' && (
            <Configuracion
              rol={perfil?.rol}
              nombreEquipo={perfil?.tenants?.nombre}
              onGuardado={() => {
                setRecargasPerfil((n) => n + 1)
                setCambios((n) => n + 1)
              }}
            />
          )}

          {!buscando && vista === 'archivo' && (
            <Archivo
              userId={userId}
              rol={perfil?.rol}
              onAbrirLead={setLeadAbierto}
              cambios={cambios}
              onCambio={() => setCambios((n) => n + 1)}
            />
          )}

          {!buscando && (vista === 'exitosos' || vista === 'perdidos') && (
            <CasosCerrados
              key={vista}
              tipo={vista === 'exitosos' ? 'ganado' : 'perdido'}
              rol={perfil?.rol}
              onAbrirLead={setLeadAbierto}
              cambios={cambios}
            />
          )}

          {/* Mis leads queda montada pero oculta cuando se busca o se ve otra pantalla, así no se vuelve a cargar */}
          <div className={buscando || vista !== 'leads' ? 'hidden' : ''}>
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
      </ConfigEquipoContext.Provider>
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
          {modoLogin === 'crear' ? 'Creá tu cuenta' : 'Ingresá a tu cuenta'}
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
          {modoLogin === 'crear' ? 'Crear cuenta' : 'Ingresar'}
        </button>

        <div className="flex items-center gap-2.5 my-4 text-[11px] text-text-tertiary">
          <span className="flex-1 h-px bg-border-tertiary" />o<span className="flex-1 h-px bg-border-tertiary" />
        </div>

        <button
          type="button"
          onClick={entrarConGoogle}
          className="w-full flex items-center justify-center gap-2 text-sm font-medium text-text-primary bg-bg-primary border border-border-secondary hover:bg-bg-secondary rounded-md py-2.5"
        >
          <svg width="15" height="15" viewBox="0 0 18 18" aria-hidden="true">
            <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 01-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
            <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.02-3.7H.96v2.34A9 9 0 009 18z" />
            <path fill="#FBBC05" d="M3.98 10.72a5.4 5.4 0 010-3.44V4.94H.96a9 9 0 000 8.12l3.02-2.34z" />
            <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 00.96 4.94l3.02 2.34C4.68 5.16 6.66 3.58 9 3.58z" />
          </svg>
          Continuar con Google
        </button>

        {error && (
          <p className="text-red-border text-xs mt-3 text-center">{error}</p>
        )}
        {mensajeLogin && (
          <p className="text-green-text text-xs mt-3 text-center">{mensajeLogin}</p>
        )}

        <p className="text-center text-[11px] text-text-tertiary mt-6">
          {modoLogin === 'crear' ? '¿Ya tenés cuenta? ' : '¿Todavía no tenés cuenta? '}
          <button
            type="button"
            onClick={() => {
              setModoLogin(modoLogin === 'crear' ? 'ingresar' : 'crear')
              setError(null)
              setMensajeLogin(null)
            }}
            className="text-accent hover:underline"
          >
            {modoLogin === 'crear' ? 'Ingresá' : 'Creá una'}
          </button>
        </p>
      </form>
    </div>
  )
}

export default App
