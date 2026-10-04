import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'
import {
  MODALIDADES,
  DESCUENTOS,
  etiquetaDescuento,
  etiquetaModalidad,
  formatearImporte,
} from '../lib/cierre'

const campo =
  'w-full text-xs px-2.5 py-1.5 rounded-md border border-border-secondary bg-bg-secondary text-text-primary focus:outline-none focus:border-accent focus:bg-bg-primary'

function Etiqueta({ children }) {
  return <div className="text-[10px] text-text-tertiary mb-1">{children}</div>
}

export default function CierreLead({ lead, puedeEditar, onGuardado }) {
  const [cierre, setCierre] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [formAbierto, setFormAbierto] = useState(false)
  const [tipo, setTipo] = useState('ganado')
  const [producto, setProducto] = useState('')
  const [modalidad, setModalidad] = useState('presencial')
  const [descuento, setDescuento] = useState('0')
  const [importe, setImporte] = useState('')
  const [motivo, setMotivo] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    apiFetch(`/api/cierres/${lead.id}`)
      .then(setCierre)
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false))
  }, [lead.id])

  function abrirFormulario(tipoInicial) {
    setError(null)
    setTipo(tipoInicial)
    setProducto(cierre?.producto || lead.origen || '')
    setModalidad(cierre?.modalidad || 'presencial')
    setDescuento(String(cierre?.descuento ?? 0))
    setImporte(cierre?.importe != null ? String(cierre.importe) : '')
    setMotivo(cierre?.motivo || '')
    setFormAbierto(true)
  }

  async function guardar() {
    setError(null)

    if (tipo === 'ganado') {
      if (!producto.trim()) return setError('Indicá la carrera o el producto vendido')
      if (importe.trim() === '' || Number.isNaN(Number(importe)) || Number(importe) < 0) {
        return setError('Ingresá un importe válido')
      }
    }

    const cuerpo =
      tipo === 'ganado'
        ? { tipo, producto, modalidad, descuento: Number(descuento), importe }
        : { tipo, motivo }

    setGuardando(true)
    try {
      const guardado = await apiFetch(`/api/cierres/${lead.id}`, {
        method: 'PUT',
        body: JSON.stringify(cuerpo),
      })
      setCierre(guardado)
      setFormAbierto(false)
      onGuardado(guardado)
    } catch (e) {
      setError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  if (cargando) {
    return <p className="text-xs text-text-tertiary">Cargando...</p>
  }

  const botonPrimario =
    'text-xs font-medium text-white rounded-md px-3 py-2 disabled:opacity-60 disabled:cursor-not-allowed'

  // ---------- formulario ----------
  if (formAbierto) {
    return (
      <div>
        <div className="grid grid-cols-2 gap-1 mb-3">
          {['ganado', 'perdido'].map((t) => (
            <button
              key={t}
              onClick={() => setTipo(t)}
              className={`text-xs font-medium py-1.5 rounded-md border ${
                tipo === t
                  ? t === 'ganado'
                    ? 'bg-green-bg text-green-text border-green-border'
                    : 'bg-red-bg text-red-text border-red-border'
                  : 'bg-bg-primary text-text-secondary border-border-tertiary hover:bg-bg-secondary'
              }`}
            >
              {t === 'ganado' ? 'Ganado' : 'Perdido'}
            </button>
          ))}
        </div>

        {tipo === 'ganado' ? (
          <>
            <div className="mb-2.5">
              <Etiqueta>Carrera</Etiqueta>
              <input
                className={campo}
                value={producto}
                onChange={(e) => setProducto(e.target.value)}
                placeholder="Ej: Diseño gráfico"
              />
            </div>
            <div className="grid grid-cols-2 gap-2 mb-2.5">
              <div>
                <Etiqueta>Modalidad</Etiqueta>
                <select
                  className={campo}
                  value={modalidad}
                  onChange={(e) => setModalidad(e.target.value)}
                >
                  {MODALIDADES.map((m) => (
                    <option key={m.valor} value={m.valor}>
                      {m.etiqueta}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Etiqueta>Descuento</Etiqueta>
                <select
                  className={campo}
                  value={descuento}
                  onChange={(e) => setDescuento(e.target.value)}
                >
                  {DESCUENTOS.map((d) => (
                    <option key={d} value={d}>
                      {etiquetaDescuento(d)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mb-3">
              <Etiqueta>Importe de matrícula ($)</Etiqueta>
              <input
                className={campo}
                type="number"
                min="0"
                step="0.01"
                value={importe}
                onChange={(e) => setImporte(e.target.value)}
                placeholder="Ej: 15000"
              />
            </div>
          </>
        ) : (
          <div className="mb-3">
            <Etiqueta>Motivo (opcional)</Etiqueta>
            <textarea
              className={`${campo} resize-none`}
              rows={2}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej: Precio fuera de rango, eligió otra institución..."
            />
          </div>
        )}

        {error && (
          <p className="text-xs text-red-text bg-red-bg border border-red-border rounded-md px-3 py-2 mb-2">
            {error}
          </p>
        )}

        <div className="flex gap-1.5">
          <button
            onClick={guardar}
            disabled={guardando}
            className={`${botonPrimario} flex-1 ${tipo === 'ganado' ? 'bg-green-border' : 'bg-urgent-red'}`}
          >
            {guardando
              ? 'Guardando...'
              : cierre
                ? `Guardar cierre ${tipo}`
                : `Confirmar cierre ${tipo}`}
          </button>
          <button
            onClick={() => setFormAbierto(false)}
            disabled={guardando}
            className="text-xs px-3 py-2 rounded-md border border-border-secondary text-text-secondary hover:bg-bg-secondary"
          >
            Cancelar
          </button>
        </div>
      </div>
    )
  }

  // ---------- ya tiene cierre ----------
  if (cierre) {
    const ganado = cierre.tipo === 'ganado'
    return (
      <div>
        <div
          className={`rounded-md border px-3 py-2.5 text-xs ${
            ganado
              ? 'bg-green-bg border-green-border text-green-text'
              : 'bg-red-bg border-red-border text-red-text'
          }`}
        >
          <div className="font-semibold mb-0.5">
            {ganado ? 'Cerrado como ganado' : 'Cerrado como perdido'}
          </div>
          {ganado ? (
            <div>
              {cierre.producto} · {etiquetaModalidad(cierre.modalidad)} ·{' '}
              {etiquetaDescuento(cierre.descuento)} · ${formatearImporte(cierre.importe)}
            </div>
          ) : (
            <div>{cierre.motivo || 'Sin motivo registrado'}</div>
          )}
        </div>
        {puedeEditar && (
          <button
            onClick={() => abrirFormulario(cierre.tipo)}
            className="mt-2 text-[11px] font-medium px-2.5 py-1.5 rounded-md border border-border-secondary bg-bg-primary text-text-secondary hover:bg-bg-secondary"
          >
            Editar cierre
          </button>
        )}
        {error && <p className="text-xs text-red-text mt-2">{error}</p>}
      </div>
    )
  }

  // ---------- todavía sin cierre ----------
  if (!puedeEditar) {
    return (
      <p className="text-xs text-text-tertiary">
        {lead.estado === 'ganado' || lead.estado === 'perdido'
          ? `Este lead figura como ${lead.estado}.`
          : 'Este lead todavía no tiene un cierre registrado.'}
      </p>
    )
  }

  return (
    <div>
      {(lead.estado === 'ganado' || lead.estado === 'perdido') && (
        <p className="text-[11px] text-text-tertiary mb-2">
          Este lead figura como {lead.estado}, pero no tiene los datos del cierre cargados.
        </p>
      )}
      <div className="grid grid-cols-2 gap-1.5">
        <button
          onClick={() => abrirFormulario('ganado')}
          className="text-xs font-medium py-2 rounded-md border border-green-border bg-green-bg text-green-text hover:opacity-90"
        >
          Cerrar ganado
        </button>
        <button
          onClick={() => abrirFormulario('perdido')}
          className="text-xs font-medium py-2 rounded-md border border-red-border bg-red-bg text-red-text hover:opacity-90"
        >
          Cerrar perdido
        </button>
      </div>
      {error && <p className="text-xs text-red-text mt-2">{error}</p>}
    </div>
  )
}
