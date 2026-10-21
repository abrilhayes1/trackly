// Ventana de un recordatorio de la agenda: crear uno nuevo, ver el detalle, editarlo o marcarlo
// como hecho. Los recordatorios que vienen de la tarjeta de un contacto se ven acá y se editan
// desde la tarjeta.
import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'
import { hhmm, fechaLarga } from '../lib/agenda'

const campo =
  'w-full text-sm px-3 py-2 rounded-md border border-border-secondary bg-bg-secondary text-text-primary focus:outline-none focus:border-accent focus:bg-bg-primary'

function Etiqueta({ children }) {
  return <div className="text-[11px] font-medium text-text-secondary mb-1">{children}</div>
}

function Dato({ label, children }) {
  return (
    <div className="mb-3">
      <Etiqueta>{label}</Etiqueta>
      <div className="text-sm text-text-primary">{children}</div>
    </div>
  )
}

// item: el recordatorio a ver (o null para uno nuevo); fechaInicial: el día elegido para uno nuevo
export default function RecordatorioModal({ item, fechaInicial, horaInicial, hoy, onCerrar, onGuardado, onCompletar, onAbrirLead }) {
  const nuevo = !item
  const deLead = !!item?.lead
  const [fecha, setFecha] = useState(item?.fecha ?? fechaInicial)
  const [hora, setHora] = useState(hhmm(item?.hora) || horaInicial)
  const [contacto, setContacto] = useState(item?.contacto ?? '')
  const [nota, setNota] = useState(item?.nota ?? '')
  const [error, setError] = useState(null)
  const [guardando, setGuardando] = useState(false)

  // Escape cierra la ventana
  useEffect(() => {
    const alApretar = (e) => e.key === 'Escape' && onCerrar()
    window.addEventListener('keydown', alApretar)
    return () => window.removeEventListener('keydown', alApretar)
  }, [onCerrar])

  const cambio =
    nuevo || fecha !== item.fecha || hora !== hhmm(item.hora) || contacto.trim() !== item.contacto || nota.trim() !== (item.nota ?? '')

  async function enviar(cuerpo) {
    setError(null)
    setGuardando(true)
    try {
      const guardado = await apiFetch(nuevo ? '/api/recordatorios' : `/api/recordatorios/${item.id}`, {
        method: nuevo ? 'POST' : 'PATCH',
        body: JSON.stringify(cuerpo),
      })
      onGuardado(guardado)
    } catch (e) {
      setError(e.message)
      setGuardando(false)
    }
  }

  async function completar() {
    setError(null)
    setGuardando(true)
    try {
      await onCompletar(item)
    } catch (e) {
      setError(e.message)
      setGuardando(false)
    }
  }

  function guardar() {
    if (!fecha) return setError('Elegí un día')
    if (nuevo && fecha < hoy) return setError('Elegí hoy o un día que venga')
    if (!hora) return setError('Elegí una hora')
    if (!contacto.trim()) return setError('Indicá el nombre o el contacto')
    enviar({ fecha, hora, contacto, nota })
  }

  const estado = item?.hecho ? 'Hecho' : item && item.fecha < hoy ? 'Atrasado' : 'Pendiente'
  const colorEstado = item?.hecho
    ? 'bg-green-bg text-green-text'
    : estado === 'Atrasado'
      ? 'bg-red-bg text-red-text'
      : 'bg-bg-tertiary text-text-secondary'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(44, 44, 42, 0.35)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCerrar()
      }}
    >
      <div
        className="bg-bg-primary rounded-2xl w-full max-w-105 max-h-[90vh] overflow-auto"
        style={{ boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)' }}
      >
        <div className="flex items-start gap-3 px-5 py-4 border-b border-border-tertiary">
          <div>
            <div className="flex items-center gap-2 text-[15px] font-semibold text-text-primary">
              {nuevo ? 'Nuevo recordatorio' : 'Recordatorio'}
              {!nuevo && <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${colorEstado}`}>{estado}</span>}
            </div>
            <div className="text-[11px] text-text-secondary mt-px">
              {nuevo ? 'Elegí el día, la hora y a quién' : `${fechaLarga(item.fecha)} · ${hhmm(item.hora) || 'sin hora'}`}
            </div>
          </div>
          <button onClick={onCerrar} className="ml-auto text-lg leading-none text-text-tertiary hover:text-text-primary">
            ✕
          </button>
        </div>

        {deLead ? (
          <div className="px-5 py-4">
            <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-avatar-bg text-urgent-blue mb-3">
              Recordatorio de un contacto
            </span>
            <Dato label="Contacto">{item.contacto}</Dato>
            <Dato label="Cuándo">
              {fechaLarga(item.fecha)} a las {hhmm(item.hora)}
            </Dato>
            <p className="text-xs text-text-tertiary mb-4">
              {item.hecho
                ? 'Ya registraste un contacto después de este recordatorio.'
                : 'Se da por hecho cuando registrás un contacto con el lead. Para cambiar la fecha, abrí la tarjeta.'}
            </p>
            {error && <p className="text-xs text-red-text bg-red-bg border border-red-border rounded-md px-3 py-2 mb-3">{error}</p>}
            <div className="flex items-center gap-2">
              {!item.hecho && (
                <button
                  onClick={completar}
                  disabled={guardando}
                  className="text-xs px-3 py-2 rounded-md border border-green-border bg-green-bg text-green-text whitespace-nowrap disabled:opacity-60"
                >
                  {guardando ? 'Guardando...' : '✓ Registré el contacto'}
                </button>
              )}
              <span className="ml-auto" />
              <button
                onClick={onCerrar}
                className="text-xs px-3 py-2 rounded-md border border-border-secondary bg-bg-primary text-text-secondary"
              >
                Cerrar
              </button>
              <button
                onClick={() => onAbrirLead(item.lead)}
                className="text-xs font-medium px-3 py-2 rounded-md bg-accent text-white hover:bg-accent-dark"
              >
                Abrir tarjeta
              </button>
            </div>
          </div>
        ) : (
          <div className="px-5 py-4">
            <div className="grid grid-cols-[1fr_110px] gap-2 mb-3">
              <div>
                <Etiqueta>Día</Etiqueta>
                <input
                  type="date"
                  className={campo}
                  value={fecha}
                  min={nuevo ? hoy : undefined}
                  onChange={(e) => setFecha(e.target.value)}
                />
              </div>
              <div>
                <Etiqueta>Hora</Etiqueta>
                <input type="time" className={campo} value={hora} onChange={(e) => setHora(e.target.value)} />
              </div>
            </div>
            <div className="mb-3">
              <Etiqueta>Nombre o contacto</Etiqueta>
              <input
                className={campo}
                value={contacto}
                onChange={(e) => setContacto(e.target.value)}
                placeholder="Ej: Paula Molina"
                maxLength={120}
                autoFocus={nuevo}
              />
            </div>
            <div className="mb-4">
              <Etiqueta>Nota</Etiqueta>
              <textarea
                className={`${campo} resize-none`}
                rows={3}
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                placeholder="Ej: llamar, mandar info de la beca"
                maxLength={200}
              />
            </div>

            {error && <p className="text-xs text-red-text bg-red-bg border border-red-border rounded-md px-3 py-2 mb-3">{error}</p>}

            <div className="flex items-center gap-2">
              {!nuevo && (
                <button
                  onClick={completar}
                  disabled={guardando}
                  className={`text-xs px-3 py-2 rounded-md border disabled:opacity-60 ${
                    item.hecho
                      ? 'border-border-secondary bg-bg-primary text-text-secondary'
                      : 'border-green-border bg-green-bg text-green-text'
                  }`}
                >
                  {item.hecho ? '↺ Volver a pendiente' : '✓ Marcar como hecho'}
                </button>
              )}
              <div className="ml-auto flex gap-2">
                <button
                  onClick={onCerrar}
                  disabled={guardando}
                  className="text-xs px-3 py-2 rounded-md border border-border-secondary bg-bg-primary text-text-secondary"
                >
                  {nuevo ? 'Cancelar' : 'Cerrar'}
                </button>
                <button
                  onClick={guardar}
                  disabled={guardando || !cambio}
                  className="text-xs font-medium px-3 py-2 rounded-md bg-accent text-white hover:bg-accent-dark disabled:opacity-50"
                >
                  {guardando ? 'Guardando...' : nuevo ? 'Agregar' : 'Guardar cambios'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
