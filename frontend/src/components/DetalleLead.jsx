import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'
import { diasDesde } from '../lib/urgencia'
import { colorPorInteres, sinCategoria, etiquetaInteres } from '../lib/interes'
import {
  iniciales,
  fechaHoraCorta,
  aInputDateTime,
  desdeInputDateTime,
  numeroWhatsApp,
} from '../lib/formato'
import CierreLead from './CierreLead'

const niveles = Object.keys(etiquetaInteres)

function Seccion({ titulo, children }) {
  return (
    <div className="px-5 py-3.5 border-b border-border-tertiary">
      {titulo && (
        <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-text-secondary mb-2">
          {titulo}
        </div>
      )}
      {children}
    </div>
  )
}

function Pill({ children, clases = 'bg-bg-secondary text-text-secondary border-border-tertiary' }) {
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${clases}`}>{children}</span>
  )
}

export default function DetalleLead({ lead, userId, rol, onCerrar, onCambio }) {
  const [historial, setHistorial] = useState([])
  const [cargandoHistorial, setCargandoHistorial] = useState(true)
  const [error, setError] = useState(null)
  const [aviso, setAviso] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [entrada, setEntrada] = useState('')
  const [recordatorio, setRecordatorio] = useState(aInputDateTime(lead.recordatorio))

  const esLider = rol === 'lider'
  const esMio = lead.asesor_id === userId
  const puedeEditar = esLider || esMio
  const nombreAsesor = lead.asesor?.nombre || 'otro asesor'

  const cargarHistorial = useCallback(async () => {
    try {
      setHistorial(await apiFetch(`/api/leads/${lead.id}/historial`))
    } catch (e) {
      setError(e.message)
    } finally {
      setCargandoHistorial(false)
    }
  }, [lead.id])

  useEffect(() => {
    cargarHistorial()
  }, [cargarHistorial])

  useEffect(() => {
    function alTeclear(e) {
      if (e.key === 'Escape') onCerrar()
    }
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [onCerrar])

  async function guardarCambios(cambios) {
    setGuardando(true)
    setError(null)
    setAviso(null)
    try {
      const respuesta = await apiFetch(`/api/leads/${lead.id}`, {
        method: 'PATCH',
        body: JSON.stringify(cambios),
      })
      const { advertencia, ...datos } = respuesta
      if (advertencia) setAviso(advertencia)
      onCambio(datos)
      await cargarHistorial()
    } catch (e) {
      setError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  async function agregarEntrada() {
    const texto = entrada.trim()
    if (!texto) return
    setGuardando(true)
    setError(null)
    try {
      const nueva = await apiFetch(`/api/leads/${lead.id}/historial`, {
        method: 'POST',
        body: JSON.stringify({ texto }),
      })
      setHistorial((actual) => [nueva, ...actual])
      setEntrada('')
    } catch (e) {
      setError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  // al guardar un cierre: el lead cambia de estado y el historial tiene una línea nueva
  function alGuardarCierre(cierre) {
    onCambio({ estado: cierre.tipo })
    cargarHistorial()
  }

  const dias = diasDesde(lead.ultimo_contacto || lead.fecha_ingreso)
  const textoDias = lead.ultimo_contacto
    ? dias === 0
      ? 'Contactado hoy'
      : `${dias} días sin contacto`
    : dias === 0
      ? 'Ingresó hoy'
      : `Ingresó hace ${dias} días · sin contactar`

  const colores = lead.interes ? colorPorInteres[lead.interes] : sinCategoria
  const whatsapp = numeroWhatsApp(lead.telefono)
  const inputClase =
    'text-xs px-2.5 py-1.5 rounded-md border border-border-secondary bg-bg-secondary text-text-primary focus:outline-none focus:border-accent focus:bg-bg-primary disabled:opacity-60 disabled:cursor-not-allowed'
  const botonSecundario =
    'text-[11px] font-medium px-2.5 py-1.5 rounded-md border border-border-secondary bg-bg-primary text-text-secondary hover:bg-bg-secondary disabled:opacity-50 disabled:cursor-not-allowed'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(44, 44, 42, 0.35)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCerrar()
      }}
    >
      <div
        className="bg-bg-primary rounded-2xl w-full max-w-110 max-h-[90vh] overflow-auto"
        style={{ boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)' }}
      >
        <div className="flex items-start gap-[11px] px-5 py-4 border-b border-border-tertiary">
          <div className="w-10 h-10 rounded-full bg-avatar-bg text-avatar-text flex items-center justify-center text-[13px] font-semibold shrink-0">
            {iniciales(lead.nombre)}
          </div>
          <div className="min-w-0">
            <div className="text-[15px] font-semibold text-text-primary">{lead.nombre}</div>
            <div className="text-[11px] text-text-secondary mt-px">
              Ingresó el{' '}
              {new Date(lead.fecha_ingreso).toLocaleDateString('es-AR', {
                day: 'numeric',
                month: 'short',
              })}
              {lead.origen ? ` · ${lead.origen}` : ''}
            </div>
          </div>
          <button
            onClick={onCerrar}
            className="ml-auto text-lg leading-none text-text-tertiary hover:text-text-primary"
          >
            ✕
          </button>
        </div>

        {!esMio && (
          <div
            className="px-5 py-2.5 border-b text-[11px]"
            style={{ background: '#FFF7E6', borderColor: '#E5C97A', color: '#7A5B12' }}
          >
            Este contacto está asignado a <strong>{nombreAsesor}</strong>.{' '}
            {esLider
              ? 'Como líder del equipo podés modificarlo.'
              : 'Podés verlo, pero no modificarlo mientras esté vigente.'}
          </div>
        )}

        <Seccion>
          <div className="flex flex-wrap gap-1.5">
            <Pill>{textoDias}</Pill>
            <Pill clases={`${colores.bg} ${colores.text} ${colores.border}`}>
              {lead.interes ? etiquetaInteres[lead.interes] : 'Sin categoría'}
            </Pill>
            {lead.estado !== 'activo' && <Pill>{lead.estado}</Pill>}
          </div>
        </Seccion>

        <Seccion titulo="Consulta original">
          <div className="bg-bg-secondary rounded-md px-3.5 py-2.5 text-xs text-text-secondary leading-relaxed">
            {lead.consulta || 'Sin consulta registrada.'}
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {lead.telefono && <Pill>{lead.telefono}</Pill>}
            {lead.email && <Pill>{lead.email}</Pill>}
          </div>
        </Seccion>

        <Seccion titulo="Nivel de interés">
          <div className="grid grid-cols-3 gap-1">
            {niveles.map((nivel) => {
              const seleccionado = lead.interes === nivel
              const c = colorPorInteres[nivel]
              return (
                <button
                  key={nivel}
                  disabled={!puedeEditar || guardando}
                  onClick={() => !seleccionado && guardarCambios({ interes: nivel })}
                  className={`text-[11px] font-medium py-[5px] px-1 rounded-md border text-center disabled:cursor-not-allowed disabled:opacity-60 ${
                    seleccionado
                      ? `${c.bg} ${c.text} ${c.border}`
                      : 'bg-bg-primary text-text-primary border-border-tertiary hover:bg-bg-secondary'
                  }`}
                >
                  {etiquetaInteres[nivel]}
                </button>
              )
            })}
          </div>
        </Seccion>

        <Seccion titulo="Contactar">
          <div className="flex gap-1.5">
            {whatsapp ? (
              <a
                href={`https://wa.me/${whatsapp}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 text-center text-xs font-medium py-2 rounded-md border border-green-border bg-green-bg text-green-text hover:opacity-90"
              >
                WhatsApp
              </a>
            ) : (
              <span className="flex-1 text-center text-xs py-2 rounded-md border border-border-tertiary text-text-tertiary">
                Sin teléfono
              </span>
            )}
            {lead.email ? (
              <a
                href={`https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(lead.email)}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 text-center text-xs font-medium py-2 rounded-md border border-border-secondary bg-bg-primary text-text-primary hover:bg-bg-secondary"
              >
                Enviar correo
              </a>
            ) : (
              <span className="flex-1 text-center text-xs py-2 rounded-md border border-border-tertiary text-text-tertiary">
                Sin email
              </span>
            )}
          </div>
        </Seccion>

        <Seccion titulo="Seguimiento">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div>
              <div className="text-[10px] text-text-tertiary">Último contacto</div>
              <div className="text-xs text-text-primary">
                {lead.ultimo_contacto ? fechaHoraCorta(lead.ultimo_contacto) : 'Todavía sin contactar'}
              </div>
            </div>
            <button
              disabled={!puedeEditar || guardando}
              onClick={() => guardarCambios({ ultimo_contacto: new Date().toISOString() })}
              className={botonSecundario}
            >
              Registré contacto hoy
            </button>
          </div>

          <div className="text-[10px] text-text-tertiary mb-1">Recordatorio</div>
          <div className="flex gap-1.5">
            <input
              type="datetime-local"
              value={recordatorio}
              disabled={!puedeEditar || guardando}
              onChange={(e) => setRecordatorio(e.target.value)}
              className={`${inputClase} flex-1`}
            />
            <button
              disabled={
                !puedeEditar ||
                guardando ||
                !recordatorio ||
                recordatorio === aInputDateTime(lead.recordatorio)
              }
              onClick={() => guardarCambios({ recordatorio: desdeInputDateTime(recordatorio) })}
              className={botonSecundario}
            >
              Guardar
            </button>
            {lead.recordatorio && (
              <button
                disabled={!puedeEditar || guardando}
                onClick={() => {
                  setRecordatorio('')
                  guardarCambios({ recordatorio: null })
                }}
                className={botonSecundario}
              >
                Quitar
              </button>
            )}
          </div>
        </Seccion>

        <Seccion titulo="Cierre">
          <CierreLead lead={lead} puedeEditar={puedeEditar} onGuardado={alGuardarCierre} />
        </Seccion>

        <Seccion titulo="Historial">
          {puedeEditar && (
            <div className="flex gap-1.5 mb-3">
              <input
                value={entrada}
                onChange={(e) => setEntrada(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') agregarEntrada()
                }}
                disabled={guardando}
                placeholder="Registrá una interacción..."
                className={`${inputClase} flex-1`}
              />
              <button
                onClick={agregarEntrada}
                disabled={guardando || !entrada.trim()}
                className="text-[11px] font-medium px-3 py-1.5 rounded-md bg-accent text-white hover:bg-accent-dark disabled:opacity-50 disabled:cursor-not-allowed"
              >
                + Agregar
              </button>
            </div>
          )}

          {error && (
            <p className="text-xs text-red-text bg-red-bg border border-red-border rounded-md px-3 py-2 mb-2">
              {error}
            </p>
          )}
          {aviso && (
            <p className="text-xs text-amber-text bg-amber-bg border border-amber-border rounded-md px-3 py-2 mb-2">
              {aviso}
            </p>
          )}

          {cargandoHistorial && <p className="text-xs text-text-tertiary">Cargando historial...</p>}
          {!cargandoHistorial && historial.length === 0 && (
            <p className="text-xs text-text-tertiary">Todavía no hay actividad registrada.</p>
          )}

          {historial.map((item) => (
            <div
              key={item.id}
              className="flex gap-[7px] py-1.5 border-b border-border-tertiary last:border-b-0"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-border-secondary mt-1 shrink-0" />
              <div>
                <div className="text-[11px] text-text-secondary leading-snug">{item.texto}</div>
                <div className="text-[10px] text-text-tertiary mt-px">
                  {fechaHoraCorta(item.created_at)}
                  {item.autor?.nombre ? ` · ${item.autor.nombre}` : ''}
                </div>
              </div>
            </div>
          ))}
        </Seccion>
      </div>
    </div>
  )
}
