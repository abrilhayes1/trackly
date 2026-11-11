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
const Landing = lazy(() => import('./pages/Landing'))

import CambioContrasena from './components/CambioContrasena'
import CampoContrasena from './components/CampoContrasena'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import ResultadosBusqueda from './components/ResultadosBusqueda'
import DetalleLead from './components/DetalleLead'
import { ConfigEquipoContext } from './lib/configEquipo'
import { LeadsEquipoContext, VIGENCIA_LISTA_MS } from './lib/leadsEquipo'
import { HORAS_INACTIVIDAD, marcarActividad, olvidarActividad, sesionVencida, vigilarActividad } from './lib/sesion'
import { calcularContadores } from './lib/contadores'
import { pantallaInicial } from './lib/preferencias'
import { fechaLocal } from './lib/agenda'
import Logo from './components/Logo'
import { AvisoInvitaciones, CuentaDesactivada } from './components/Invitaciones'

// quien ya entró alguna vez desde este navegador va directo al login; el resto ve antes la landing
const YA_INGRESO = 'trackly-ya-ingreso'
function yaIngreso() {
  try {
    return localStorage.getItem(YA_INGRESO) === '1' || new URLSearchParams(window.location.search).has('ingresar')
  } catch {
    return false
  }
}

function App() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  // solo al crear la cuenta
  const [nombre, setNombre] = useState('')
  const [aceptaTerminos, setAceptaTerminos] = useState(false)
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
  const [verLogin, setVerLogin] = useState(yaIngreso)
  // alguien desactivado que eligió armar su propio equipo
  const [crearPropio, setCrearPropio] = useState(false)
  // la pantalla con la que abre la app la elige cada uno en Mi perfil
  const [vista, setVista] = useState(pantallaInicial)
  const [busqueda, setBusqueda] = useState('')
  const [leadAbierto, setLeadAbierto] = useState(null)
  const [cambios, setCambios] = useState(0)
  // cada vez que se toca "Mis leads" en el menú, vuelve a la vista principal (sale de "Ver todos")
  const [visitasLeads, setVisitasLeads] = useState(0)
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
    setCrearPropio(false)
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
      if (evento === 'SIGNED_IN') {
        marcarActividad()
        try {
          localStorage.setItem(YA_INGRESO, '1')
        } catch {
          // sin almacenamiento, la próxima vez se ve la landing: no pasa nada
        }
      }
      if (evento === 'SIGNED_OUT') {
        olvidarActividad()
        setPerfil(undefined)
      }
      setSesion(session)
      if (evento === 'PASSWORD_RECOVERY') setRecuperando(true)
    })

    return () => listener.subscription.unsubscribe()
  }, [cerrarPorInactividad])

  const userId = sesion?.user.id

  useEffect(() => {
    // sin sesión no hay perfil (lo limpian cerrarSesion y el evento SIGNED_OUT)
    if (!userId) return
    apiFetch('/api/me')
      .then((data) => {
        setPerfil(data)
        setErrorPerfil(null)
      })
      .catch((e) => setErrorPerfil(e.message))
  }, [userId, recargasPerfil])

  // configuración del equipo (terminología, vencimiento...), compartida por toda la app
  const tieneEquipo = !!perfil && !perfil.desactivado
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
        /provider is not enabled/i.test(error.message) ? 'El ingreso con Google todavía no está activado en Supabase.' : error.message,
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
    if (nuevaVista === 'leads') setVisitasLeads((n) => n + 1)
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
    return <div className="min-h-screen flex items-center justify-center text-text-secondary text-sm">Cargando...</div>
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
          <h1 className="flex justify-center mb-3">
            <Logo alto="h-8" />
          </h1>
          <p className="text-center text-xs text-text-secondary mb-6">Elegí una contraseña nueva para {sesion.user.email}</p>
          <CambioContrasena textoBoton="Guardar y entrar" onListo={() => setRecuperando(false)} />
        </div>
      </div>
    )
  }

  // el líder lo desactivó: puede unirse a otro equipo que lo invitó o armar el suyo
  if (sesion && perfil?.desactivado && !crearPropio) {
    return (
      <CuentaDesactivada
        equipo={perfil.equipo}
        invitaciones={perfil.invitaciones}
        onCrearEquipo={() => setCrearPropio(true)}
        onCerrarSesion={cerrarSesion}
      />
    )
  }

  // usuario sin equipo: arma el suyo (si alguien lo invitó, /api/me ya lo sumó a ese equipo)
  if (sesion && (perfil === null || perfil?.desactivado)) {
    return (
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-text-secondary text-sm">Cargando...</div>}>
        <Onboarding
          email={sesion.user.email}
          nombreSugerido={sesion.user.user_metadata?.full_name || sesion.user.user_metadata?.name || ''}
          onListo={() => {
            setCrearPropio(false)
            setRecargasPerfil((n) => n + 1)
          }}
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
              <AvisoInvitaciones
                invitaciones={perfil?.invitaciones}
                equipoActual={perfil?.tenants?.nombre}
                onRechazada={(id) => setPerfil((p) => ({ ...p, invitaciones: p.invitaciones.filter((i) => i.id !== id) }))}
              />

              {/* mientras se descarga una pantalla que todavía no se abrió */}
              <Suspense fallback={<p className="p-5 text-sm text-text-secondary">Cargando...</p>}>
                {buscando && <ResultadosBusqueda q={textoBusqueda} userId={userId} onAbrirLead={setLeadAbierto} cambios={cambios} />}

                {!buscando && vista === 'alertas' && <AlertasHoy userId={userId} onAbrirLead={setLeadAbierto} />}

                {!buscando && vista === 'agenda' && (
                  <Agenda userId={userId} onAbrirLead={setLeadAbierto} onCambioLead={alCambiarLead} cambios={cambios} />
                )}

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
                  <PanelLider rol={perfil?.rol} onAbrirLead={setLeadAbierto} onCambio={() => setCambios((n) => n + 1)} />
                )}

                {!buscando && vista === 'config' && (
                  <Configuracion
                    rol={perfil?.rol}
                    nombreEquipo={perfil?.tenants?.nombre}
                    miId={userId}
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
                <MisLeads key={visitasLeads} rol={perfil?.rol} onAbrirLead={setLeadAbierto} onCambio={() => setCambios((n) => n + 1)} />
              </div>
            </main>

            {leadAbierto && (
              <DetalleLead
                key={leadAbierto.id}
                lead={leadAbierto}
                userId={userId}
                rol={perfil?.rol}
                miNombre={perfil?.nombre}
                equipo={perfil?.tenants?.nombre}
                onCerrar={() => setLeadAbierto(null)}
                onCambio={alCambiarLead}
              />
            )}
          </div>
        </LeadsEquipoContext.Provider>
      </ConfigEquipoContext.Provider>
    )
  }

  if (!verLogin) {
    return (
      <Suspense fallback={<div className="min-h-screen bg-bg-secondary" />}>
        <Landing
          onIngresar={() => {
            setModoLogin('ingresar')
            setVerLogin(true)
          }}
          onCrearCuenta={(correo) => {
            if (correo) setEmail(correo)
            setModoLogin('crear')
            setVerLogin(true)
          }}
        />
      </Suspense>
    )
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
          onClick={() => {
            setMensajeLogin(null)
            setVerLogin(false)
          }}
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
                <a href="/?legal=terminos" target="_blank" rel="noopener" className="text-accent hover:underline">
                  términos y condiciones
                </a>{' '}
                y la{' '}
                <a href="/?legal=privacidad" target="_blank" rel="noopener" className="text-accent hover:underline">
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

export default App
