// Sección "Charlas" de la tarjeta del lead (RF31, RF33): a qué eventos fue invitado, si asistió,
// e invitarlo a uno nuevo con un buscador por nombre o categoría.
import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'
import { fechaCharla } from '../lib/charlas'

export default function CharlasLead({ lead, puedeEditar, onCambio }) {
  const [invitaciones, setInvitaciones] = useState([])
  const [charlas, setCharlas] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [abierto, setAbierto] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState(null)
  const [recargas, setRecargas] = useState(0)
  const [ahora, setAhora] = useState(0)

  useEffect(() => {
    Promise.all([apiFetch(`/api/charlas/lead/${lead.id}`), apiFetch('/api/charlas')])
      .then(([inv, todas]) => {
        setInvitaciones(inv)
        setCharlas(todas)
        setAhora(Date.now())
      })
      .catch((e) => setError(e.message))
  }, [lead.id, recargas])

  const yaInvitado = new Set(invitaciones.map((i) => i.charla.id))
  const texto = busqueda.trim().toLowerCase()
  const opciones = charlas
    .filter((c) => new Date(c.fecha).getTime() >= ahora - 3 * 3600e3 && !yaInvitado.has(c.id))
    .filter((c) => !texto || c.nombre.toLowerCase().includes(texto) || (c.carrera || '').toLowerCase().includes(texto))

  async function hacer(fn) {
    setOcupado(true)
    setError(null)
    try {
      await fn()
      setRecargas((n) => n + 1)
      onCambio()
    } catch (e) {
      setError(e.message)
    } finally {
      setOcupado(false)
    }
  }

  const invitar = (charla) =>
    hacer(async () => {
      await apiFetch(`/api/charlas/${charla.id}/invitados`, { method: 'POST', body: JSON.stringify({ leadId: lead.id }) })
      setBusqueda('')
      setAbierto(false)
    })

  const asistencia = (inv, valor) =>
    hacer(() =>
      apiFetch(`/api/charlas/invitados/${inv.id}`, { method: 'PATCH', body: JSON.stringify({ asistio: inv.asistio === valor ? null : valor }) })
    )

  return (
    <div>
      {invitaciones.length === 0 && <p className="text-xs text-text-tertiary mb-2">Todavía no fue invitado a ningún evento.</p>}
      {invitaciones.map((inv) => (
        <div key={inv.id} className="flex items-center gap-2 mb-1.5">
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-text-primary truncate">{inv.charla.nombre}</div>
            <div className="text-[10px] text-text-secondary">{fechaCharla(inv.charla.fecha)}</div>
          </div>
          {[
            [true, 'Asistió', 'bg-green-bg text-green-text border-green-border'],
            [false, 'No asistió', 'bg-red-bg text-red-text border-red-border'],
          ].map(([valor, etiqueta, activo]) => (
            <button
              key={etiqueta}
              disabled={!puedeEditar || ocupado}
              onClick={() => asistencia(inv, valor)}
              className={`text-[10px] px-2 py-0.5 rounded-full border disabled:cursor-not-allowed ${
                inv.asistio === valor ? activo : 'bg-bg-primary text-text-secondary border-border-secondary disabled:opacity-50'
              }`}
            >
              {etiqueta}
            </button>
          ))}
        </div>
      ))}

      {puedeEditar && (
        <div className="relative mt-2">
          <input
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value)
              setAbierto(true)
            }}
            onFocus={() => setAbierto(true)}
            onBlur={() => setTimeout(() => setAbierto(false), 150)}
            placeholder="Invitar a un evento: buscá por nombre o categoría..."
            className="w-full text-xs px-2.5 py-1.5 rounded-md border border-border-secondary bg-bg-secondary text-text-primary focus:outline-none focus:border-accent focus:bg-bg-primary"
          />
          {abierto && (
            <div className="absolute z-50 left-0 right-0 mt-1 max-h-40 overflow-y-auto rounded-md border border-border-secondary bg-bg-primary shadow-[0_4px_12px_rgba(0,0,0,0.08)]">
              {opciones.length === 0 && <div className="px-2.5 py-2 text-[11px] text-text-tertiary">No hay eventos próximos para invitar.</div>}
              {opciones.map((c) => (
                <button
                  key={c.id}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => invitar(c)}
                  className="block w-full text-left px-2.5 py-2 hover:bg-bg-secondary"
                >
                  <div className="text-xs font-medium text-text-primary">{c.nombre}</div>
                  <div className="text-[10px] text-text-secondary">
                    {fechaCharla(c.fecha)}
                    {c.carrera ? ` · ${c.carrera}` : ''}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {error && <p className="text-xs text-red-text mt-2">{error}</p>}
    </div>
  )
}
