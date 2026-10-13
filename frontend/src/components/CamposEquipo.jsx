// Piezas de formulario del onboarding y de la configuración del equipo (estilo del prototipo).
import { useState } from 'react'
import { PLAZOS } from '../lib/configEquipo'

export function Campo({ label, ayuda, children }) {
  return (
    <div className="mb-[1.1rem]">
      {label && <label className="block text-xs font-medium text-text-primary mb-1.5">{label}</label>}
      {ayuda && <span className="block text-[11px] text-text-tertiary mb-1.5">{ayuda}</span>}
      {children}
    </div>
  )
}

export const claseInput =
  'w-full text-[13px] px-3 py-2.5 rounded-[7px] border border-border-secondary bg-bg-secondary text-text-primary focus:outline-none focus:border-accent focus:bg-bg-primary'

// tarjeta de opción (rubro, nombre del contacto, evento...)
export function Opcion({ sel, onClick, icono, label, sub, centrada = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-[7px] border px-4 py-3 transition-colors ${centrada ? 'text-center' : ''} ${
        sel
          ? 'border-accent bg-purple-bg'
          : 'border-border-secondary bg-bg-secondary hover:border-accent hover:bg-purple-bg'
      }`}
    >
      {icono && <div className="text-xl mb-1">{icono}</div>}
      <div className={`text-xs font-semibold ${sel ? 'text-accent-dark' : 'text-text-primary'}`}>{label}</div>
      {sub && <div className="text-[10px] text-text-secondary mt-0.5">{sub}</div>}
    </button>
  )
}

export function GrillaOpciones({ columnas = 2, children }) {
  return (
    <div className={`grid gap-2 mb-[1.1rem] ${columnas === 4 ? 'grid-cols-4' : 'grid-cols-2'}`}>{children}</div>
  )
}

// fila con interruptor (vencimiento, eventos, resumen diario)
export function Interruptor({ prendido, onCambiar, label, sub }) {
  return (
    <button
      type="button"
      onClick={() => onCambiar(!prendido)}
      className="w-full flex items-center justify-between gap-3 text-left px-4 py-3.5 mb-3 rounded-[7px] border border-border-secondary bg-bg-secondary hover:bg-bg-primary"
    >
      <span>
        <span className="block text-[13px] font-medium text-text-primary">{label}</span>
        {sub && <span className="block text-[11px] text-text-secondary mt-0.5">{sub}</span>}
      </span>
      <span
        className={`relative w-9 h-5 rounded-full shrink-0 transition-colors ${prendido ? 'bg-accent' : 'bg-border-secondary'}`}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${prendido ? 'left-[18px]' : 'left-0.5'}`}
        />
      </span>
    </button>
  )
}

// categorías de origen: se escribe y se agrega con Enter o coma
export function Etiquetas({ valores, onCambiar, placeholder }) {
  const [texto, setTexto] = useState('')

  function agregar(valor) {
    const limpio = valor.trim().replace(/,$/, '').trim()
    if (!limpio || valores.some((v) => v.toLowerCase() === limpio.toLowerCase())) return
    onCambiar([...valores, limpio])
  }

  return (
    <div className="flex flex-wrap gap-1.5 px-2.5 py-2 min-h-11 rounded-[7px] border border-border-secondary bg-bg-secondary focus-within:border-accent focus-within:bg-bg-primary">
      {valores.map((v) => (
        <span
          key={v}
          className="flex items-center gap-1 rounded-full bg-purple-bg text-accent-dark px-2.5 py-[3px] text-xs font-medium"
        >
          {v}
          <button
            type="button"
            onClick={() => onCambiar(valores.filter((x) => x !== v))}
            className="text-accent text-sm leading-none"
            title="Quitar"
          >
            ×
          </button>
        </span>
      ))}
      <input
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ',') && texto.trim()) {
            e.preventDefault()
            agregar(texto)
            setTexto('')
          } else if (e.key === 'Backspace' && !texto && valores.length > 0) {
            onCambiar(valores.slice(0, -1))
          }
        }}
        onBlur={() => {
          if (texto.trim()) {
            agregar(texto)
            setTexto('')
          }
        }}
        placeholder={placeholder}
        className="flex-1 min-w-20 bg-transparent text-xs text-text-primary outline-none py-0.5"
      />
    </div>
  )
}

function Numero({ valor, onCambiar, min, max }) {
  return (
    <input
      type="number"
      min={min}
      max={max}
      value={Number.isInteger(valor) ? valor : ''}
      onChange={(e) => onCambiar(e.target.value === '' ? null : Number(e.target.value))}
      className="w-16 text-[13px] px-2 py-1.5 rounded-[7px] border border-border-secondary bg-bg-primary text-text-primary text-center focus:outline-none focus:border-accent"
    />
  )
}

// plazo de vencimiento, aviso previo y días hasta archivar (RF07)
export function CamposVencimiento({ valores, onCambiar }) {
  const { diasVencimiento, diasAlertaPrevia, diasArchivo } = valores
  return (
    <div className="pl-1 mb-2">
      <span className="block text-[11px] text-text-tertiary mb-1.5">
        ¿Cada cuántos días sin contacto vence?
      </span>
      <GrillaOpciones columnas={4}>
        {PLAZOS.map((d) => (
          <Opcion
            key={d}
            centrada
            sel={diasVencimiento === d}
            onClick={() => onCambiar({ diasVencimiento: d })}
            label={`${d} días`}
            sub={d === 14 ? 'Recomendado' : undefined}
          />
        ))}
      </GrillaOpciones>
      <div className="flex flex-col gap-2 text-xs text-text-secondary">
        <label className="flex items-center gap-2">
          Otro plazo:
          <Numero valor={diasVencimiento} min={1} max={365} onCambiar={(v) => onCambiar({ diasVencimiento: v })} />
          días
        </label>
        <label className="flex items-center gap-2">
          Avisar
          <Numero valor={diasAlertaPrevia} min={0} max={30} onCambiar={(v) => onCambiar({ diasAlertaPrevia: v })} />
          días antes de que venza
        </label>
        <label className="flex items-center gap-2">
          Si nadie lo reclama, pasa a Archivo a los
          <Numero valor={diasArchivo} min={1} max={365} onCambiar={(v) => onCambiar({ diasArchivo: v })} />
          días de vencido
        </label>
      </div>
    </div>
  )
}

// lista de emails para invitar (siempre queda al menos un renglón)
export function ListaEmails({ emails, onCambiar, textoAgregar = '+ Agregar otro asesor' }) {
  return (
    <div>
      {emails.map((email, i) => (
        <div key={i} className="flex gap-1.5 mb-2">
          <input
            type="email"
            value={email}
            onChange={(e) => onCambiar(emails.map((x, j) => (j === i ? e.target.value : x)))}
            placeholder="nombre@ejemplo.com"
            className={claseInput}
          />
          <button
            type="button"
            onClick={() => onCambiar(emails.length > 1 ? emails.filter((_, j) => j !== i) : [''])}
            className="w-9 shrink-0 rounded-[7px] border border-border-secondary bg-bg-secondary text-text-tertiary hover:bg-bg-primary hover:text-red-text"
            title="Quitar"
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onCambiar([...emails, ''])}
        className="w-full text-xs py-2 rounded-[7px] border border-border-secondary bg-bg-primary text-text-secondary hover:bg-bg-secondary"
      >
        {textoAgregar}
      </button>
    </div>
  )
}
