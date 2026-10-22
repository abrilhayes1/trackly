// Plantillas de mensajes (Mi perfil): ver las propias y las del equipo, crear, editar y borrar.
// Las del equipo las carga y edita el líder; cada persona puede tener las suyas.
import { useEffect, useRef, useState } from 'react'
import { apiFetch } from '../lib/api'
import { CANALES, VARIABLES, completar } from '../lib/plantillas'

const campo =
  'w-full text-sm px-3 py-2 rounded-md border border-border-secondary bg-bg-secondary text-text-primary focus:outline-none focus:border-accent focus:bg-bg-primary'
const VACIA = { nombre: '', canal: 'ambos', asunto: '', texto: '', compartida: false }
const EJEMPLO = Object.fromEntries(VARIABLES.map((v) => [v.clave, v.ejemplo]))

function Formulario({ inicial, esLider, onGuardar, onCancelar }) {
  const [p, setP] = useState(inicial)
  const [error, setError] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const areaTexto = useRef(null)
  const cambiar = (c) => setP((actual) => ({ ...actual, ...c }))

  // agrega {variable} donde está el cursor
  function insertar(clave) {
    const area = areaTexto.current
    const marca = `{${clave}}`
    const inicio = area?.selectionStart ?? p.texto.length
    const fin = area?.selectionEnd ?? p.texto.length
    cambiar({ texto: p.texto.slice(0, inicio) + marca + p.texto.slice(fin) })
    requestAnimationFrame(() => {
      area?.focus()
      area?.setSelectionRange(inicio + marca.length, inicio + marca.length)
    })
  }

  async function guardar() {
    setError(null)
    if (!p.nombre.trim()) return setError('Ponele un nombre a la plantilla.')
    if (!p.texto.trim()) return setError('Escribí el texto del mensaje.')
    setGuardando(true)
    try {
      await onGuardar(p)
    } catch (e) {
      setError(e.message)
      setGuardando(false)
    }
  }

  return (
    <div className="border border-border-secondary rounded-md p-3.5 mb-3 bg-bg-secondary/40">
      <div className="grid grid-cols-[1fr_180px] gap-2 mb-2">
        <div>
          <div className="text-[11px] font-medium text-text-secondary mb-1">Nombre</div>
          <input
            className={campo}
            value={p.nombre}
            maxLength={60}
            onChange={(e) => cambiar({ nombre: e.target.value })}
            placeholder="Ej: Primer contacto"
          />
        </div>
        <div>
          <div className="text-[11px] font-medium text-text-secondary mb-1">Para</div>
          <select className={campo} value={p.canal} onChange={(e) => cambiar({ canal: e.target.value })}>
            {CANALES.map((c) => (
              <option key={c.valor} value={c.valor}>
                {c.etiqueta}
              </option>
            ))}
          </select>
        </div>
      </div>
      {p.canal !== 'whatsapp' && (
        <div className="mb-2">
          <div className="text-[11px] font-medium text-text-secondary mb-1">Asunto del email</div>
          <input
            className={campo}
            value={p.asunto || ''}
            maxLength={150}
            onChange={(e) => cambiar({ asunto: e.target.value })}
            placeholder="Ej: Info sobre tu consulta"
          />
        </div>
      )}
      <div className="flex items-end justify-between mb-1">
        <div className="text-[11px] font-medium text-text-secondary">Mensaje</div>
        <div className="flex gap-1">
          {VARIABLES.map((v) => (
            <button
              key={v.clave}
              type="button"
              onClick={() => insertar(v.clave)}
              title={`Agregar: ${v.etiqueta}`}
              className="text-[10px] px-1.5 py-0.5 rounded border border-border-secondary bg-bg-primary text-text-secondary hover:text-text-primary"
            >
              {`{${v.clave}}`}
            </button>
          ))}
        </div>
      </div>
      <textarea
        ref={areaTexto}
        className={`${campo} resize-y`}
        rows={4}
        maxLength={2000}
        value={p.texto}
        onChange={(e) => cambiar({ texto: e.target.value })}
        placeholder="Hola {nombre}, soy {mi_nombre} de {equipo}. Te escribo por tu consulta..."
      />
      {p.texto.trim() && (
        <div className="text-[11px] text-text-secondary mt-1.5">
          <span className="text-text-tertiary">Así se ve: </span>
          {completar(p.texto, EJEMPLO)}
        </div>
      )}
      {esLider && (
        <label className="flex items-center gap-2 text-xs text-text-secondary mt-2.5 cursor-pointer">
          <input type="checkbox" checked={p.compartida} onChange={(e) => cambiar({ compartida: e.target.checked })} />
          Compartir con todo el equipo
        </label>
      )}
      {error && <p className="text-xs text-red-text bg-red-bg border border-red-border rounded-md px-3 py-2 mt-2">{error}</p>}
      <div className="flex justify-end gap-2 mt-3">
        <button
          onClick={onCancelar}
          disabled={guardando}
          className="text-xs px-3 py-1.5 rounded-md border border-border-secondary bg-bg-primary text-text-secondary"
        >
          Cancelar
        </button>
        <button
          onClick={guardar}
          disabled={guardando}
          className="text-xs font-medium px-3 py-1.5 rounded-md bg-accent text-white hover:bg-accent-dark disabled:opacity-50"
        >
          {guardando ? 'Guardando...' : 'Guardar plantilla'}
        </button>
      </div>
    </div>
  )
}

export default function PlantillasEditor({ rol, userId }) {
  const esLider = rol === 'lider'
  const [plantillas, setPlantillas] = useState(null)
  const [error, setError] = useState(null)
  const [editando, setEditando] = useState(null) // null | 'nueva' | plantilla

  useEffect(() => {
    apiFetch('/api/plantillas')
      .then(setPlantillas)
      .catch((e) => setError(e.message))
  }, [])

  const puedeEditar = (p) => p.creado_por === userId || (esLider && p.compartida)

  async function guardar(p) {
    const cuerpo = JSON.stringify({ nombre: p.nombre, canal: p.canal, asunto: p.asunto, texto: p.texto, compartida: p.compartida })
    const guardada = p.id
      ? await apiFetch(`/api/plantillas/${p.id}`, { method: 'PUT', body: cuerpo })
      : await apiFetch('/api/plantillas', { method: 'POST', body: cuerpo })
    setPlantillas((actuales) => [...(actuales || []).filter((x) => x.id !== guardada.id), guardada])
    setEditando(null)
  }

  async function borrar(p) {
    if (!window.confirm(`¿Borrar la plantilla "${p.nombre}"?`)) return
    setError(null)
    try {
      await apiFetch(`/api/plantillas/${p.id}`, { method: 'DELETE' })
      setPlantillas((actuales) => actuales.filter((x) => x.id !== p.id))
    } catch (e) {
      setError(e.message)
    }
  }

  const ordenadas = [...(plantillas || [])].sort((a, b) => Number(b.compartida) - Number(a.compartida) || a.nombre.localeCompare(b.nombre))

  return (
    <div>
      {error && <p className="text-xs text-red-text bg-red-bg border border-red-border rounded-md px-3 py-2 mb-3">{error}</p>}
      {plantillas === null && !error && <p className="text-xs text-text-tertiary">Cargando...</p>}

      {editando === 'nueva' && <Formulario inicial={VACIA} esLider={esLider} onGuardar={guardar} onCancelar={() => setEditando(null)} />}

      {plantillas && plantillas.length === 0 && editando !== 'nueva' && (
        <p className="text-xs text-text-tertiary mb-3">
          Todavía no hay plantillas. Creá una para no escribir lo mismo cada vez: en la tarjeta de cada contacto la elegís y se completa
          sola con su nombre.
        </p>
      )}

      {ordenadas.map((p) =>
        editando?.id === p.id ? (
          <Formulario
            key={p.id}
            inicial={{ ...p, asunto: p.asunto || '' }}
            esLider={esLider}
            onGuardar={guardar}
            onCancelar={() => setEditando(null)}
          />
        ) : (
          <div key={p.id} className="flex items-start gap-3 py-2.5 border-b border-border-tertiary last:border-0">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-sm text-text-primary font-medium">{p.nombre}</span>
                <span className="text-[10px] px-1.5 py-px rounded-full bg-bg-tertiary text-text-secondary">
                  {CANALES.find((c) => c.valor === p.canal)?.etiqueta}
                </span>
                {p.compartida && <span className="text-[10px] px-1.5 py-px rounded-full bg-purple-bg text-purple-text">Del equipo</span>}
              </div>
              <div className="text-xs text-text-tertiary truncate mt-0.5">{p.texto}</div>
            </div>
            {puedeEditar(p) && (
              <div className="flex gap-2 shrink-0">
                <button onClick={() => setEditando(p)} className="text-xs text-accent hover:underline">
                  Editar
                </button>
                <button onClick={() => borrar(p)} className="text-xs text-text-tertiary hover:text-red-text">
                  Borrar
                </button>
              </div>
            )}
          </div>
        ),
      )}

      {editando === null && (
        <button
          onClick={() => setEditando('nueva')}
          className="mt-3 text-xs px-3 py-1.5 rounded-md border border-border-secondary bg-bg-primary text-text-secondary hover:text-text-primary"
        >
          + Nueva plantilla
        </button>
      )}
    </div>
  )
}
