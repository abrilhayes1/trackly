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
    </div>
  )
}