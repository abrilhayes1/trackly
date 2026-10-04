import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'
import {
  fechaLocal,
  hhmm,
  horaSugerida,
  estadoRecordatorio,
  textoPendientes,
  etiquetaFecha,
  ordenarRecordatorios,
} from '../lib/agenda'

const estilos = {
  normal: { borde: 'border-border-tertiary', hora: 'text-text-primary' },
  pronto: { borde: 'border-dot-amber', hora: 'text-urgent-amber' },
  urgente: { borde: 'border-dot-red', hora: 'text-urgent-red' },
  atrasado: { borde: 'border-dot-red', hora: 'text-urgent-red' },
  hecho: { borde: 'border-border-tertiary', hora: 'text-text-primary' },
}

const campo =
  'w-full text-xs px-2 py-1.5 rounded-md border border-border-tertiary bg-bg-primary text-text-primary focus:outline-none focus:border-accent'

function Tarjeta({ item, estado, hoy, onMarcar }) {
  const estilo = estilos[estado]
  const hora = hhmm(item.hora) || 'Sin hora'
  const textoHora = estado === 'atrasado' ? `${etiquetaFecha(item.fecha, hoy)} · ${hora}` : hora

  return (
    <div
      className={`shrink-0 min-w-[150px] relative bg-bg-primary border rounded-md px-2.5 py-1.5 ${estilo.borde} ${
        estado === 'hecho' ? 'opacity-40' : ''
      }`}
    >
      <button
        onClick={() => onMarcar(item)}
        title={item.hecho ? 'Volver a pendiente' : 'Marcar como hecho'}
        className="absolute top-[5px] right-1.5 text-[10px] text-text-tertiary hover:text-green-text"
      >
        {item.hecho ? '↺' : '✓'}
      </button>
      <div className={`text-[13px] font-medium mb-0.5 ${estilo.hora}`}>{textoHora}</div>
      <div className="text-[11px] text-text-secondary truncate max-w-[130px]">{item.contacto}</div>
      {item.nota && <div className="text-[10px] text-text-tertiary mt-0.5">{item.nota}</div>}
    </div>
  )
}

export default function Agenda() {
  const [ahora, setAhora] = useState(() => new Date())
  const [items, setItems] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [formAbierto, setFormAbierto] = useState(false)
  const [hora, setHora] = useState('')
  const [contacto, setContacto] = useState('')
  const [nota, setNota] = useState('')
  const [errorForm, setErrorForm] = useState(null)
  const [guardando, setGuardando] = useState(false)

  const hoy = fechaLocal(ahora)

  // cada minuto se actualizan los colores (urgente / pronto) según la hora
  useEffect(() => {
    const reloj = setInterval(() => setAhora(new Date()), 60000)
    return () => clearInterval(reloj)
  }, [])

  // se carga al abrir la pantalla (y de nuevo si cambia el día con la pantalla abierta)
  useEffect(() => {
    apiFetch(`/api/recordatorios?fecha=${hoy}`)
      .then((datos) => {
        setItems(datos)
        setError(null)
      })
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false))
  }, [hoy])

  const atrasados = items.filter((r) => estadoRecordatorio(r, ahora) === 'atrasado')
  const delDia = items.filter((r) => r.fecha === hoy)

  function alternarFormulario() {
    if (!formAbierto) {
      setHora(horaSugerida(ahora))
      setContacto('')
      setNota('')
      setErrorForm(null)
    }
    setFormAbierto(!formAbierto)
  }

  async function agregar() {
    setErrorForm(null)
    if (!contacto.trim()) return setErrorForm('Indicá el nombre o el contacto')
    if (!hora) return setErrorForm('Elegí una hora')

    setGuardando(true)
    try {
      const nuevo = await apiFetch('/api/recordatorios', {
        method: 'POST',
        body: JSON.stringify({ hora, contacto, nota, fecha: hoy }),
      })
      setItems((actuales) => [...actuales, nuevo].sort(ordenarRecordatorios))
      setFormAbierto(false)
    } catch (e) {
      setErrorForm(e.message)
    } finally {
      setGuardando(false)
    }
  }

  async function marcar(item) {
    setError(null)
    try {
      const actualizado = await apiFetch(`/api/recordatorios/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ hecho: !item.hecho }),
      })
      setItems((actuales) => actuales.map((r) => (r.id === actualizado.id ? actualizado : r)))
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div className="p-5">
      <h1 className="text-base font-semibold tracking-tight text-text-primary mb-[3px]">
        Agenda del día
      </h1>
      <p className="text-xs text-text-secondary mb-5">Recordatorios programados para hoy</p>

      {cargando && <p className="text-sm text-text-secondary">Cargando...</p>}

      {error && (
        <p className="text-sm text-red-text bg-red-bg border border-red-border rounded-md px-3 py-2 mb-3">
          {error}
        </p>
      )}

      {!cargando && (
        <>
          {atrasados.length > 0 && (
            <div className="bg-bg-secondary rounded-(--radius-lg) border border-border-tertiary px-4 py-3.5 mb-4">
              <div className="text-xs font-medium text-urgent-red mb-2.5">
                {atrasados.length} de días anteriores sin hacer
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {atrasados.map((r) => (
                  <Tarjeta key={r.id} item={r} estado="atrasado" hoy={hoy} onMarcar={marcar} />
                ))}
              </div>
            </div>
          )}

          <div className="bg-bg-secondary rounded-(--radius-lg) border border-border-tertiary px-4 py-3.5 mb-5">
            <div className="flex items-center justify-between mb-2.5">
              <span className="flex items-center gap-1.5 text-xs font-medium text-text-primary">
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.2" />
                  <path d="M6.5 4v2.5l2 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                {textoPendientes(delDia)}
              </span>
              <button
                onClick={alternarFormulario}
                title="Agregar recordatorio"
                className="w-6 h-6 rounded-full border border-border-secondary bg-bg-primary text-text-secondary hover:bg-text-primary hover:text-bg-primary flex items-center justify-center text-[13px] font-medium"
              >
                {formAbierto ? '✕' : '+'}
              </button>
            </div>

            {delDia.length === 0 && !formAbierto && (
              <p className="text-xs text-text-tertiary">
                No tenés recordatorios para hoy. Agregá uno con el botón +.
              </p>
            )}

            {delDia.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {delDia.map((r) => (
                  <Tarjeta
                    key={r.id}
                    item={r}
                    estado={estadoRecordatorio(r, ahora)}
                    hoy={hoy}
                    onMarcar={marcar}
                  />
                ))}
              </div>
            )}

            {formAbierto && (
              <div className="border-t border-border-tertiary mt-2.5 pt-2.5">
                <div className="grid grid-cols-[80px_1fr_1fr] gap-1.5 mb-2">
                  <div>
                    <div className="text-[10px] text-text-tertiary mb-[3px]">Hora</div>
                    <input
                      type="time"
                      className={campo}
                      value={hora}
                      onChange={(e) => setHora(e.target.value)}
                    />
                  </div>
                  <div>
                    <div className="text-[10px] text-text-tertiary mb-[3px]">Nombre o contacto</div>
                    <input
                      className={campo}
                      value={contacto}
                      onChange={(e) => setContacto(e.target.value)}
                      placeholder="Ej: Paula Molina"
                      autoFocus
                    />
                  </div>
                  <div>
                    <div className="text-[10px] text-text-tertiary mb-[3px]">Nota</div>
                    <input
                      className={campo}
                      value={nota}
                      onChange={(e) => setNota(e.target.value)}
                      placeholder="Ej: llamar, mandar info"
                    />
                  </div>
                </div>

                {errorForm && <p className="text-xs text-red-text mb-2">{errorForm}</p>}

                <div className="flex gap-1.5 justify-end">
                  <button
                    onClick={alternarFormulario}
                    disabled={guardando}
                    className="text-xs px-3 py-1.5 rounded-md border border-border-secondary bg-bg-primary text-text-secondary"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={agregar}
                    disabled={guardando}
                    className="text-xs font-medium px-3 py-1.5 rounded-md bg-text-primary text-bg-primary disabled:opacity-60"
                  >
                    {guardando ? 'Guardando...' : 'Agregar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
