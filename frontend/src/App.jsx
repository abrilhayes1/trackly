import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react'
import { supabase } from './lib/supabaseClient'
import { apiFetch } from './lib/api'
import MisLeads from './pages/MisLeads'
import AlertasHoy from './pages/AlertasHoy'
// Mis leads y Alertas van en la carga inicial; el resto de las pantallas se descarga recién la
// primera vez que se abre (la primera carga de la app es más liviana)
const CasosCerrados = lazy(() => import('./pages/CasosCerrados'))
const Agenda = lazy(() => import('./pages/Agenda'))
const Archivo = lazy(() => import('./pages/Archivo'))
const Onboarding = lazy(() => import('./pages/Onboarding'))
const Configuracion = lazy(() => import('./pages/Configuracion'))
const PanelLider = lazy(() => import('./pages/PanelLider'))
const Charlas = lazy(() => import('./pages/Charlas'))
const Estadisticas = lazy(() => import('./pages/Estadisticas'))
const Perfil = lazy(() => import('./pages/Perfil'))
import CambioContrasena from './components/CambioContrasena'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import ResultadosBusqueda from './components/ResultadosBusqueda'
import DetalleLead from './components/DetalleLead'
import { ConfigEquipoContext } from './lib/configEquipo'
import { LeadsEquipoContext, VIGENCIA_LISTA_MS } from './lib/leadsEquipo'
import { HORAS_INACTIVIDAD, marcarActividad, olvidarActividad, sesionVencida, vigilarActividad } from './lib/sesion'
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
  const [configLista, setConfigLista] = useState(false)
  const [contadores, setContadores] = useState(null)
  // lista de trabajo compartida (activos y vencidos); ultimaCarga sirve para saber si quedó vieja
  const [lista, setLista] = useState({ leads: [], listo: false, error: null })
  const [recargasLista, setRecargasLista] = useState(0)
  const ultimaCarga = useRef(0)
  const [modoLogin, setModoLogin] = useState('ingresar') // 'ingresar' | 'crear' | 'recuperar'
  // volvió del email de "olvidé mi contraseña": antes de entrar elige una nueva
  const [recuperando, setRecuperando] = useState(false)
  const [mensajeLogin, setMensajeLogin] = useState(null)
  const [vista, setVista] = useState('leads')
  const [busqueda, setBusqueda] = useState('')
  const [leadAbierto, setLeadAbierto] = useState(null)
  const [cambios, setCambios] = useState(0)
  const [error, setError] = useState(null)
  const [cargando, setCargando] = useState(true)

  // las dos solo usan funciones estables (set...), así que no cambian entre renders
  const cerrarSesion = useCallback(() => {
    olvidarActividad()
    supabase.auth.signOut()
    setSesion(null)
    setBusqueda('')
    setLeadAbierto(null)
    setVista('leads')
    setPerfil(undefined)
    setLista({ leads: [], listo: false, error: null })
    setConfigLista(false)
  }, [])

  const cerrarPorInactividad = useCallback(() => {
    cerrarSesion()
    setMensajeLogin(`Por seguridad, tu sesión se cerró después de ${HORAS_INACTIVIDAD} horas sin uso. Ingresá de nuevo.`)
  }, [cerrarSesion])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      // si la sesión guardada lleva más de HORAS_INACTIVIDAD sin uso, se cierra antes de mostrar nada
      if (data.session && sesionVencida()) {
        cerrarPorInactividad()
      } else {
        if (data.session) marcarActividad()
        setSesion(data.session)
      }
      setCargando(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((evento, session) => {
      // una sesión vencida guardada no se usa (getSession la cierra)
      if (session && sesionVencida()) return
      // ingreso nuevo: arranca a contar desde ahora; al salir se borra la marca
      if (evento === 'SIGNED_IN') marcarActividad()
      if (evento === 'SIGNED_OUT') olvidarActividad()
      setSesion(session)
      if (evento === 'PASSWORD_RECOVERY') setRecuperando(true)
    })

    return () => listener.subscription.unsubscribe()
  }, [cerrarPorInactividad])

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
      .finally(() => setConfigLista(true))
  }, [tieneEquipo, recargasConfig])

  // la lista de trabajo se pide una vez y de nuevo solo cuando se modifica algo (o quedó vieja)
  useEffect(() => {
    if (!tieneEquipo) return
    apiFetch('/api/leads?estado=activo,vencido')
      .then((leads) => {
        ultimaCarga.current = Date.now()
        setLista({ leads, listo: true, error: null })
      })
      .catch((e) => setLista((actual) => ({ ...actual, listo: true, error: e.message })))
  }, [tieneEquipo, cambios, recargasLista])

  // contadores del menú: los leads salen de la lista compartida; los recordatorios de hoy, los
  // eventos y los totales de cerrados (solo números) se piden al cambiar de pantalla, que es poco
  useEffect(() => {
    if (!tieneEquipo) return
    Promise.all([
      apiFetch(`/api/recordatorios?fecha=${fechaLocal()}`),
      // solo cuántas charlas vienen (no la lista con sus invitados)
      apiFetch('/api/charlas/proximas').catch(() => ({ proximas: 0 })),
      apiFetch('/api/leads/totales'),
    ])
      .then(([recordatorios, charlas, totales]) => setContadores({ recordatorios, charlas, totales }))
      .catch(() => setContadores(null))
  }, [tieneEquipo, vista, cambios])

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

  // mientras hay sesión, se mide la inactividad
  useEffect(() => {
    if (!userId) return
    return vigilarActividad(cerrarPorInactividad)
  }, [userId, cerrarPorInactividad])

  // al cambiar de pantalla se limpia la búsqueda, para no quedar viendo resultados viejos
  function navegar(nuevaVista) {
    setVista(nuevaVista)
    setBusqueda('')
    // si la lista tiene más de un minuto, se actualiza para ver lo que cambió el resto del equipo
    if (Date.now() - ultimaCarga.current > VIGENCIA_LISTA_MS) setRecargasLista((n) => n + 1)
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

  if (sesion && recuperando) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ background: 'linear-gradient(135deg, var(--color-purple-bg) 0%, var(--color-bg-secondary) 60%)' }}
      >
        <div className="bg-bg-primary border border-border-tertiary rounded-2xl w-full max-w-md px-8 py-9">
          <h1 className="text-center text-2xl font-semibold tracking-tight text-accent-text mb-1">
            Trackly<span className="text-green-border">.</span>
          </h1>
          <p className="text-center text-xs text-text-secondary mb-6">Elegí una contraseña nueva para {sesion.user.email}</p>
          <CambioContrasena textoBoton="Guardar y entrar" onListo={() => setRecuperando(false)} />
        </div>
      </div>
    )
  }

  // usuario sin equipo: arma el suyo (si alguien lo invitó, /api/me ya lo sumó a ese equipo)
  if (sesion && perfil === null) {
    return (
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-text-secondary text-sm">Cargando...</div>}>
        <Onboarding
          email={sesion.user.email}
          nombreSugerido={sesion.user.user_metadata?.full_name || sesion.user.user_metadata?.name || ''}
          onListo={() => setRecargasPerfil((n) => n + 1)}
          onCerrarSesion={cerrarSesion}
        />
      </Suspense>
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
      <LeadsEquipoContext.Provider value={{ ...lista, listo: lista.listo && configLista }}>
      <div className="flex min-h-screen min-w-[1024px]">
        <Sidebar
          email={sesion.user.email}
          perfil={perfil}
          vista={vista}
          onNavegar={navegar}
          onCerrarSesion={cerrarSesion}
          contadores={
            contadores && configEquipo && lista.listo
              ? calcularContadores({ ...contadores, leads: lista.leads, config: configEquipo, userId, rol: perfil?.rol })
              : null
          }
        />
        <main className="flex-1 min-w-0 bg-bg-primary">
          <Topbar busqueda={busqueda} onBuscar={setBusqueda} />

          {/* mientras se descarga una pantalla que todavía no se abrió */}
          <Suspense fallback={<p className="p-5 text-sm text-text-secondary">Cargando...</p>}>

          {buscando && (
            <ResultadosBusqueda
              q={textoBusqueda}
              userId={userId}
              onAbrirLead={setLeadAbierto}
              cambios={cambios}
            />
          )}

          {!buscando && vista === 'alertas' && (
            <AlertasHoy userId={userId} onAbrirLead={setLeadAbierto} />
          )}

          {!buscando && vista === 'agenda' && <Agenda userId={userId} onAbrirLead={setLeadAbierto} onCambioLead={alCambiarLead} cambios={cambios} />}

          {!buscando && vista === 'charlas' && (
            <Charlas
              userId={userId}
              rol={perfil?.rol}
              onAbrirLead={setLeadAbierto}
              cambios={cambios}
              onCambio={() => setCambios((n) => n + 1)}
            />
          )}

          {!buscando && vista === 'perfil' && perfil && (
            <Perfil perfil={perfil} usuario={sesion.user} cambios={cambios} onPerfilCambiado={setPerfil} />
          )}

          {!buscando && vista === 'stats' && <Estadisticas userId={userId} rol={perfil?.rol} cambios={cambios} />}

          {!buscando && vista === 'panel' && (
            <PanelLider
              rol={perfil?.rol}
              onAbrirLead={setLeadAbierto}
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

          </Suspense>

          {/* Mis leads queda montada pero oculta cuando se busca o se ve otra pantalla, así no se vuelve a cargar */}
          <div className={buscando || vista !== 'leads' ? 'hidden' : ''}>
            <MisLeads onAbrirLead={setLeadAbierto} onCambio={() => setCambios((n) => n + 1)} />
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
      </LeadsEquipoContext.Provider>
      </ConfigEquipoContext.Provider>
    )
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, var(--color-purple-bg) 0%, var(--color-bg-secondary) 60%)' }}
    >
      <form
        onSubmit={iniciarSesion}
        className="bg-bg-primary border border-border-tertiary rounded-2xl w-full max-w-sm px-8 py-10"
        style={{ boxShadow: '0 12px 40px rgba(60, 52, 137, 0.08)' }}
      >
        <h1 className="text-center text-2xl font-semibold tracking-tight text-accent-text mb-1">
          Trackly<span className="text-green-border">.</span>
        </h1>
        <p className="text-center text-xs text-text-secondary mb-7">
          {modoLogin === 'crear' ? 'Creá tu cuenta' : modoLogin === 'recuperar' ? 'Te mandamos un enlace para elegir una contraseña nueva' : 'Ingresá a tu cuenta'}
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

        {modoLogin !== 'recuperar' && (
        <div className="mb-3">
          <div className="flex items-baseline justify-between mb-1">
            <label className="block text-xs text-text-secondary">Contraseña</label>
            {modoLogin === 'ingresar' && (
              <button
                type="button"
                onClick={() => {
                  setModoLogin('recuperar')
                  setError(null)
                  setMensajeLogin(null)
                }}
                className="text-[11px] text-accent hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </button>
            )}
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full text-sm px-3 py-2 rounded-md border border-border-secondary bg-bg-secondary text-text-primary focus:outline-none focus:border-accent focus:bg-bg-primary"
          />
        </div>
        )}

        <button
          type="submit"
          className="w-full text-sm font-medium text-white bg-accent hover:bg-accent-dark rounded-md py-2.5 mt-1"
        >
          {modoLogin === 'crear' ? 'Crear cuenta' : modoLogin === 'recuperar' ? 'Mandarme el enlace' : 'Ingresar'}
        </button>

        {modoLogin !== 'recuperar' && (
        <>
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
        </>
        )}

        {error && (
          <p className="text-red-border text-xs mt-3 text-center">{error}</p>
        )}
        {mensajeLogin && (
          <p className="text-green-text text-xs mt-3 text-center">{mensajeLogin}</p>
        )}

        <p className="text-center text-[11px] text-text-tertiary mt-6">
          {modoLogin === 'ingresar' ? '¿Todavía no tenés cuenta? ' : modoLogin === 'crear' ? '¿Ya tenés cuenta? ' : ''}
          <button
            type="button"
            onClick={() => {
              setModoLogin(modoLogin === 'ingresar' ? 'crear' : 'ingresar')
              setError(null)
              setMensajeLogin(null)
            }}
            className="text-accent hover:underline"
          >
            {modoLogin === 'ingresar' ? 'Creá una' : modoLogin === 'crear' ? 'Ingresá' : 'Volver a ingresar'}
          </button>
        </p>
      </form>
    </div>
  )
}

export default App
