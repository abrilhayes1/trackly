// Gráficos de una sola serie en el color de acento, compartidos por Estadísticas y Reportes:
// barras horizontales, columnas, número grande y tabla. Con tooltip al pasar el mouse.
import { useEffect, useRef, useState } from 'react'

export function TarjetaGrafico({ titulo, sub, datos, children, columna = 'Cantidad', formato = String, acciones }) {
  const [tabla, setTabla] = useState(false)
  return (
    <section className="bg-bg-primary border border-border-tertiary rounded-(--radius-lg) px-[1.1rem] py-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="text-[13px] font-semibold text-text-primary">{titulo}</h2>
          {sub && <p className="text-[11px] text-text-secondary mt-0.5">{sub}</p>}
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          {acciones}
          {datos && (
            <button onClick={() => setTabla(!tabla)} className="text-[11px] text-accent hover:underline">
              {tabla ? 'Ver gráfico' : 'Ver tabla'}
            </button>
          )}
        </div>
      </div>
      {tabla ? (
        <table className="w-full text-xs">
          <tbody>
            {datos.map((d) => (
              <tr key={d.etiqueta} className="border-b border-border-tertiary last:border-0">
                <td className="py-1.5 text-text-secondary">{d.etiqueta}</td>
                <td className="py-1.5 text-right text-text-primary font-medium tabular-nums">{formato(d.valor)}</td>
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
export function Barras({ datos, tooltip, formato = String }) {
  const max = Math.max(1e-9, ...datos.map((d) => d.valor))
  if (datos.length === 0 || datos.every((d) => !d.valor)) return <p className="text-xs text-text-tertiary py-6 text-center">Sin datos en este período.</p>
  return (
    <div className="flex flex-col gap-2">
      {datos.map((d) => (
        <div
          key={d.etiqueta}
          className="grid grid-cols-[120px_1fr] items-center gap-2.5 group"
          onPointerMove={(e) => tooltip.mostrar(e, formato(d.valor), d.etiqueta)}
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
            <span className="text-[11px] text-text-primary tabular-nums">{formato(d.valor)}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

// columnas por semana: un solo eje, grilla de 1px, etiqueta solo en el máximo y en la última
export function Columnas({ datos, tooltip, formato = String, prefijoTooltip = 'Semana del ' }) {
  // se dibuja del ancho real de la tarjeta, así columnas y textos no se agrandan ni se achican
  const ref = useRef(null)
  const [ancho, setAncho] = useState(600)
  useEffect(() => {
    if (!ref.current) return
    const obs = new ResizeObserver(([e]) => setAncho(Math.max(240, e.contentRect.width)))
    obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])
  const alto = 220
  const maxDato = Math.max(...datos.map((d) => d.valor || 0), 0)
  // pasos "redondos" para el eje: 1, 2, 5, 10, 20, 50...
  const crudo = maxDato / 5
  const potencia = 10 ** Math.floor(Math.log10(Math.max(crudo, 1e-9)))
  const paso = maxDato <= 5 && Number.isInteger(maxDato) ? 1 : [1, 2, 5, 10].map((m) => m * potencia).find((p) => p >= crudo)
  const tope = Math.max(paso, Math.ceil(maxDato / paso) * paso)
  const ticks = Array.from({ length: tope / paso + 1 }, (_, i) => i * paso)
  // el margen izquierdo se ajusta al número más largo del eje, así no se corta
  const margen = { izq: 12 + 6 * Math.max(...ticks.map((t) => formato(t).length)), der: 8, arriba: 18, abajo: 24 }
  const banda = (ancho - margen.izq - margen.der) / datos.length
  const barra = Math.min(24, banda * 0.6)
  const y = (v) => margen.arriba + (alto - margen.arriba - margen.abajo) * (1 - v / tope)
  const indiceMax = datos.findIndex((d) => d.valor === maxDato)
  const cadaCuanto = Math.ceil(datos.length / Math.max(2, Math.floor(ancho / 110)))
  const vacio = datos.every((d) => !d.valor)

  return (
    // el contenedor se dibuja siempre, así se mide el ancho aunque al principio no haya datos
    <div ref={ref} className="w-full">
    {vacio ? (
      <p className="text-xs text-text-tertiary py-6 text-center">Sin datos en este período.</p>
    ) : (
    <svg width={ancho} height={alto} viewBox={`0 0 ${ancho} ${alto}`} className="block" role="img" aria-label="Gráfico de columnas">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={margen.izq} x2={ancho - margen.der} y1={y(t)} y2={y(t)} stroke="var(--color-border-tertiary)" strokeWidth="1" />
          <text x={margen.izq - 6} y={y(t) + 3} textAnchor="end" fontSize="10" fill="var(--color-text-tertiary)">
            {formato(t)}
          </text>
        </g>
      ))}
      {datos.map((d, i) => {
        const cx = margen.izq + banda * i + banda / 2
        const x = cx - barra / 2
        const yTop = y(d.valor || 0)
        const base = y(0)
        const h = base - yTop
        const r = Math.min(4, h)
        const etiquetar = d.valor > 0 && (i === indiceMax || i === datos.length - 1)
        return (
          <g
            key={i}
            onPointerMove={(e) => tooltip.mostrar(e, formato(d.valor), `${prefijoTooltip}${d.etiqueta}`)}
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
                {formato(d.valor)}
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
    )}
    </div>
  )
}

// un solo número grande (cuando el reporte no se agrupa)
export function NumeroGrande({ valor, detalle }) {
  return (
    <div className="py-4">
      <div className="text-[44px] leading-none font-semibold text-text-primary">{valor}</div>
      {detalle && <div className="text-[11px] text-text-tertiary mt-2">{detalle}</div>}
    </div>
  )
}
