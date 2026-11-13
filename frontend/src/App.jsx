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
import Login from './pages/Login'

import CambioContrasena from './components/CambioContrasena'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import ResultadosBusqueda from './components/ResultadosBusqueda'
import DetalleLead from './components/DetalleLead'
import { ConfigEquipoContext } from './lib/configEquipo'
import { LeadsEquipoContext, VIGENCIA_LISTA_MS } from './lib/leadsEquipo'
import { HORAS_INACTIVIDAD, marcarActividad, olvidarActividad, sesionVencida, vigilarActividad } from './lib/sesion'
import { calcularContadores } from './lib/contadores'
import { pantallaInicial } from './lib/preferencias'
import { armarDireccion, esRespuestaDeSupabase, leerDireccion } from './lib/navegacion'
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
  // con qué modo y email se abre el login (desde la landing); vez lo reinicia
  const [entradaLogin, setEntradaLogin] = useState({ modo: 'ingresar', email: '', vez: 0 })
  // volvió del email de "olvidé mi contraseña": antes de entrar elige una nueva
  const [recuperando, setRecuperando] = useState(false)
  const [mensajeLogin, setMensajeLogin] = useState(null)
  const [verLogin, setVerLogin] = useState(yaIngreso)
  // alguien desactivado que eligió armar su propio equipo
  const [crearPropio, setCrearPropio] = useState(false)
  // la pantalla sale de la dirección (#/agenda); si no hay, la que cada uno eligió en Mi perfil
  const [vista, setVista] = useState(() => leerDireccion(window.location.hash).vista || pantallaInicial())
  const [busqueda, setBusqueda] = useState('')
  const [leadAbierto, setLeadAbierto] = useState(null)
  // contacto que pide la dirección (al recargar, con un enlace o con Atrás/Adelante)
  const [leadPedido, setLeadPedido] = useState(() => leerDireccion(window.location.hash).leadId)
  // la dirección ya se escribió una vez desde que se entró a la app
  const direccionLista = useRef(false)
  // el contacto abierto sumó una entrada al historial: al cerrarlo se vuelve con Atrás
  const historialPropio = useRef(false)
  const [cambios, setCambios] = useState(0)
  // cada vez que se toca "Mis leads" en el menú, vuelve a la vista principal (sale de "Ver todos")
  const [visitasLeads, setVisitasLeads] = useState(0)
  const [cargando, setCargando] = useState(true)

  // las dos solo usan funciones estables (set...), así que no cambian entre renders
  const cerrarSesion = useCallback(() => {
    olvidarActividad()
    supabase.auth.signOut()
    setSesion(null)
    setBusqueda('')
    setLeadAbierto(null)
    setLeadPedido(null)
    setVista('leads')
    // la dirección de la pantalla no queda para la próxima sesión
    direccionLista.current = false
    window.history.replaceState(null, '', window.location.pathname + window.location.search)
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
  const enApp = !!sesion && tieneEquipo && !recuperando

  // la dirección sigue a la pantalla y al contacto abierto
  useEffect(() => {
    if (!enApp || esRespuestaDeSupabase(window.location.hash)) return
    // mientras se carga el contacto que pidió la dirección, no se la pisa
    if (leadPedido && leadAbierto?.id !== leadPedido) return
    const primera = !direccionLista.current
    direccionLista.current = true
    const nueva = armarDireccion(vista, leadAbierto?.id)
    if (window.location.hash === nueva) return
    const url = window.location.pathname + window.location.search + nueva
    if (primera) {
      window.history.replaceState(null, '', url)
      return
    }
    // abrir un contacto suma una entrada al historial: Atrás lo cierra
    historialPropio.current = !!leadAbierto && !leerDireccion(window.location.hash).leadId
    window.history.pushState(null, '', url)
  }, [enApp, vista, leadAbierto, leadPedido])

  // Atrás y Adelante del navegador
  useEffect(() => {
    if (!enApp) return
    function alMoverseEnElHistorial() {
      const { vista: nueva, leadId } = leerDireccion(window.location.hash)
      if (nueva) {
        setVista(nueva)
        setBusqueda('')
      }
      // la entrada anterior puede ser cualquier cosa: al cerrar el contacto se suma una nueva
      historialPropio.current = false
      setLeadPedido(leadId)
      if (!leadId) setLeadAbierto(null)
    }
    window.addEventListener('popstate', alMoverseEnElHistorial)
    return () => window.removeEventListener('popstate', alMoverseEnElHistorial)
  }, [enApp])

  // el contacto que pide la dirección: primero se busca en la lista de trabajo y, si no está (por
  // ejemplo, uno ya cerrado), se pide al servidor
  const enLista = leadPedido && lista.leads.find((l) => l.id === leadPedido)
  if (enLista && leadAbierto?.id !== leadPedido) setLeadAbierto(enLista)
  useEffect(() => {
    if (!enApp || !leadPedido || !lista.listo || leadAbierto?.id === leadPedido) return
    if (lista.leads.some((l) => l.id === leadPedido)) return
    let vigente = true
    apiFetch(`/api/leads/${leadPedido}`)
      .then((lead) => vigente && setLeadAbierto(lead))
      .catch(() => {
        // no existe o es de otro equipo: queda la pantalla sin el contacto
        if (vigente) setLeadPedido(null)
      })
    return () => {
      vigente = false
    }
  }, [enApp, leadPedido, lista, leadAbierto?.id])

  function abrirLead(lead) {
    setLeadPedido(lead.id)
    setLeadAbierto(lead)
  }

  function cerrarLead() {
    setLeadPedido(null)
    if (historialPropio.current) {
      historialPropio.current = false
      window.history.back()
    } else {
      setLeadAbierto(null)
    }
  }
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
                {buscando && <ResultadosBusqueda q={textoBusqueda} userId={userId} onAbrirLead={abrirLead} cambios={cambios} />}

                {!buscando && vista === 'alertas' && <AlertasHoy userId={userId} rol={perfil?.rol} onAbrirLead={abrirLead} />}

                {!buscando && vista === 'agenda' && (
                  <Agenda userId={userId} rol={perfil?.rol} onAbrirLead={abrirLead} onCambioLead={alCambiarLead} cambios={cambios} />
                )}

                {!buscando && vista === 'charlas' && (
                  <Charlas
                    userId={userId}
                    rol={perfil?.rol}
                    onAbrirLead={abrirLead}
                    cambios={cambios}
                    onCambio={() => setCambios((n) => n + 1)}
                  />
                )}

                {!buscando && vista === 'perfil' && perfil && (
                  <Perfil perfil={perfil} usuario={sesion.user} cambios={cambios} onPerfilCambiado={setPerfil} />
                )}

                {!buscando && vista === 'stats' && <Estadisticas userId={userId} rol={perfil?.rol} cambios={cambios} />}

                {!buscando && vista === 'panel' && (
                  <PanelLider rol={perfil?.rol} onAbrirLead={abrirLead} onCambio={() => setCambios((n) => n + 1)} />
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
                    onAbrirLead={abrirLead}
                    cambios={cambios}
                    onCambio={() => setCambios((n) => n + 1)}
                  />
                )}

                {!buscando && (vista === 'exitosos' || vista === 'perdidos') && (
                  <CasosCerrados
                    key={vista}
                    tipo={vista === 'exitosos' ? 'ganado' : 'perdido'}
                    rol={perfil?.rol}
                    onAbrirLead={abrirLead}
                    cambios={cambios}
                  />
                )}
              </Suspense>

              {/* Mis leads queda montada pero oculta cuando se busca o se ve otra pantalla, así no se vuelve a cargar */}
              <div className={buscando || vista !== 'leads' ? 'hidden' : ''}>
                <MisLeads key={visitasLeads} rol={perfil?.rol} onAbrirLead={abrirLead} onCambio={() => setCambios((n) => n + 1)} />
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
                onCerrar={cerrarLead}
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
            setEntradaLogin((e) => ({ modo: 'ingresar', email: '', vez: e.vez + 1 }))
            setVerLogin(true)
          }}
          onCrearCuenta={(correo) => {
            setEntradaLogin((e) => ({ modo: 'crear', email: correo || '', vez: e.vez + 1 }))
            setVerLogin(true)
          }}
        />
      </Suspense>
    )
  }

  return (
    <Login
      key={entradaLogin.vez}
      modoInicial={entradaLogin.modo}
      emailInicial={entradaLogin.email}
      mensajeInicial={mensajeLogin}
      onSesion={setSesion}
      onVolver={() => {
        setMensajeLogin(null)
        setVerLogin(false)
      }}
    />
  )
}

export default App
