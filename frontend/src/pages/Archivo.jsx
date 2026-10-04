import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../lib/api'
import { iniciales } from '../lib/formato'
import { colorPorInteres, sinCategoria, etiquetaInteres } from '../lib/interes'
import { textoVencimiento, ordenarArchivo, claveInteres } from '../lib/archivo'

function primerNombre(nombre) {
  return (nombre || '').split(' ')[0]
}

function Chip({ activo, onClick, children, conAvatar = false }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 text-[11px] rounded-full border ${
        conAvatar ? 'pl-[5px] pr-2.5 py-1' : 'px-3 py-1'
      } ${
        activo
          ? 'bg-accent text-white border-accent'
          : 'bg-bg-primary text-text-secondary border-border-secondary'
      }`}
    >
      {children}
    </button>
  )
}

export default function Archivo({ userId, rol, onAbrirLead, cambios, onReactivado }) {
  const [leads, setLeads] = useState([])
  const [config, setConfig] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [filtroInteres, setFiltroInteres] = useState('')
  const [filtroAsesor, setFiltroAsesor] = useState('')
  const [reactivando, setReactivando] = useState(null)
  const [mensaje, setMensaje] = useState(null)
  const [errorAccion, setErrorAccion] = useState(null)

  const esLider = rol === 'lider'

  // se carga al abrir la pantalla y cada vez que algo cambia (por ejemplo, un lead reactivado)
  useEffect(() => {
    Promise.all([apiFetch('/api/leads?estado=vencido,archivo'), apiFetch('/api/config')])
      .then(([leadsData, configData]) => {
        setLeads(leadsData)
        setConfig(configData)
        setError(null)
      })
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false))
  }, [cambios])

  const plazo = config?.vencimiento_habilitado ? config.dias_vencimiento_lead : null
  const ahora = useMemo(() => new Date(), [leads, config])

  const ordenados = useMemo(
    () => [...leads].sort(ordenarArchivo(plazo, ahora)),
    [leads, plazo, ahora]
  )

  // niveles de interés que realmente aparecen, en el orden de siempre
  const niveles = useMemo(() => {
    const presentes = new Set(leads.map(claveInteres))
    return [...Object.keys(etiquetaInteres), 'sin'].filter((n) => presentes.has(n))
  }, [leads])

  // dueños que tienen leads en el archivo (filtro por asesor, solo si hay más de uno)
  const duenios = useMemo(() => {
    const mapa = new Map()
    leads.forEach((l) => {
      if (l.asesor_id && !mapa.has(l.asesor_id)) mapa.set(l.asesor_id, l.asesor?.nombre || 'Sin nombre')
    })
    return [...mapa]
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
  }, [leads])

  const interesActivo = niveles.includes(filtroInteres) ? filtroInteres : ''
  const asesorActivo = duenios.some((d) => d.id === filtroAsesor) ? filtroAsesor : ''

  const visibles = ordenados.filter(
    (l) =>
      (!interesActivo || claveInteres(l) === interesActivo) &&
      (!asesorActivo || l.asesor_id === asesorActivo)
  )

  async function reactivar(lead) {
    setReactivando(lead.id)
    setErrorAccion(null)
    setMensaje(null)
    try {
      await apiFetch(`/api/leads/${lead.id}/reactivar`, { method: 'POST' })
      setLeads((actuales) => actuales.filter((l) => l.id !== lead.id))
      setMensaje(
        `Reactivaste a ${lead.nombre}: ahora está en Mis leads, con el conteo de días en cero.`
      )
      onReactivado()
    } catch (e) {
      setErrorAccion(e.message)
    } finally {
      setReactivando(null)
    }
  }

  const total = leads.length
  const archivados = leads.filter((l) => l.estado === 'archivo').length
  const vencidos = total - archivados

  return (
    <div className="p-5">
      <h1 className="text-base font-semibold tracking-tight text-text-primary mb-[3px]">
        {esLider ? 'Archivo del equipo' : 'Archivo de leads'}
      </h1>
      <p className="text-xs text-text-secondary mb-5">
        {vencidos} vencido{vencidos === 1 ? '' : 's'}
        {archivados > 0 ? ` · ${archivados} archivado${archivados === 1 ? '' : 's'}` : ''} · cualquier
        asesor puede reactivarlos
      </p>

      {cargando && <p className="text-sm text-text-secondary">Cargando...</p>}

      {error && (
        <p className="text-sm text-red-text bg-red-bg border border-red-border rounded-md px-3 py-2">
          {error}
        </p>
      )}

      {mensaje && (
        <p className="text-xs text-green-text bg-green-bg border border-green-border rounded-md px-3 py-2 mb-3">
          {mensaje}
        </p>
      )}

      {errorAccion && (
        <p className="text-xs text-red-text bg-red-bg border border-red-border rounded-md px-3 py-2 mb-3">
          {errorAccion}
        </p>
      )}

      {!cargando && !error && total > 0 && (
        <>
          <div className="flex flex-wrap gap-[5px] mb-3">
            <Chip activo={interesActivo === ''} onClick={() => setFiltroInteres('')}>
              Todos
            </Chip>
            {niveles.map((n) => (
              <Chip key={n} activo={interesActivo === n} onClick={() => setFiltroInteres(n)}>
                {n === 'sin' ? 'Sin categoría' : etiquetaInteres[n]}
              </Chip>
            ))}
          </div>

          {duenios.length > 1 && (
            <div className="flex flex-wrap items-center gap-[5px] mb-4">
              <Chip activo={asesorActivo === ''} onClick={() => setFiltroAsesor('')}>
                De todos
              </Chip>
              {duenios.map((d) => (
                <Chip
                  key={d.id}
                  conAvatar
                  activo={asesorActivo === d.id}
                  onClick={() => setFiltroAsesor(d.id)}
                >
                  <span className="w-5 h-5 rounded-full bg-avatar-bg text-avatar-text inline-flex items-center justify-center text-[8px] font-semibold shrink-0">
                    {iniciales(d.nombre)}
                  </span>
                  {d.id === userId ? 'Míos' : primerNombre(d.nombre)}
                </Chip>
              ))}
            </div>
          )}
        </>
      )}

      {!cargando && !error && total === 0 && (
        <p className="text-center py-8 text-xs text-text-tertiary">
          Todavía no hay leads vencidos. Cuando un lead pase el plazo sin contacto, aparece acá.
        </p>
      )}

      {!cargando && !error && total > 0 && visibles.length === 0 && (
        <p className="text-center py-8 text-xs text-text-tertiary">
          Sin leads vencidos para este filtro.
        </p>
      )}

      {!cargando &&
        !error &&
        visibles.map((lead) => {
          const colores = lead.interes ? colorPorInteres[lead.interes] : sinCategoria
          const esMio = lead.asesor_id === userId
          return (
            <div
              key={lead.id}
              onClick={() => onAbrirLead(lead)}
              className="flex items-center gap-2 bg-bg-primary border border-border-tertiary rounded-(--radius-lg) px-[0.9rem] py-[0.65rem] mb-1.5 cursor-pointer hover:border-accent transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-text-primary">{lead.nombre}</div>
                <div className="text-[11px] text-text-secondary truncate mt-px">
                  {textoVencimiento(lead, plazo, ahora)}
                  {lead.origen ? ` · ${lead.origen}` : ''}
                  {!esMio && lead.asesor?.nombre ? ` · de ${primerNombre(lead.asesor.nombre)}` : ''}
                </div>
              </div>
              <span
                className={`text-[10px] px-1.5 py-px rounded-full border shrink-0 ${colores.bg} ${colores.text} ${colores.border}`}
              >
                {lead.interes ? etiquetaInteres[lead.interes] : 'Sin categoría'}
              </span>
              <button
                disabled={reactivando === lead.id}
                onClick={(e) => {
                  e.stopPropagation()
                  reactivar(lead)
                }}
                className="shrink-0 text-[11px] px-[9px] py-[3px] rounded-full border border-border-secondary bg-bg-primary text-text-secondary hover:bg-green-bg hover:text-green-text hover:border-green-border disabled:opacity-50"
              >
                {reactivando === lead.id ? 'Reactivando...' : 'Reactivar'}
              </button>
            </div>
          )
        })}
    </div>
  )
}
