import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { apiFetch } from '../lib/api'
import { agruparLeads } from '../lib/urgencia'
import LeadCard from '../components/LeadCard'
import NuevoLeadModal from '../components/NuevoLeadModal'

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

export default function MisLeads({ onAbrirLead, cambios }) {
  const [leads, setLeads] = useState([])
  const [config, setConfig] = useState(null)
  const [userId, setUserId] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [modalAbierto, setModalAbierto] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserId(data.session?.user.id ?? null)
    })
  }, [])

  const cargar = useCallback(() => {
    return Promise.all([apiFetch('/api/leads'), apiFetch('/api/config')])
      .then(([leadsData, configData]) => {
        setLeads(leadsData)
        setConfig(configData)
        setError(null)
      })
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false))
  }, [])

  // se vuelve a cargar al abrir la pantalla y cada vez que se modifica un lead desde la tarjeta
  useEffect(() => {
    cargar()
  }, [cargar, cambios])

  const grupos = useMemo(
    () => agruparLeads(leads, config, userId),
    [leads, config, userId]
  )

  const totalVisibles = Object.values(grupos).reduce((acc, g) => acc + g.length, 0)

  // leads que vencen hoy o mañana: les falta 1 día o menos para el plazo
  const vencenPronto = useMemo(() => {
    if (!config?.vencimiento_habilitado) return 0
    const plazo = config.dias_vencimiento_lead
    return grupos.porVencer.filter((l) => l.dias >= plazo - 1).length
  }, [grupos, config])

  function alCrearLead(nuevoLead) {
    setLeads((actuales) => [nuevoLead, ...actuales])
    setModalAbierto(false)
  }

  function irAPorVencer() {
    document
      .getElementById('seccion-porVencer')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const subtitulo = config?.vencimiento_habilitado
    ? `Vencen a los ${config.dias_vencimiento_lead} días sin contacto · ordenados por urgencia`
    : 'Ordenados automáticamente por urgencia'

  return (
    <div className="p-5">
      <h1 className="text-base font-semibold tracking-tight text-text-primary mb-[3px]">
        Mis leads
      </h1>
      <p className="text-xs text-text-secondary mb-5">{subtitulo}</p>

      {cargando && <p className="text-sm text-text-secondary">Cargando...</p>}

      {error && (
        <p className="text-sm text-red-text bg-red-bg border border-red-border rounded-md px-3 py-2">
          {error}
        </p>
      )}

      {!cargando && !error && (
        <>
          {vencenPronto > 0 && (
            <div className="flex items-center justify-between gap-2.5 bg-green-bg border border-green-border rounded-md px-4 py-[11px] mb-4">
              <span className="text-xs text-green-text">
                {vencenPronto} {vencenPronto === 1 ? 'lead vence' : 'leads vencen'} hoy o mañana
              </span>
              <button
                onClick={irAPorVencer}
                className="text-xs font-medium text-[#0F6E56] whitespace-nowrap"
              >
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

          {totalVisibles === 0 && (
            <p className="text-sm text-text-secondary">Todavía no tenés leads cargados.</p>
          )}

          {secciones.map(({ clave, titulo, badge }) =>
            grupos[clave].length > 0 ? (
              <div key={clave} id={`seccion-${clave}`} className="mb-4">
                <div className="flex items-center gap-1.5 mb-1.5 mt-[1.1rem]">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-text-secondary">
                    {titulo}
                  </span>
                  <span className={`text-[10px] font-medium px-[7px] py-0.5 rounded-full ${badge}`}>
                    {grupos[clave].length}
                  </span>
                </div>
                {grupos[clave].map((lead) => (
                  <LeadCard key={lead.id} lead={lead} grupo={clave} onAbrir={onAbrirLead} />
                ))}
              </div>
            ) : null
          )}
        </>
      )}

      <button
        onClick={() => setModalAbierto(true)}
        title="Agregar lead"
        className="fixed bottom-6 right-6 w-13 h-13 rounded-full bg-accent hover:bg-accent-dark text-white flex items-center justify-center z-40 transition-transform hover:-translate-y-0.5"
        style={{ boxShadow: '0 6px 20px rgba(83, 74, 183, 0.4)' }}
      >
        <svg width="22" height="22" viewBox="0 0 14 14" fill="none">
          <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {modalAbierto && (
        <NuevoLeadModal
          onCerrar={() => setModalAbierto(false)}
          onCreado={alCrearLead}
        />
      )}
    </div>
  )
}