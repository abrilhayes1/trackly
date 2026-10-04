import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../lib/api'
import { iniciales, fechaHoraCorta } from '../lib/formato'
import { etiquetaModalidad, formatearImporte } from '../lib/cierre'

const textos = {
  ganado: {
    titulo: 'Casos exitosos',
    tituloLider: 'Casos exitosos del equipo',
    sub: 'Leads que se convirtieron en alumnos',
    subLider: 'Alumnos ganados por el equipo',
    vacio: (filtrado) =>
      `Aún no hay casos exitosos${filtrado ? ' para este asesor' : ''}. Cerrá un lead como ganado desde la tarjeta de contacto.`,
  },
  perdido: {
    titulo: 'Cerrados perdidos',
    tituloLider: 'Cerrados perdidos del equipo',
    sub: 'Leads que no convirtieron',
    subLider: 'Leads que no convirtieron en el equipo',
    vacio: (filtrado) =>
      `Aún no hay cierres perdidos${filtrado ? ' para este asesor' : ''} registrados.`,
  },
}

function Chip({ children, clases = 'bg-bg-secondary text-text-secondary border-border-tertiary' }) {
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${clases}`}>{children}</span>
  )
}

function Avatar({ nombre, tamano }) {
  return (
    <span
      className={`${tamano} rounded-full bg-avatar-bg text-avatar-text inline-flex items-center justify-center font-semibold shrink-0`}
    >
      {iniciales(nombre)}
    </span>
  )
}

function primerNombre(nombre) {
  return (nombre || '').split(' ')[0]
}

export default function CasosCerrados({ tipo, rol, onAbrirLead, cambios }) {
  const [cierres, setCierres] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [filtro, setFiltro] = useState('')

  const t = textos[tipo]
  const esLider = rol === 'lider'

  // se carga al abrir la pantalla y cada vez que se modifica un lead desde la tarjeta
  useEffect(() => {
    apiFetch(`/api/cierres?tipo=${tipo}`)
      .then((datos) => {
        setCierres(datos)
        setError(null)
      })
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false))
  }, [tipo, cambios])

  // asesores que tienen cierres en esta lista (para el filtro del líder)
  const asesores = useMemo(() => {
    const mapa = new Map()
    cierres.forEach((c) => {
      const id = c.lead?.asesor_id
      if (id && !mapa.has(id)) mapa.set(id, c.lead?.asesor?.nombre || 'Sin nombre')
    })
    return [...mapa]
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
  }, [cierres])

  // si el asesor filtrado ya no tiene cierres en la lista, se vuelve a "Todos"
  const filtroActivo = asesores.some((a) => a.id === filtro) ? filtro : ''
  const mostrarFiltro = esLider && asesores.length > 1

  const visibles = cierres.filter(
    (c) => !filtroActivo || c.lead?.asesor_id === filtroActivo
  )

  return (
    <div className="p-5">
      <h1 className="text-base font-semibold tracking-tight text-text-primary mb-[3px]">
        {esLider ? t.tituloLider : t.titulo}
      </h1>
      <p className="text-xs text-text-secondary mb-5">{esLider ? t.subLider : t.sub}</p>

      {cargando && <p className="text-sm text-text-secondary">Cargando...</p>}

      {error && (
        <p className="text-sm text-red-text bg-red-bg border border-red-border rounded-md px-3 py-2">
          {error}
        </p>
      )}

      {!cargando && !error && mostrarFiltro && (
        <div className="flex flex-wrap items-center gap-[5px] mb-[1.1rem]">
          <button
            onClick={() => setFiltro('')}
            className={`text-[11px] px-3 py-1 rounded-full border ${
              filtroActivo === ''
                ? 'bg-accent text-white border-accent'
                : 'bg-bg-primary text-text-secondary border-border-secondary'
            }`}
          >
            Todos
          </button>
          {asesores.map((a) => (
            <button
              key={a.id}
              onClick={() => setFiltro(a.id)}
              className={`flex items-center gap-1.5 text-[11px] pl-[5px] pr-2.5 py-1 rounded-full border ${
                filtroActivo === a.id
                  ? 'bg-accent text-white border-accent'
                  : 'bg-bg-primary text-text-secondary border-border-secondary'
              }`}
            >
              <Avatar nombre={a.nombre} tamano="w-5 h-5 text-[8px]" />
              {primerNombre(a.nombre)}
            </button>
          ))}
        </div>
      )}

      {!cargando && !error && visibles.length === 0 && (
        <p className="text-center py-8 text-xs text-text-tertiary">{t.vacio(filtroActivo !== '')}</p>
      )}

      {!cargando &&
        !error &&
        visibles.map((c) => {
          const ganado = c.tipo === 'ganado'
          return (
            <div
              key={c.id}
              onClick={() => c.lead && onAbrirLead(c.lead)}
              className={`bg-bg-primary border border-border-tertiary border-l-[3px] ${
                ganado ? 'border-l-green-border' : 'border-l-red-border'
              } rounded-(--radius-lg) px-4 py-3 mb-1.5 ${
                c.lead ? 'cursor-pointer hover:bg-bg-secondary' : ''
              }`}
            >
              <div className="flex items-center gap-2 mb-[3px]">
                <Avatar nombre={c.lead?.nombre} tamano="w-7 h-7 text-[10px]" />
                <div className="text-[13px] font-medium text-text-primary">
                  {c.lead?.nombre || 'Lead no disponible'}
                </div>
                {esLider && c.lead?.asesor?.nombre && (
                  <span className="ml-auto inline-flex items-center gap-1.5">
                    <Avatar nombre={c.lead.asesor.nombre} tamano="w-[22px] h-[22px] text-[8px]" />
                    <span className="text-xs text-text-secondary">
                      {primerNombre(c.lead.asesor.nombre)}
                    </span>
                  </span>
                )}
              </div>
              <div className="text-[11px] text-text-secondary mb-1.5">
                {fechaHoraCorta(c.updated_at)}
              </div>
              <div className="flex flex-wrap gap-[5px]">
                {ganado ? (
                  <>
                    <Chip clases="bg-green-bg text-green-text border-green-border">{c.producto}</Chip>
                    <Chip>{etiquetaModalidad(c.modalidad)}</Chip>
                    {c.descuento > 0 && (
                      <Chip clases="bg-lime-bg text-lime-text border-lime-border">
                        {c.descuento}% dto
                      </Chip>
                    )}
                    <Chip>${formatearImporte(c.importe)}</Chip>
                  </>
                ) : c.motivo ? (
                  <Chip clases="bg-red-bg text-red-text border-red-border">{c.motivo}</Chip>
                ) : (
                  <Chip>Sin motivo registrado</Chip>
                )}
              </div>
            </div>
          )
        })}
    </div>
  )
}
