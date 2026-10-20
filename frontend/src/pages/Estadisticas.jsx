// Estadísticas (RF37 · CU11): leads por origen, distribución por interés, evolución semanal y tasa
// de contacto. El asesor ve lo suyo; el líder, todo el equipo con filtro por asesor.
// Gráficos de una sola serie en el color de acento, con tooltip al pasar el mouse y vista de tabla.
import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../lib/api'
import { iniciales } from '../lib/formato'
import { useTerminos } from '../lib/configEquipo'
import { calcularEstadisticas, PERIODOS, porcentaje } from '../lib/estadisticas'

// tooltip que sigue al puntero (el valor primero, la etiqueta después)
function useTooltip() {
  const [tip, setTip] = useState(null)
  const mostrar = (e, valor, etiqueta) => setTip({ x: e.clientX, y: e.clientY, valor, etiqueta })
  const ocultar = () => setTip(null)
  const nodo = tip && (
    <div
      className="fixed z-50 pointer-events-none bg-bg-primary border border-border-secondary rounded-md px-2.5 py-1.5 shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
      style={{ left: tip.x + 12, top: tip.y - 40 }}
    >
      <div className="text-[13px] font-semibold text-text-primary">{tip.valor}</div>
      <div className="text-[10px] text-text-secondary">{tip.etiqueta}</div>
    </div>
  )
  return { mostrar, ocultar, nodo }
}

function Tarjeta({ titulo, sub, datos, children, columna = 'Cantidad' }) {
  const [tabla, setTabla] = useState(false)
  return (
    <section className="bg-bg-primary border border-border-tertiary rounded-(--radius-lg) px-[1.1rem] py-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="text-[13px] font-semibold text-text-primary">{titulo}</h2>
          {sub && <p className="text-[11px] text-text-secondary mt-0.5">{sub}</p>}
        </div>
        <button onClick={() => setTabla(!tabla)} className="text-[11px] text-accent hover:underline shrink-0">
          {tabla ? 'Ver gráfico' : 'Ver tabla'}
        </button>
      </div>
      {tabla ? (
        <table className="w-full text-xs">
          <tbody>
            {datos.map((d) => (
              <tr key={d.etiqueta} className="border-b border-border-tertiary last:border-0">
                <td className="py-1.5 text-text-secondary">{d.etiqueta}</td>
                <td className="py-1.5 text-right text-text-primary font-medium tabular-nums">{d.valor}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="pt-1.5 text-[10px] text-text-tertiary uppercase">{columna}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      ) : (
        children
      )}
    </section>
  )
}

// barras horizontales: crecen desde la izquierda, extremo redondeado de 4px, valor en la punta
function Barras({ datos, tooltip }) {
  const max = Math.max(1, ...datos.map((d) => d.valor))
  if (datos.every((d) => d.valor === 0)) return <p className="text-xs text-text-tertiary py-6 text-center">Sin datos en este período.</p>
  return (
    <div className="flex flex-col gap-2">
      {datos.map((d) => (
        <div
          key={d.etiqueta}
          className="grid grid-cols-[120px_1fr] items-center gap-2.5 group"
          onPointerMove={(e) => tooltip.mostrar(e, d.valor, d.etiqueta)}
          onPointerLeave={tooltip.ocultar}
        >
          <span className="text-[11px] text-text-secondary truncate" title={d.etiqueta}>
            {d.etiqueta}
          </span>
          <div className="flex items-center gap-1.5 h-6">
            {d.valor > 0 && (
              <div
                className="h-3.5 bg-accent rounded-r-[4px] group-hover:opacity-80 transition-opacity"
                style={{ width: `${(d.valor / max) * 85}%` }}
              />
            )}
            <span className="text-[11px] text-text-primary tabular-nums">{d.valor}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

// columnas por semana: un solo eje, grilla de 1px, etiqueta solo en el máximo y en la última
function Columnas({ datos, tooltip }) {
  // del tamaño en que se muestra (unos 950px), así columnas y textos no se agrandan al escalar
  const ancho = 950
  const alto = 220
  const margen = { izq: 30, der: 8, arriba: 18, abajo: 24 }
  const maxDato = Math.max(...datos.map((d) => d.valor), 0)
  const paso = maxDato <= 5 ? 1 : maxDato <= 10 ? 2 : maxDato <= 25 ? 5 : Math.ceil(maxDato / 5 / 10) * 10
  const tope = Math.max(paso, Math.ceil(maxDato / paso) * paso)
  const ticks = Array.from({ length: tope / paso + 1 }, (_, i) => i * paso)
  const banda = (ancho - margen.izq - margen.der) / datos.length
  const barra = Math.min(24, banda * 0.6)
  const y = (v) => margen.arriba + (alto - margen.arriba - margen.abajo) * (1 - v / tope)
  const indiceMax = datos.findIndex((d) => d.valor === maxDato)
  const cadaCuanto = Math.ceil(datos.length / 8)

  return (
    <svg viewBox={`0 0 ${ancho} ${alto}`} className="w-full h-auto" role="img" aria-label="Ingresos por semana">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={margen.izq} x2={ancho - margen.der} y1={y(t)} y2={y(t)} stroke="var(--color-border-tertiary)" strokeWidth="1" />
          <text x={margen.izq - 6} y={y(t) + 3} textAnchor="end" fontSize="10" fill="var(--color-text-tertiary)">
            {t}
          </text>
        </g>
      ))}
      {datos.map((d, i) => {
        const cx = margen.izq + banda * i + banda / 2
        const x = cx - barra / 2
        const yTop = y(d.valor)
        const base = y(0)
        const h = base - yTop
        const r = Math.min(4, h)
        const etiquetar = d.valor > 0 && (i === indiceMax || i === datos.length - 1)
        return (
          <g
            key={i}
            onPointerMove={(e) => tooltip.mostrar(e, d.valor, `Semana del ${d.etiqueta}`)}
            onPointerLeave={tooltip.ocultar}
            className="group"
          >
            {/* el área de hover es toda la banda, no solo la columna */}
            <rect x={margen.izq + banda * i} y={margen.arriba} width={banda} height={base - margen.arriba} fill="transparent" />
            {h > 0 && (
              <path
                d={`M${x},${base} V${yTop + r} Q${x},${yTop} ${x + r},${yTop} H${x + barra - r} Q${x + barra},${yTop} ${x + barra},${yTop + r} V${base} Z`}
                fill="var(--color-accent)"
                className="group-hover:opacity-80"
              />
            )}
            {etiquetar && (
              <text x={cx} y={yTop - 4} textAnchor="middle" fontSize="10" fill="var(--color-text-primary)">
                {d.valor}
              </text>
            )}
            {i % cadaCuanto === 0 && (
              <text x={cx} y={alto - 6} textAnchor="middle" fontSize="10" fill="var(--color-text-tertiary)">
                {d.etiqueta}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

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
  const tooltip = useTooltip()

  useEffect(() => {
    Promise.all([apiFetch('/api/leads'), esLider ? apiFetch('/api/config/equipo') : Promise.resolve({ miembros: [] })])
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
      {tooltip.nodo}
    </div>
  )
}
