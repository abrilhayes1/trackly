// Solo para el líder: elegir de quién ver la pantalla (todo el equipo, yo o una persona).
import Avatar from './Avatar'
import { TODO_EL_EQUIPO } from '../lib/miembros'

function Chip({ activo, onClick, children, conAvatar = false }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={activo}
      className={`flex items-center gap-1.5 text-[11px] rounded-full border ${conAvatar ? 'pl-[5px] pr-2.5 py-1' : 'px-3 py-1'} ${
        activo ? 'bg-accent text-white border-accent' : 'bg-bg-primary text-text-secondary border-border-secondary hover:text-text-primary'
      }`}
    >
      {children}
    </button>
  )
}

export default function FiltroAsesor({ asesor, onElegir, miembros, userId }) {
  const otros = miembros.filter((m) => m.id !== userId)
  return (
    <div className="flex flex-wrap items-center gap-[5px] mb-4">
      <Chip activo={asesor === TODO_EL_EQUIPO} onClick={() => onElegir(TODO_EL_EQUIPO)}>
        Todo el equipo
      </Chip>
      <Chip activo={asesor === userId} onClick={() => onElegir(userId)}>
        Yo
      </Chip>
      {otros.map((m) => (
        <Chip key={m.id} conAvatar activo={asesor === m.id} onClick={() => onElegir(m.id)}>
          <Avatar nombre={m.nombre} foto={m.avatar_url} tamano="w-5 h-5 text-[8px]" />
          {m.nombre.split(' ')[0]}
        </Chip>
      ))}
    </div>
  )
}
