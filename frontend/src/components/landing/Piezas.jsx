// Piezas de la interfaz de Trackly en miniatura, para las demostraciones de la landing. Usan los
// mismos colores y formas que la app (no son capturas: así se ven nítidas y se pueden animar).
import Logo from '../Logo'

export const Punto = ({ color }) => <span className={`w-2 h-2 rounded-full shrink-0 ${color}`} />

export function Pastilla({ children, clases = 'bg-bg-tertiary text-text-secondary border-border-tertiary' }) {
  return <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border whitespace-nowrap ${clases}`}>{children}</span>
}

const INTERES = {
  muy: ['Muy interesado', 'bg-green-bg text-green-text border-green-border'],
  int: ['Interesado', 'bg-lime-bg text-lime-text border-lime-border'],
  duda: ['Duda', 'bg-amber-bg text-amber-text border-amber-border'],
  sin: ['Sin categoría', 'bg-bg-tertiary text-text-secondary border-border-primary'],
}

// una fila de lead como en Mis leads
export function FilaLead({ nombre, consulta, dias, colorDias = 'text-text-secondary', punto, interes = 'sin' }) {
  return (
    <div className="flex items-center gap-2.5 bg-bg-primary border border-border-tertiary rounded-[10px] px-3 py-2.5">
      <Punto color={punto} />
      <div className="min-w-0 flex-1">
        <div className="text-[12px] font-semibold text-text-primary truncate">{nombre}</div>
        <div className="text-[10.5px] text-text-secondary truncate">{consulta}</div>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className={`text-[11px] font-semibold tabular-nums ${colorDias}`}>{dias}</span>
        <Pastilla clases={INTERES[interes][1]}>{INTERES[interes][0]}</Pastilla>
      </div>
    </div>
  )
}

export function TituloSeccion({ texto, cantidad, clases }) {
  return (
    <div className="flex items-center gap-2 mt-3 mb-2 first:mt-0">
      <span className="text-[10px] font-semibold tracking-[0.06em] uppercase text-text-secondary">{texto}</span>
      <span className={`text-[10px] font-semibold px-1.5 rounded-full tabular-nums ${clases}`}>{cantidad}</span>
    </div>
  )
}

// marco de ventana de la app (barra superior con el logo)
export function Ventana({ titulo, children, className = '' }) {
  return (
    <div
      className={`bg-bg-secondary border border-border-tertiary rounded-2xl overflow-hidden ${className}`}
      style={{ boxShadow: '0 24px 60px -18px rgba(44, 38, 110, 0.28), 0 2px 6px rgba(44, 38, 110, 0.06)' }}
    >
      <div className="flex items-center gap-3 px-4 py-2.5 bg-bg-primary border-b border-border-tertiary">
        <Logo alto="h-[18px]" />
        {titulo && <span className="text-[11px] text-text-tertiary">{titulo}</span>}
      </div>
      {children}
    </div>
  )
}

// íconos de línea (mismo trazo que la app)
const TRAZOS = {
  telefono:
    'M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1.9.4 1.8.7 2.7a2 2 0 01-.5 2.1L8 9.8a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.4c.9.3 1.8.6 2.7.7a2 2 0 011.7 2z',
  whatsapp: 'M3 21l1.7-5A8.5 8.5 0 1112 20.5a8.4 8.4 0 01-4-1z',
  campana: 'M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 003.4 0',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  flecha: 'M5 12h14M13 6l6 6-6 6',
  tendencia: 'M3 17l6-6 4 4 8-8M15 7h6v6',
}
export function Icono({ nombre, className = 'w-4 h-4' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={TRAZOS[nombre]} />
    </svg>
  )
}

// cursor de otra persona del equipo, con su nombre
export function Cursor({ nombre, color }) {
  return (
    <div className="flex items-start gap-0.5">
      <svg viewBox="0 0 16 16" className="w-4 h-4 drop-shadow-sm" aria-hidden="true">
        <path d="M1 1l5.5 13 2-5.5L14 6.5z" fill={color} stroke="white" strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
      <span className="text-[10px] font-semibold text-white px-1.5 py-0.5 rounded-md mt-2.5" style={{ background: color }}>
        {nombre}
      </span>
    </div>
  )
}
