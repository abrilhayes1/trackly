import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../lib/api'
import { calcularAlertas } from '../lib/alertas'
import { colorPorInteres, sinCategoria, etiquetaInteres } from '../lib/interes'
import { fechaHoraCorta } from '../lib/formato'

const secciones = [
  { clave: 'vencenHoy', titulo: 'Vencen hoy', badge: 'bg-red-bg text-urgent-red', dot: 'bg-dot-red' },
  { clave: 'porVencer', titulo: 'Por vencer', badge: 'bg-amber-bg text-urgent-amber', dot: 'bg-dot-amber' },
  { clave: 'recordatorios', titulo: 'Recordatorios', badge: 'bg-avatar-bg text-urgent-blue', dot: 'bg-dot-blue' },
]

function hhmm(fecha) {
  const dos = (n) => String(n).padStart(2, '0')
  return `${dos(fecha.getHours())}:${dos(fecha.getMinutes())}`
}

// texto y color del lado derecho de cada tarjeta, según el tipo de alerta
function etiquetaAlerta(clave, lead, ahora) {
  if (clave === 'vencenHoy') {
    return lead.diasPasados === 0
      ? { texto: 'vence hoy', color: 'text-urgent-red' }
      : { texto: `venció hace ${lead.diasPasados}d`, color: 'text-urgent-red' }
  }
  if (clave === 'porVencer') {
    return {
      texto: lead.diasRestantes === 1 ? 'vence mañana' : `vence en ${lead.diasRestantes} días`,
      color: 'text-urgent-amber',
    }
  }
  if (lead.atrasado) {
    return { texto: `atrasado · ${fechaHoraCorta(lead.fechaRecordatorio)}`, color: 'text-urgent-red' }
  }
  return {
    texto: hhmm(lead.fechaRecordatorio),
    color: lead.fechaRecordatorio < ahora ? 'text-urgent-amber' : 'text-urgent-blue',
  }
}

function AlertaCard({ lead, seccion, ahora, onAbrir }) {
  const etiqueta = etiquetaAlerta(seccion.clave, lead, ahora)
  const colores = lead.interes ? colorPorInteres[lead.interes] : sinCategoria

  return (
    <div
      onClick={() => onAbrir(lead)}
      className="flex items-center gap-[9px] bg-bg-primary border border-border-tertiary rounded-(--radius-lg) px-[0.9rem] py-[0.65rem] mb-1.5 cursor-pointer hover:border-accent transition-colors"
    >
      <span className={`w-2 h-2 rounded-full shrink-0 ${seccion.dot}`} />

      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium text-text-primary">{lead.nombre}</div>
        <div className="text-[11px] text-text-secondary truncate mt-px">
          {[lead.telefono, lead.origen].filter(Boolean).join(' · ') || 'Sin datos de contacto'}
        </div>
      </div>

      <div className="flex flex-col items-end gap-[3px] shrink-0">
        <span className={`text-[11px] font-medium ${etiqueta.color}`}>{etiqueta.texto}</span>
        <span
          className={`text-[10px] px-1.5 py-px rounded-full border ${colores.bg} ${colores.text} ${colores.border}`}
        >
          {lead.interes ? etiquetaInteres[lead.interes] : 'Sin categoría'}
        </span>
      </div>
    </div>
  )
}

export default function AlertasHoy({ userId, onAbrirLead, cambios }) {
  const [leads, setLeads] = useState([])
  const [config, setConfig] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  // se carga al abrir la pantalla y cada vez que se modifica un lead desde la tarjeta
  useEffect(() => {
    Promise.all([apiFetch('/api/leads'), apiFetch('/api/config')])
      .then(([leadsData, configData]) => {
        setLeads(leadsData)
        setConfig(configData)
        setError(null)
      })
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false))
  }, [cambios])

  const ahora = useMemo(() => new Date(), [leads, config])
  const alertas = useMemo(
    () => calcularAlertas(leads, config, userId, ahora),
    [leads, config, userId, ahora]
  )

  const total = secciones.reduce((acc, s) => acc + alertas[s.clave].length, 0)

  return (
    <div className="p-5">
      <h1 className="text-base font-semibold tracking-tight text-text-primary mb-[3px]">
        Alertas de hoy
      </h1>
      <p className="text-xs text-text-secondary mb-5">Lo que necesitás atender hoy</p>

      {cargando && <p className="text-sm text-text-secondary">Cargando...</p>}

      {error && (
        <p className="text-sm text-red-text bg-red-bg border border-red-border rounded-md px-3 py-2">
          {error}
        </p>
      )}

      {!cargando && !error && total === 0 && (
        <p className="text-sm text-text-secondary">
          No tenés nada urgente para hoy. Los leads por vencer y los recordatorios del día van a
          aparecer acá.
        </p>
      )}

      {!cargando &&
        !error &&
        secciones.map((seccion) =>
          alertas[seccion.clave].length > 0 ? (
            <div key={seccion.clave} className="mb-4">
              <div className="flex items-center gap-1.5 mb-1.5 mt-[1.1rem]">
                <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-text-secondary">
                  {seccion.titulo}
                </span>
                <span
                  className={`text-[10px] font-medium px-[7px] py-0.5 rounded-full ${seccion.badge}`}
                >
                  {alertas[seccion.clave].length}
                </span>
              </div>
              {alertas[seccion.clave].map((lead) => (
                <AlertaCard
                  key={lead.id}
                  lead={lead}
                  seccion={seccion}
                  ahora={ahora}
                  onAbrir={onAbrirLead}
                />
              ))}
            </div>
          ) : null
        )}
    </div>
  )
}
