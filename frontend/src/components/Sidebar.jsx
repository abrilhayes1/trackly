const navItems = [
  { label: 'Mis leads', badge: null, active: true },
  { label: 'Alertas de hoy', badge: null },
  { label: 'Agenda', badge: null },
]

const navItemsVistas = [
  { label: 'Charlas', badge: null },
  { label: 'Archivo', badge: null },
  { label: 'Casos exitosos', badge: null },
  { label: 'Cerrados perdidos', badge: null },
  { label: 'Estadísticas', badge: null },
]

export default function Sidebar({ equipoNombre, usuario, onCerrarSesion }) {
  const iniciales = (usuario?.email || '??')
    .split('@')[0]
    .slice(0, 2)
    .toUpperCase()

  return (
    <aside className="bg-bg-secondary border-r border-border-tertiary flex flex-col sticky top-0 h-screen py-4">
      <div className="px-4 pb-3.5 mb-1.5 border-b border-border-tertiary">
        <span className="text-[17px] font-semibold text-accent-dark tracking-tight">
          Trackly<span className="text-green-border">.</span>
        </span>
        <span className="block text-[10px] text-text-secondary mt-0.5">
          {equipoNombre || 'Tu equipo'}
        </span>
      </div>

      <div className="text-[10px] uppercase tracking-wide text-text-tertiary px-4 pt-3.5 pb-1">
        Principal
      </div>
      {navItems.map((item) => (
        <button
          key={item.label}
          className={`flex items-center justify-between w-full text-left px-4 py-1.5 text-sm ${
            item.active
              ? 'bg-bg-primary text-text-primary font-medium shadow-[inset_-2px_0_0_var(--color-accent)]'
              : 'text-text-secondary hover:bg-bg-primary hover:text-text-primary'
          }`}
        >
          {item.label}
        </button>
      ))}

      <div className="text-[10px] uppercase tracking-wide text-text-tertiary px-4 pt-3.5 pb-1">
        Vistas
      </div>
      {navItemsVistas.map((item) => (
        <button
          key={item.label}
          disabled
          className="flex items-center justify-between w-full text-left px-4 py-1.5 text-sm text-text-tertiary cursor-not-allowed opacity-60"
          title="Todavía no está conectada esta vista"
        >
          {item.label}
        </button>
      ))}

      <div className="mt-auto px-4 pt-3.5 border-t border-border-tertiary">
        <div className="flex items-center gap-2.5">
          <div className="w-7.5 h-7.5 rounded-full bg-avatar-bg text-avatar-text flex items-center justify-center text-[11px] font-semibold flex-shrink-0">
            {iniciales}
          </div>
          <div>
            <div className="text-xs font-medium text-text-primary">{usuario?.email}</div>
            <div className="text-[10px] text-text-secondary">Líder de equipo</div>
          </div>
        </div>
        <button
          onClick={onCerrarSesion}
          className="text-[10px] text-text-tertiary hover:text-red-text mt-1.5"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}