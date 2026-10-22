import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'
import { detalleCierre } from '../lib/cierre'
import { useConfigEquipo } from '../lib/configEquipo'

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
  const [datos, setDatos] = useState({})
  const [motivo, setMotivo] = useState('')
  // campos del cierre ganado que definió el líder del equipo (RF06)
  const { config } = useConfigEquipo()
  const campos = config?.campos_cierre || []
  // motivos de pérdida que definió el líder; "Otro" deja escribir uno a mano
  const motivos = config?.motivos_perdida || []
  const [otro, setOtro] = useState(false)
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
    // los valores guardados se pasan a texto para los inputs
    const iniciales = {}
    campos.forEach((c) => {
      const valor = cierre?.datos?.[c.id]
      iniciales[c.id] = valor === undefined || valor === null ? '' : String(valor)
    })
    setDatos(iniciales)
    setMotivo(cierre?.motivo || '')
    setOtro(!!cierre?.motivo && !motivos.includes(cierre.motivo))
    setFormAbierto(true)
  }

  async function guardar() {
    setError(null)

    if (tipo === 'ganado') {
      const falta = campos.find((c) => c.obligatorio && !(datos[c.id] || '').trim())
      if (falta) return setError(`Completá "${falta.nombre}"`)
      const malNumero = campos.find(
        (c) => c.tipo === 'numero' && (datos[c.id] || '').trim() && Number.isNaN(Number(datos[c.id].replace(',', '.'))),
      )
      if (malNumero) return setError(`"${malNumero.nombre}" tiene que ser un número`)
    }

    const cuerpo = tipo === 'ganado' ? { tipo, datos } : { tipo, motivo }

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

  const botonPrimario = 'text-xs font-medium text-white rounded-md px-3 py-2 disabled:opacity-60 disabled:cursor-not-allowed'

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
          <div className="mb-1">
            {campos.length === 0 && (
              <p className="text-[11px] text-text-tertiary mb-3">
                Tu equipo no tiene campos de cierre definidos: se registra solo como ganado.
              </p>
            )}
            {campos.map((c) => (
              <div key={c.id} className="mb-2.5">
                <Etiqueta>
                  {c.nombre}
                  {c.obligatorio ? ' *' : ' (opcional)'}
                </Etiqueta>
                {c.tipo === 'lista' ? (
                  <select className={campo} value={datos[c.id] || ''} onChange={(e) => setDatos({ ...datos, [c.id]: e.target.value })}>
                    <option value="">Elegí una opción</option>
                    {(c.opciones || []).map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    className={campo}
                    type={c.tipo === 'numero' ? 'number' : 'text'}
                    step={c.tipo === 'numero' ? '0.01' : undefined}
                    value={datos[c.id] || ''}
                    onChange={(e) => setDatos({ ...datos, [c.id]: e.target.value })}
                  />
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="mb-3">
            <Etiqueta>Motivo (opcional)</Etiqueta>
            {motivos.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {motivos.map((m) => {
                  const elegido = !otro && motivo === m
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setOtro(false)
                        setMotivo(elegido ? '' : m)
                      }}
                      className={`text-[11px] px-2.5 py-1 rounded-full border ${
                        elegido ? 'bg-red-bg text-red-text border-red-border' : 'bg-bg-primary text-text-secondary border-border-secondary'
                      }`}
                    >
                      {m}
                    </button>
                  )
                })}
                <button
                  type="button"
                  onClick={() => {
                    setOtro(true)
                    if (motivos.includes(motivo)) setMotivo('')
                  }}
                  className={`text-[11px] px-2.5 py-1 rounded-full border ${
                    otro ? 'bg-red-bg text-red-text border-red-border' : 'bg-bg-primary text-text-secondary border-border-secondary'
                  }`}
                >
                  Otro
                </button>
              </div>
            )}
            {(otro || motivos.length === 0) && (
              <textarea
                className={`${campo} resize-none`}
                rows={2}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ej: Precio fuera de rango, eligió otra institución..."
                autoFocus={otro}
              />
            )}
          </div>
        )}

        {error && <p className="text-xs text-red-text bg-red-bg border border-red-border rounded-md px-3 py-2 mb-2">{error}</p>}

        <div className="flex gap-1.5">
          <button
            onClick={guardar}
            disabled={guardando}
            className={`${botonPrimario} flex-1 ${tipo === 'ganado' ? 'bg-green-border' : 'bg-urgent-red'}`}
          >
            {guardando ? 'Guardando...' : cierre ? `Guardar cierre ${tipo}` : `Confirmar cierre ${tipo}`}
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
            ganado ? 'bg-green-bg border-green-border text-green-text' : 'bg-red-bg border-red-border text-red-text'
          }`}
        >
          <div className="font-semibold mb-0.5">{ganado ? 'Cerrado como ganado' : 'Cerrado como perdido'}</div>
          {ganado ? (
            <div>
              {detalleCierre(campos, cierre.datos)
                .map((d) => (d.nombre ? `${d.nombre}: ${d.texto}` : d.texto))
                .join(' · ') || 'Sin datos del cierre'}
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
        {lead.estado === 'ganado' || lead.estado === 'perdido' ? `Figura como ${lead.estado}.` : 'Todavía no tiene un cierre registrado.'}
      </p>
    )
  }

  return (
    <div>
      {(lead.estado === 'ganado' || lead.estado === 'perdido') && (
        <p className="text-[11px] text-text-tertiary mb-2">Figura como {lead.estado}, pero no tiene los datos del cierre cargados.</p>
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
