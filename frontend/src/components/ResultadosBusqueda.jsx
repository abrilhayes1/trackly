import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'
import { diasDesde } from '../lib/urgencia'
import { colorPorInteres, sinCategoria, etiquetaInteres } from '../lib/interes'

const colorEstado = {
  activo: 'bg-avatar-bg text-urgent-blue',
  vencido: 'bg-amber-bg text-amber-text',
  archivo: 'bg-bg-tertiary text-text-secondary',
  ganado: 'bg-green-bg text-green-text',
  perdido: 'bg-red-bg text-red-text',
}

function Resaltado({ texto, q }) {
  if (!texto) return null
  const escapado = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const partes = texto.split(new RegExp(`(${escapado})`, 'gi'))
  return partes.map((parte, i) =>
    parte.toLowerCase() === q.toLowerCase() ? (
      <mark key={i} className="bg-[#dbeafe] text-[#1e40af] rounded-sm px-0.5">
        {parte}
      </mark>
    ) : (
      parte
    )
  )
}

function iniciales(nombre) {
  return nombre
    .split(/[\s,]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('')
}

function Dato({ label, valor }) {
  return (
    <div className="bg-bg-secondary rounded-md px-2 py-1.5">
      <div className="text-[10px] text-text-tertiary mb-px">{label}</div>
      <div className="text-[11px] font-medium text-text-primary">{valor}</div>
    </div>
  )
}

export default function ResultadosBusqueda({ q, userId }) {
  const [resultados, setResultados] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelado = false
    setCargando(true)

    // esperamos 300 ms después de la última tecla para no pedir en cada letra
    const espera = setTimeout(() => {
      apiFetch(`/api/leads/buscar?q=${encodeURIComponent(q)}`)
        .then((data) => {
          if (cancelado) return
          setResultados(data)
          setError(null)
        })
        .catch((e) => {
          if (!cancelado) setError(e.message)
        })
        .finally(() => {
          if (!cancelado) setCargando(false)
        })
    }, 300)

    return () => {
      cancelado = true
      clearTimeout(espera)
    }
  }, [q])

  return (
    <div className="p-5">
      <h1 className="text-base font-semibold tracking-tight text-text-primary mb-[3px]">
        Resultados de búsqueda
      </h1>
      <p className="text-xs text-text-secondary mb-4">
        {cargando
          ? 'Buscando...'
          : `${resultados.length} resultado${resultados.length !== 1 ? 's' : ''} para "${q}"`}
      </p>

      {error && (
        <p className="text-sm text-red-text bg-red-bg border border-red-border rounded-md px-3 py-2 mb-3">
          {error}
        </p>
      )}

      {!cargando && !error && resultados.length === 0 && (
        <p className="text-sm text-text-tertiary text-center py-8">
          No se encontraron contactos.
        </p>
      )}

      {resultados.map((lead) => {
        const colores = lead.interes ? colorPorInteres[lead.interes] : sinCategoria
        const etiqueta = lead.interes ? etiquetaInteres[lead.interes] : 'Sin categoría'
        const esMio = lead.asesor_id === userId

        return (
          <div
            key={lead.id}
            className="border border-border-tertiary rounded-(--radius-lg) px-4 py-3.5 mb-2 hover:border-border-secondary hover:bg-bg-secondary transition-colors"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-avatar-bg text-avatar-text flex items-center justify-center text-[11px] font-semibold shrink-0">
                {iniciales(lead.nombre)}
              </div>
              <div className="min-w-0">
                <div className="text-[13px] font-medium text-text-primary">
                  <Resaltado texto={lead.nombre} q={q} />
                </div>
                <div className="text-[11px] text-text-secondary">
                  <Resaltado texto={lead.telefono} q={q} />
                  {lead.telefono && lead.email ? ' · ' : ''}
                  <Resaltado texto={lead.email} q={q} />
                </div>
              </div>
              <span
                className={`ml-auto text-[10px] font-medium px-[7px] py-0.5 rounded-full ${colorEstado[lead.estado]}`}
              >
                {lead.estado}
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-2">
              <span
                className={`text-[10px] px-1.5 py-px rounded-full border ${colores.bg} ${colores.text} ${colores.border}`}
              >
                {etiqueta}
              </span>
              {lead.origen && (
                <span className="text-[10px] px-1.5 py-px rounded-full border bg-bg-secondary text-text-secondary border-border-tertiary">
                  {lead.origen}
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              <Dato
                label="Último contacto"
                valor={
                  lead.ultimo_contacto
                    ? diasDesde(lead.ultimo_contacto) === 0
                      ? 'Hoy'
                      : `Hace ${diasDesde(lead.ultimo_contacto)} días`
                    : 'Sin contactar'
                }
              />
              <Dato
                label="Ingresó"
                valor={new Date(lead.fecha_ingreso).toLocaleDateString('es-AR', {
                  day: 'numeric',
                  month: 'short',
                })}
              />
              <Dato
                label="Asesor"
                valor={esMio ? 'Vos' : lead.asesor?.nombre || 'Sin asignar'}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}