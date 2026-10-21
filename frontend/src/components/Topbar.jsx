import { useState } from 'react'
import { temaActual, aplicarTema } from '../lib/tema'

export default function Topbar({ busqueda, onBuscar }) {
  const hoy = new Date()
    .toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    .replace(',', '')
  const fecha = hoy.charAt(0).toUpperCase() + hoy.slice(1)
  const [tema, setTema] = useState(temaActual)
  const oscuro = tema === 'oscuro'

  function alternarTema() {
    const nuevo = oscuro ? 'claro' : 'oscuro'
    aplicarTema(nuevo)
    setTema(nuevo)
  }

  return (
    <div className="sticky top-0 z-20 flex items-center gap-3 px-5 py-[11px] bg-bg-primary border-b border-border-tertiary">
      <div className="relative flex-1 max-w-105">
        <svg
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary"
          width="13"
          height="13"
          viewBox="0 0 13 13"
          fill="none"
        >
          <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.2" />
          <path d="M9 9l3 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        <input
          value={busqueda}
          onChange={(e) => onBuscar(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onBuscar('')
          }}
          placeholder="Buscar por nombre, teléfono o email..."
          className="w-full text-xs py-[7px] pl-8 pr-8 rounded-md border border-border-secondary bg-bg-secondary text-text-primary focus:outline-none focus:border-accent focus:bg-bg-primary"
        />
        {busqueda && (
          <button
            onClick={() => onBuscar('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-text-tertiary hover:text-text-primary"
            title="Limpiar búsqueda"
          >
            ✕
          </button>
        )}
      </div>
      <span className="ml-auto text-[11px] text-text-secondary whitespace-nowrap">
        {fecha}
      </span>
      <button
        onClick={alternarTema}
        title={oscuro ? 'Pasar a modo claro' : 'Pasar a modo oscuro'}
        aria-label={oscuro ? 'Pasar a modo claro' : 'Pasar a modo oscuro'}
        className="w-7 h-7 rounded-md border border-border-secondary bg-bg-secondary text-text-secondary hover:text-text-primary flex items-center justify-center"
      >
        {oscuro ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="2.8" stroke="currentColor" strokeWidth="1.2" />
            <path
              d="M7 1v1.4M7 11.6V13M1 7h1.4M11.6 7H13M2.8 2.8l1 1M10.2 10.2l1 1M2.8 11.2l1-1M10.2 3.8l1-1"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M11.5 8.6A5 5 0 0 1 5.4 2.5a5 5 0 1 0 6.1 6.1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
          </svg>
        )}
      </button>
    </div>
  )
}