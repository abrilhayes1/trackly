import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { agruparLeads } from '../lib/urgencia'
import LeadCard from '../components/LeadCard'
import NuevoLeadModal from '../components/NuevoLeadModal'
// la ventana de importar (y las librerías para leer Excel) se descarga recién al abrirla
const ImportarLeads = lazy(() => import('../components/ImportarLeads'))
import { useConfigEquipo, useTerminos } from '../lib/configEquipo'
import { useLeadsEquipo } from '../lib/leadsEquipo'

const secciones = [
  { clave: 'porVencer', titulo: 'Por vencer', badge: 'bg-red-bg text-urgent-red' },
  { clave: 'estaSemana', titulo: 'Esta semana', badge: 'bg-amber-bg text-urgent-amber' },
  { clave: 'sinContactar', titulo: 'Sin contactar', badge: 'bg-avatar-bg text-urgent-blue' },
  { clave: 'alDia', titulo: 'Al día', badge: 'bg-green-bg text-green-text' },
]

const tarjetas = [
  { clave: 'porVencer', label: 'Por vencer', color: 'text-urgent-red' },
  { clave: 'estaSemana', label: 'Esta semana', color: 'text-urgent-amber' },
  { clave: 'sinContactar', label: 'Sin contactar', color: 'text-urgent-blue' },
]

export default function MisLeads({ rol, onAbrirLead, onCambio }) {
  // la lista y la configuración las carga App una sola vez para toda la app
  const { leads, listo, error } = useLeadsEquipo()
  const { config } = useConfigEquipo()
  const cargando = !listo
  const [userId, setUserId] = useState(null)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [importando, setImportando] = useState(false)
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

  function irAPorVencer() {
    document.getElementById('seccion-porVencer')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const subtitulo = config?.vencimiento_habilitado
    ? `Vencen a los ${config.dias_vencimiento_lead} días sin contacto · ordenados por urgencia`
    : 'Ordenados automáticamente por urgencia'

  return (
    <div className="p-5">
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

          <div className="grid grid-cols-3 gap-2 mb-5">
            {tarjetas.map(({ clave, label, color }) => (
              <div key={clave} className="bg-bg-secondary rounded-md px-3.5 py-2.5">
                <div className="text-[11px] text-text-secondary mb-0.5">{label}</div>
                <div className={`text-xl font-semibold ${color}`}>{grupos[clave].length}</div>
              </div>
            ))}
          </div>

          {totalVisibles === 0 && <p className="text-sm text-text-secondary">Todavía no tenés {varios} cargados.</p>}

          {destacados.length > 0 && (
            <div id="seccion-destacados" className="mb-4">
              <div className="flex items-center gap-1.5 mb-1.5 mt-[1.1rem]">
                <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-text-secondary">★ Destacados</span>
                <span className="text-[10px] font-medium px-[7px] py-0.5 rounded-full bg-purple-bg text-purple-text">
                  {destacados.length}
                </span>
              </div>
              {destacados.map(({ lead, grupo }) => (
                <LeadCard key={lead.id} lead={lead} grupo={grupo} onAbrir={onAbrirLead} />
              ))}
            </div>
          )}

          {secciones.map(({ clave, titulo, badge }) =>
            grupos[clave].some((l) => !l.destacado) ? (
              <div key={clave} id={`seccion-${clave}`} className="mb-4">
                <div className="flex items-center gap-1.5 mb-1.5 mt-[1.1rem]">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-text-secondary">{titulo}</span>
                  <span className={`text-[10px] font-medium px-[7px] py-0.5 rounded-full ${badge}`}>
                    {grupos[clave].filter((l) => !l.destacado).length}
                  </span>
                </div>
                {grupos[clave]
                  .filter((l) => !l.destacado)
                  .map((lead) => (
                    <LeadCard key={lead.id} lead={lead} grupo={clave} onAbrir={onAbrirLead} />
                  ))}
              </div>
            ) : null,
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
