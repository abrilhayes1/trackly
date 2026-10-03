const colorPorInteres = {
  muy_interesado: { bg: 'bg-green-bg', text: 'text-green-text', border: 'border-green-border' },
  interesado: { bg: 'bg-lime-bg', text: 'text-lime-text', border: 'border-lime-border' },
  duda: { bg: 'bg-amber-bg', text: 'text-amber-text', border: 'border-amber-border' },
  poco_interesado: { bg: 'bg-bg-tertiary', text: 'text-text-primary', border: 'border-border-secondary' },
  frio: { bg: 'bg-bg-tertiary', text: 'text-text-secondary', border: 'border-border-secondary' },
  no_interesado: { bg: 'bg-red-bg', text: 'text-red-text', border: 'border-red-border' },
}

const etiquetaInteres = {
  muy_interesado: 'Muy interesado',
  interesado: 'Interesado',
  duda: 'Duda',
  poco_interesado: 'Poco interesado',
  frio: 'Frío',
  no_interesado: 'No interesado',
}

export default function LeadCard({ lead }) {
  const dotColor = lead.estado === 'vencido' ? 'bg-dot-red' : 'bg-dot-blue'
  const colores = colorPorInteres[lead.interes]

  return (
    <div className="flex items-center gap-2.5 bg-bg-primary border border-border-tertiary rounded-(--radius-lg) px-3.5 py-2.5 mb-1.5 cursor-pointer hover:border-accent transition-colors">
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`} />

      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-text-primary">{lead.nombre}</div>
        <div className="text-xs text-text-secondary truncate">
          {lead.consulta || lead.origen || 'Sin consulta registrada'}
        </div>
      </div>

      {lead.interes && (
        <span
          className={`text-[10px] px-2 py-0.5 rounded-full border ${colores.bg} ${colores.text} ${colores.border}`}
        >
          {etiquetaInteres[lead.interes]}
        </span>
      )}
    </div>
  )
}