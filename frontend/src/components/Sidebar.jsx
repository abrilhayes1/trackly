const Svg = ({ children }) => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    {children}
  </svg>
)

const trazo = { stroke: 'currentColor', strokeWidth: 1.2 }

const iconos = {
  leads: (
    <Svg>
      <rect x="1" y="1" width="5" height="5" rx="1.5" {...trazo} />
      <rect x="8" y="1" width="5" height="5" rx="1.5" {...trazo} />
      <rect x="1" y="8" width="5" height="5" rx="1.5" {...trazo} />
      <rect x="8" y="8" width="5" height="5" rx="1.5" {...trazo} />
    </Svg>
  ),
  alertas: (
    <Svg>
      <path d="M7 1.5a4 4 0 014 4v2.5l1 1.5H2L3 8V5.5a4 4 0 014-4z" strokeLinejoin="round" {...trazo} />
      <path d="M5.5 11.5a1.5 1.5 0 003 0" {...trazo} />
    </Svg>
  ),
  agenda: (
    <Svg>
      <circle cx="7" cy="7" r="5.5" {...trazo} />
      <path d="M7 4v3l2 1.5" strokeLinecap="round" {...trazo} />
    </Svg>
  ),
  charlas: (
    <Svg>
      <rect x="1" y="2" width="12" height="9" rx="1.5" {...trazo} />
      <path d="M4 2V1M10 2V1" strokeLinecap="round" {...trazo} />
      <path d="M1 5h12" {...trazo} />
    </Svg>
  ),
  archivo: (
    <Svg>
      <rect x="1" y="4" width="12" height="9" rx="1.5" {...trazo} />
      <path d="M1 6h12" {...trazo} />
      <path d="M4 1.5h6" strokeLinecap="round" {...trazo} />
    </Svg>
  ),
  exitosos: (
    <Svg>
      <path d="M2 7l3.5 3.5L12 3.5" stroke="#0F6E56" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  ),
  perdidos: (
    <Svg>
      <path d="M3 3l8 8M11 3l-8 8" stroke="#A32D2D" strokeWidth="1.4" strokeLinecap="round" />
    </Svg>
  ),
  stats: (
    <Svg>
      <polyline points="1,11 4,7 7,9 10,4 13,6" strokeLinejoin="round" strokeLinecap="round" {...trazo} />
    </Svg>
  ),
}

const etiquetaRol = { lider: 'Líder de equipo', asesor: 'Asesor comercial' }

// habilitado = la pantalla existe y se puede abrir; activo = es la que se está viendo
function Item({ icono, label, habilitado = false, activo = false, onClick }) {
  const base = 'flex items-center gap-[9px] w-full text-left px-4 py-[7px] text-[13px]'
  const estilo = activo
    ? 'bg-bg-primary text-text-primary font-medium shadow-[inset_-2px_0_0_var(--color-accent)]'
    : habilitado
      ? 'text-text-secondary hover:bg-bg-primary hover:text-text-primary'
      : 'text-text-tertiary opacity-60 cursor-not-allowed'

  return (
    <button
      disabled={!habilitado}
      onClick={onClick}
      title={habilitado ? undefined : 'Todavía no está conectada esta vista'}
      className={`${base} ${estilo}`}
    >
      <span className="w-4 h-4 flex items-center justify-center shrink-0">{icono}</span>
      {label}
    </button>
  )
}

function Seccion({ children }) {
  return (
    <div className="text-[10px] uppercase tracking-[0.06em] text-text-tertiary px-4 pt-3.5 pb-1">
      {children}
    </div>
  )
}

export default function Sidebar({ email, perfil, vista, onNavegar, onCerrarSesion }) {
  const nombre = perfil?.nombre || email
  const iniciales =
    perfil?.avatar_iniciales || (email || '??').split('@')[0].slice(0, 2).toUpperCase()

  return (
    <aside className="w-[210px] shrink-0 bg-bg-secondary border-r border-border-tertiary flex flex-col sticky top-0 h-screen py-[17px]">
      <div className="px-4 pb-3.5 mb-1.5 border-b border-border-tertiary">
        <span className="text-[17px] font-semibold text-accent-dark tracking-tight">
          Trackly<span className="text-green-border">.</span>
        </span>
        <span className="block text-[10px] text-text-secondary mt-0.5">
          {perfil?.tenants?.nombre || 'Tu equipo'}
        </span>
      </div>

      <Seccion>Principal</Seccion>
      <Item
        icono={iconos.leads}
        label="Mis leads"
        habilitado
        activo={vista === 'leads'}
        onClick={() => onNavegar('leads')}
      />
      <Item
        icono={iconos.alertas}
        label="Alertas de hoy"
        habilitado
        activo={vista === 'alertas'}
        onClick={() => onNavegar('alertas')}
      />
      <Item icono={iconos.agenda} label="Agenda" />

      <Seccion>Vistas</Seccion>
      <Item icono={iconos.charlas} label="Charlas" />
      <Item icono={iconos.archivo} label="Archivo" />
      <Item icono={iconos.exitosos} label="Casos exitosos" />
      <Item icono={iconos.perdidos} label="Cerrados perdidos" />
      <Item icono={iconos.stats} label="Estadísticas" />

      <div className="mt-auto px-4 pt-3.5 border-t border-border-tertiary">
        <div className="flex items-center gap-[9px]">
          <div className="w-[30px] h-[30px] rounded-full bg-avatar-bg text-avatar-text flex items-center justify-center text-[11px] font-semibold shrink-0">
            {iniciales}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium text-text-primary truncate">{nombre}</div>
            <div className="text-[10px] text-text-secondary">
              {etiquetaRol[perfil?.rol] || ''}
            </div>
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