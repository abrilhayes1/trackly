// "¿Cuántas oportunidades se te escapan?": con los leads que entran por mes, cuántos quedan sin
// seguimiento y cuántos suelen cerrarse, estima lo que se pierde por falta de aviso. Es una cuenta
// simple y está dicho así: una estimación con los números que pone cada uno.
import { useEffect, useRef, useState } from 'react'
import { animate, useReducedMotion } from 'motion/react'

// número que pasa del valor anterior al nuevo cuando cambia
function Numero({ valor }) {
  const ref = useRef(null)
  const anterior = useRef(valor)
  const quieto = useReducedMotion()
  useEffect(() => {
    const desde = anterior.current
    anterior.current = valor
    if (!ref.current) return
    if (quieto) {
      ref.current.textContent = valor.toLocaleString('es-AR')
      return
    }
    const control = animate(desde, valor, {
      duration: 0.5,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = Math.round(v).toLocaleString('es-AR')
      },
    })
    return () => control.stop()
  }, [valor, quieto])
  return (
    <span ref={ref} className="tabular-nums">
      {valor.toLocaleString('es-AR')}
    </span>
  )
}

function Deslizador({ id, etiqueta, valor, onCambio, min, max, paso, formato }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={id} className="text-[15px] text-text-secondary">
          {etiqueta}
        </label>
        <span className="text-[17px] font-semibold text-text-primary tabular-nums">{formato(valor)}</span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={paso}
        value={valor}
        onChange={(e) => onCambio(Number(e.target.value))}
        className="w-full mt-3 accent-accent h-2 cursor-pointer"
      />
    </div>
  )
}

export default function Calculadora() {
  const [leads, setLeads] = useState(200)
  const [sinSeguimiento, setSinSeguimiento] = useState(15)
  const [cierre, setCierre] = useState(20)
  const perdidos = Math.round((leads * sinSeguimiento) / 100)
  const ventas = Math.round((perdidos * cierre) / 100)

  return (
    <div className="grid md:grid-cols-[1.1fr_1fr] gap-8 md:gap-12 items-center">
      <div className="flex flex-col gap-8">
        <Deslizador
          id="calc-leads"
          etiqueta="Leads que te entran por mes"
          valor={leads}
          onCambio={setLeads}
          min={20}
          max={2000}
          paso={10}
          formato={(v) => v.toLocaleString('es-AR')}
        />
        <Deslizador
          id="calc-sin"
          etiqueta="De cada 100, ¿cuántos quedan sin seguimiento?"
          valor={sinSeguimiento}
          onCambio={setSinSeguimiento}
          min={1}
          max={50}
          paso={1}
          formato={(v) => `${v}%`}
        />
        <Deslizador
          id="calc-cierre"
          etiqueta="De los que atendés, ¿cuántos terminan comprando?"
          valor={cierre}
          onCambio={setCierre}
          min={1}
          max={60}
          paso={1}
          formato={(v) => `${v}%`}
        />
      </div>
      <div className="rounded-[24px] bg-accent-dark text-white px-7 py-8" aria-live="polite">
        <p className="text-[15px] text-white/75">Por mes, sin un aviso a tiempo, se te enfrían</p>
        <p className="mt-1 text-[56px] leading-none font-semibold tracking-[-0.04em]">
          <Numero valor={perdidos} /> <span className="text-[22px] font-medium tracking-normal">leads</span>
        </p>
        <div className="h-px bg-white/15 my-6" />
        <p className="text-[15px] text-white/75">Eso es, aproximadamente,</p>
        <p className="mt-1 text-[40px] leading-none font-semibold tracking-[-0.035em]">
          <Numero valor={ventas * 12} /> <span className="text-[18px] font-medium tracking-normal">ventas al año</span>
        </p>
        <p className="mt-6 text-[12px] leading-relaxed text-white/60">
          Es una estimación con tus números. Trackly avisa antes de que pase.
        </p>
      </div>
    </div>
  )
}
