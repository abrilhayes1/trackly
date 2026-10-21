// Estadísticas (RF37 · CU11): leads por origen, distribución por interés, evolución semanal y tasa
// de contacto. El asesor ve lo suyo; el líder, todo el equipo con filtro por asesor.
// Gráficos de una sola serie en el color de acento, con tooltip al pasar el mouse y vista de tabla.
import { useEffect, useMemo, useState } from 'react'
import { TarjetaGrafico as Tarjeta, Barras, Columnas } from '../components/Graficos'
import { useTooltip } from '../lib/useTooltip'
import Reportes from './Reportes'
import { apiFetch } from '../lib/api'
import { iniciales } from '../lib/formato'
import { useTerminos } from '../lib/configEquipo'
import { calcularEstadisticas, PERIODOS, porcentaje } from '../lib/estadisticas'

function Indicador({ label, valor, detalle }) {
  return (
    <div className="bg-bg-secondary rounded-md px-4 py-3">
      <div className="text-[11px] text-text-secondary mb-1">{label}</div>
      <div className="text-[22px] font-semibold text-text-primary">{valor}</div>
      {detalle && <div className="text-[11px] text-text-tertiary mt-0.5">{detalle}</div>}
    </div>
  )
}

function Chip({ activo, onClick, children, conAvatar }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 text-[11px] rounded-full border ${conAvatar ? 'pl-[5px] pr-2.5' : 'px-3'} py-1 ${
        activo ? 'bg-accent text-white border-accent' : 'bg-bg-primary text-text-secondary border-border-secondary'
      }`}
    >
      {children}
    </button>
  )
}

export default function Estadisticas({ userId, rol, cambios }) {
  const { varios, Varios } = useTerminos()
  const esLider = rol === 'lider'
  const [leads, setLeads] = useState([])
  const [miembros, setMiembros] = useState([])
  const [ahora, setAhora] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [dias, setDias] = useState(30)
  const [asesor, setAsesor] = useState('')
  const [pestana, setPestana] = useState('resumen')
  const tooltip = useTooltip()

  useEffect(() => {
    Promise.all([apiFetch('/api/leads?campos=analisis'), esLider ? apiFetch('/api/config/equipo') : Promise.resolve({ miembros: [] })])
      .then(([l, equipo]) => {
        setLeads(l)
        setMiembros(equipo.miembros)
        setAhora(Date.now())
        setError(null)
      })
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false))
  }, [esLider, cambios])

  // el asesor ve solo lo suyo; el líder, todo el equipo o una persona
  const asesorId = esLider ? asesor : userId
  const e = useMemo(() => calcularEstadisticas(leads, { dias, asesorId, ahora }), [leads, dias, asesorId, ahora])
  const periodo = PERIODOS.find((p) => p.valor === dias).etiqueta.toLowerCase()

  return (
    <div className="p-5 max-w-[1040px]">
      <h1 className="text-base font-semibold tracking-tight text-text-primary mb-[3px]">Estadísticas</h1>
      <p className="text-xs text-text-secondary mb-4">
        {esLider ? 'La actividad comercial de todo el equipo' : 'Resumen de tu actividad comercial'}
      </p>

      <div className="flex gap-[5px] border-b border-border-tertiary mb-4">
        {[
          ['resumen', 'Resumen'],
          ['reportes', 'Reportes'],
        ].map(([v, t]) => (
          <button
            key={v}
            onClick={() => setPestana(v)}
            className={`text-xs px-3.5 py-2 -mb-px border-b-2 ${
              pestana === v ? 'text-accent-dark font-semibold border-accent' : 'text-text-secondary border-transparent hover:text-text-primary'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {pestana === 'reportes' && <Reportes userId={userId} rol={rol} cambios={cambios} />}

      {pestana === 'resumen' && (
      <>
      {/* filtros: una sola fila arriba, valen para todo lo de abajo */}
      <div className="flex flex-wrap items-center gap-[5px] mb-5">
        {PERIODOS.map((p) => (
          <Chip key={p.valor} activo={dias === p.valor} onClick={() => setDias(p.valor)}>
            {p.etiqueta}
          </Chip>
        ))}
        {esLider && miembros.length > 1 && (
          <>
            <span className="w-px h-5 bg-border-tertiary mx-1.5" />
            <Chip activo={asesor === ''} onClick={() => setAsesor('')}>
              Todo el equipo
            </Chip>
            {miembros.map((m) => (
              <Chip key={m.id} conAvatar activo={asesor === m.id} onClick={() => setAsesor(m.id)}>
                <span className="w-5 h-5 rounded-full bg-avatar-bg text-avatar-text inline-flex items-center justify-center text-[8px] font-semibold">
                  {iniciales(m.nombre)}
                </span>
                {m.nombre.split(' ')[0]}
              </Chip>
            ))}
          </>
        )}
      </div>

      {cargando && <p className="text-sm text-text-secondary">Cargando...</p>}
      {error && <p className="text-sm text-red-text bg-red-bg border border-red-border rounded-md px-3 py-2">{error}</p>}

      {!cargando && !error && (
        <>
          <div className="grid grid-cols-4 gap-2 mb-4">
            <Indicador label={`${Varios} ingresados`} valor={e.ingresados} detalle={periodo} />
            <Indicador label="Tasa de contacto" valor={porcentaje(e.tasaContacto)} detalle={`${e.contactados} de ${e.ingresados} contactados`} />
            <Indicador label="Ganados" valor={e.ganados} detalle={`${e.perdidos} perdidos`} />
            <Indicador
              label="Tasa de conversión"
              valor={porcentaje(e.tasaConversion)}
              detalle={e.ganados + e.perdidos ? 'ganados sobre cerrados' : 'todavía sin cierres'}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <Tarjeta titulo={`${Varios} por origen`} sub={`De dónde vinieron los ${varios} ingresados`} datos={e.porOrigen}>
              <Barras datos={e.porOrigen} tooltip={tooltip} />
            </Tarjeta>
            <Tarjeta titulo="Nivel de interés" sub={`Cómo están categorizados los ${varios} ingresados`} datos={e.porInteres}>
              <Barras datos={e.porInteres} tooltip={tooltip} />
            </Tarjeta>
          </div>

          <Tarjeta
            titulo="Evolución semanal"
            sub={`${Varios} nuevos por semana`}
            datos={e.porSemana.map((s) => ({ etiqueta: `Semana del ${s.etiqueta}`, valor: s.valor }))}
          >
            {e.ingresados === 0 ? (
              <p className="text-xs text-text-tertiary py-6 text-center">Sin datos en este período.</p>
            ) : (
              <Columnas datos={e.porSemana} tooltip={tooltip} />
            )}
          </Tarjeta>
          <p className="text-[10px] text-text-tertiary mt-3">
            Se cuentan los {varios} ingresados en el período. Un contacto cuenta como contactado si tiene un contacto
            registrado o ya se cerró.
          </p>
        </>
      )}
      </>
      )}
      {tooltip.nodo}
    </div>
  )
}
