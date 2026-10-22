import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { agruparLeads } from '../lib/urgencia'
import LeadCard from '../components/LeadCard'
import NuevoLeadModal from '../components/NuevoLeadModal'
// la ventana de importar (y las librerías para leer Excel) se descarga recién al abrirla
const ImportarLeads = lazy(() => import('../components/ImportarLeads'))
import { useConfigEquipo, useTerminos } from '../lib/configEquipo'
import { porSeccion, alCambiarPreferencias } from '../lib/preferencias'
import { useLeadsEquipo } from '../lib/leadsEquipo'

const secciones = [
  { clave: 'porVencer', titulo: 'Por vencer', badge: 'bg-red-bg text-urgent-red' },
  { clave: 'sinContactar', titulo: 'Sin contactar', badge: 'bg-avatar-bg text-urgent-blue' },
  {
    clave: 'sinProximoPaso',
    titulo: 'Sin próximo paso',
    badge: 'bg-purple-bg text-purple-text',
    ayuda: 'Ya los contactaste pero no programaste cuándo volver a hacerlo',
  },
  { clave: 'estaSemana', titulo: 'Esta semana', badge: 'bg-amber-bg text-urgent-amber' },
  { clave: 'alDia', titulo: 'Al día', badge: 'bg-green-bg text-green-text' },
]

const tarjetas = [
  { clave: 'porVencer', label: 'Por vencer', color: 'text-urgent-red' },
  { clave: 'sinContactar', label: 'Sin contactar', color: 'text-urgent-blue' },
  { clave: 'sinProximoPaso', label: 'Sin próximo paso', color: 'text-purple-text' },
  { clave: 'estaSemana', label: 'Esta semana', color: 'text-urgent-amber' },
]

// texto para buscar dentro de una sección
const textoDe = (l) =>
  [l.nombre, l.telefono, l.email, ...(l.emails_extra || []), l.consulta, l.origen].filter(Boolean).join(' ').toLowerCase()

// título de una sección con su cantidad
function Titulo({ titulo, badge, cantidad, ayuda }) {
  return (
    <div className="flex items-center gap-1.5 mb-1.5 mt-[1.1rem]">
      <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-text-secondary">{titulo}</span>
      <span className={`text-[10px] font-medium px-[7px] py-0.5 rounded-full ${badge}`}>{cantidad}</span>
      {ayuda && <span className="text-[10px] text-text-tertiary ml-1">{ayuda}</span>}
    </div>
  )
}

// "Ver todos (23) →" debajo de una sección recortada
function VerTodos({ total, limite, onClick }) {
  if (!limite || total <= limite) return null
  return (
    <button onClick={onClick} className="w-full text-xs text-accent hover:underline text-left px-1 py-1">
      Ver todos ({total}) →
    </button>
  )
}

export default function MisLeads({ rol, onAbrirLead, onCambio }) {
  // la lista y la configuración las carga App una sola vez para toda la app
  const { leads, listo, error } = useLeadsEquipo()
  const { config } = useConfigEquipo()
  const cargando = !listo
  const [userId, setUserId] = useState(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [importando, setImportando] = useState(false)
  // cuántos se ven por sección (preferencia de Mi perfil) y qué sección se está viendo completa
  const [limite, setLimite] = useState(porSeccion)
  const [abierta, setAbierta] = useState(null)
  const [busqueda, setBusqueda] = useState('')

  useEffect(() => alCambiarPreferencias(() => setLimite(porSeccion())), [])
  const { uno, varios } = useTerminos()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user.id ?? null)
    })
  }, [])

  const grupos = useMemo(() => agruparLeads(leads, config, userId), [leads, config, userId])

  const totalVisibles = Object.values(grupos).reduce((acc, g) => acc + g.length, 0)

  // RF10: los destacados van arriba de todo, con el color de su grupo de urgencia.
  // Los contadores de arriba los siguen contando en su grupo.
  const destacados = useMemo(
    () => secciones.flatMap(({ clave }) => grupos[clave].filter((l) => l.destacado).map((lead) => ({ lead, grupo: clave }))),
    [grupos],
  )

  // leads que vencen hoy o mañana: les falta 1 día o menos para el plazo
  const vencenPronto = useMemo(() => {
    if (!config?.vencimiento_habilitado) return 0
    const plazo = config.dias_vencimiento_lead
    return grupos.porVencer.filter((l) => l.dias >= plazo - 1).length
  }, [grupos, config])

  // el lead nuevo aparece cuando App vuelve a pedir la lista
  function alCrearLead() {
    onCambio()
    setModalAbierto(false)
  }

  // cada sección muestra hasta `limite` contactos (0 = todos); el resto, con "Ver todos"
  const recortar = (lista) => (limite ? lista.slice(0, limite) : lista)

  function abrir(clave) {
    setBusqueda('')
    setAbierta(clave)
    window.scrollTo({ top: 0 })
  }

  function irAPorVencer() {
    abrir('porVencer')
  }

  // vista completa de una sección (o de los destacados), con buscador
  const seccionAbierta =
    abierta === 'destacados'
      ? { titulo: '★ Destacados', badge: 'bg-purple-bg text-purple-text', items: destacados }
      : abierta
        ? { ...secciones.find((x) => x.clave === abierta), items: grupos[abierta].map((lead) => ({ lead, grupo: abierta })) }
        : null
  const filtro = busqueda.trim().toLowerCase()
  const itemsAbiertos = seccionAbierta ? seccionAbierta.items.filter(({ lead }) => !filtro || textoDe(lead).includes(filtro)) : []

  const subtitulo = config?.vencimiento_habilitado
    ? `Vencen a los ${config.dias_vencimiento_lead} ${config.dias_habiles ? 'días hábiles' : 'días'} sin contacto · ordenados por urgencia`
    : 'Ordenados automáticamente por urgencia'

  return (
    <div className="p-5">
      {seccionAbierta ? (
        <>
          <button onClick={() => setAbierta(null)} className="text-xs text-text-secondary hover:text-text-primary mb-3">
            ← Volver a Mis {varios}
          </button>
          <div className="flex items-center justify-between gap-3 mb-1">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold tracking-tight text-text-primary">{seccionAbierta.titulo}</h1>
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${seccionAbierta.badge}`}>
                {seccionAbierta.items.length}
              </span>
            </div>
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar en esta lista..."
              autoFocus
              className="w-64 text-xs px-3 py-1.5 rounded-md border border-border-secondary bg-bg-secondary text-text-primary focus:outline-none focus:border-accent focus:bg-bg-primary"
            />
          </div>
          <p className="text-xs text-text-secondary mb-4">{seccionAbierta.ayuda || 'Ordenados por urgencia'}</p>
          {itemsAbiertos.map(({ lead, grupo }) => (
            <LeadCard key={lead.id} lead={lead} grupo={grupo} onAbrir={onAbrirLead} />
          ))}
          {itemsAbiertos.length === 0 && (
            <p className="text-center py-8 text-xs text-text-tertiary">
              {filtro ? `Ningún ${uno} de esta lista coincide con "${busqueda.trim()}".` : `No hay ${varios} en esta lista.`}
            </p>
          )}
        </>
      ) : (
        <>
          <div className="flex items-start justify-between gap-3 mb-5">
            <div>
              <h1 className="text-base font-semibold tracking-tight text-text-primary mb-[3px]">Mis {varios}</h1>
              <p className="text-xs text-text-secondary">{subtitulo}</p>
            </div>
            <button
              onClick={() => setImportando(true)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-border-secondary bg-bg-primary text-text-secondary hover:text-text-primary"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path d="M12 15V3m0 0L8 7m4-4l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4 14v5a2 2 0 002 2h12a2 2 0 002-2v-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Importar desde Excel
            </button>
          </div>

          {cargando && <p className="text-sm text-text-secondary">Cargando...</p>}

          {error && <p className="text-sm text-red-text bg-red-bg border border-red-border rounded-md px-3 py-2">{error}</p>}

          {!cargando && !error && (
            <>
              {vencenPronto > 0 && (
                <div className="flex items-center justify-between gap-2.5 bg-green-bg border border-green-border rounded-md px-4 py-[11px] mb-4">
                  <span className="text-xs text-green-text">
                    {vencenPronto} {vencenPronto === 1 ? `${uno} vence` : `${varios} vencen`} hoy o mañana
                  </span>
                  <button onClick={irAPorVencer} className="text-xs font-medium text-green-text whitespace-nowrap">
                    Ver urgentes →
                  </button>
                </div>
              )}

              <div className="grid grid-cols-4 gap-2 mb-5">
                {tarjetas.map(({ clave, label, color }) => (
                  <button
                    key={clave}
                    onClick={() => abrir(clave)}
                    title="Ver todos"
                    className="text-left bg-bg-secondary rounded-md px-3.5 py-2.5 hover:bg-bg-tertiary transition-colors"
                  >
                    <div className="text-[11px] text-text-secondary mb-0.5">{label}</div>
                    <div className={`text-xl font-semibold ${color}`}>{grupos[clave].length}</div>
                  </button>
                ))}
              </div>

              {totalVisibles === 0 && <p className="text-sm text-text-secondary">Todavía no tenés {varios} cargados.</p>}

              {destacados.length > 0 && (
                <div id="seccion-destacados" className="mb-4">
                  <Titulo titulo="★ Destacados" badge="bg-purple-bg text-purple-text" cantidad={destacados.length} />
                  {recortar(destacados).map(({ lead, grupo }) => (
                    <LeadCard key={lead.id} lead={lead} grupo={grupo} onAbrir={onAbrirLead} />
                  ))}
                  <VerTodos total={destacados.length} limite={limite} onClick={() => abrir('destacados')} />
                </div>
              )}

              {secciones.map(({ clave, titulo, badge, ayuda }) => {
                const lista = grupos[clave].filter((l) => !l.destacado)
                if (!lista.length) return null
                return (
                  <div key={clave} id={`seccion-${clave}`} className="mb-4">
                    <Titulo titulo={titulo} badge={badge} cantidad={lista.length} ayuda={ayuda} />
                    {recortar(lista).map((lead) => (
                      <LeadCard key={lead.id} lead={lead} grupo={clave} onAbrir={onAbrirLead} />
                    ))}
                    <VerTodos total={lista.length} limite={limite} onClick={() => abrir(clave)} />
                  </div>
                )
              })}
            </>
          )}
        </>
      )}

      <button
        onClick={() => setModalAbierto(true)}
        title={`Agregar ${uno}`}
        className="fixed bottom-6 right-6 w-13 h-13 rounded-full bg-accent hover:bg-accent-dark text-white flex items-center justify-center z-40 transition-transform hover:-translate-y-0.5"
        style={{ boxShadow: '0 6px 20px rgba(83, 74, 183, 0.4)' }}
      >
        <svg width="22" height="22" viewBox="0 0 14 14" fill="none">
          <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {modalAbierto && <NuevoLeadModal onCerrar={() => setModalAbierto(false)} onCreado={alCrearLead} />}

      {importando && (
        <Suspense fallback={null}>
          <ImportarLeads rol={rol} userId={userId} onCerrar={() => setImportando(false)} onImportado={onCambio} />
        </Suspense>
      )}
    </div>
  )
}
