import { useState } from 'react'

// tooltip que sigue al puntero (el valor primero, la etiqueta después)
export function useTooltip() {
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
