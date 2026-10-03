import { colorPorInteres, sinCategoria, etiquetaInteres } from '../lib/interes'

const estiloPorGrupo = {
  porVencer: { dot: 'bg-dot-red', dias: 'text-urgent-red' },
  estaSemana: { dot: 'bg-dot-amber', dias: 'text-urgent-amber' },
  sinContactar: { dot: 'bg-dot-blue', dias: 'text-urgent-blue' },
  alDia: { dot: 'bg-green-border', dias: 'text-text-tertiary' },
}

export default function LeadCard({ lead, grupo }) {
  const estilo = estiloPorGrupo[grupo]
  const colores = lead.interes ? colorPorInteres[lead.interes] : sinCategoria
  const etiqueta = lead.interes ? etiquetaInteres[lead.interes] : 'Sin categoría'

  return (
    <div className="flex items-center gap-[9px] bg-bg-primary border border-border-tertiary rounded-(--radius-lg) px-[0.9rem] py-[0.65rem] mb-1.5 cursor-pointer hover:border-accent transition-colors">
      <span className={`w-2 h-2 rounded-full shrink-0 ${estilo.dot}`} />

      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium text-text-primary">{lead.nombre}</div>
        <div className="text-[11px] text-text-secondary truncate mt-px">
          {lead.consulta || lead.origen || 'Sin consulta registrada'}
        </div>
      </div>

      <div className="flex flex-col items-end gap-[3px] shrink-0">
        <span className={`text-[11px] font-medium ${estilo.dias}`}>
          {lead.dias === 0 ? 'hoy' : `${lead.dias}d`}
        </span>
        <span
          className={`text-[10px] px-1.5 py-px rounded-full border ${colores.bg} ${colores.text} ${colores.border}`}
        >
          {etiqueta}
        </span>
      </div>
    </div>
  )
}