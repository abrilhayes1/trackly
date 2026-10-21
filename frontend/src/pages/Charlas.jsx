// Charlas / eventos (RF29 a RF34 · CU08, CU13): el líder crea, edita y elimina; todo el equipo
// invita a sus contactos y registra la asistencia. Sigue la vista de charlas del prototipo.
import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'
import { iniciales } from '../lib/formato'
import { colorPorInteres, sinCategoria, etiquetaInteres } from '../lib/interes'
import { useConfigEquipo, useTerminos } from '../lib/configEquipo'
import { useLeadsEquipo } from '../lib/leadsEquipo'
import { nombreEventos, fechaCharla, aInputs, desdeInputs } from '../lib/charlas'

const campo =
  'w-full text-xs px-2.5 py-2 rounded-md border border-border-secondary bg-bg-secondary text-text-primary focus:outline-none focus:border-accent focus:bg-bg-primary'

function Etiqueta({ children }) {
  return <label className="block text-[11px] text-text-secondary mb-1">{children}</label>
}

function Stat({ valor, label }) {
  return (
    <div className="flex-1 bg-bg-secondary rounded-md px-3.5 py-2.5 text-center">
      <div className="text-xl font-semibold text-text-primary">{valor}</div>
      <div className="text-[10px] uppercase tracking-[0.04em] text-text-secondary mt-0.5">{label}</div>
    </div>
  )
}

function Avatar({ nombre }) {
  return (
    <span className="w-5 h-5 rounded-full bg-avatar-bg text-avatar-text inline-flex items-center justify-center text-[8px] font-semibold shrink-0">
      {iniciales(nombre)}
    </span>
  )
}

// formulario para crear o editar (solo el líder)
function FormCharla({ inicial, categorias, onGuardado, onCancelar }) {
  const [f, setF] = useState(() => ({
    nombre: inicial?.nombre || '',
    categoria: inicial?.carrera || '',
    link: inicial?.meet_link || '',
    ...aInputs(inicial?.fecha),
  }))
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)
  const cambiar = (c) => setF((x) => ({ ...x, ...c }))

  async function guardar() {
    if (!f.nombre.trim()) return setError('Ingresá el nombre.')
    if (!f.dia || !f.hora) return setError('Indicá la fecha y la hora.')
    setGuardando(true)
    setError(null)
    try {
      const cuerpo = JSON.stringify({ nombre: f.nombre, fecha: desdeInputs(f.dia, f.hora), categoria: f.categoria, link: f.link })
      const guardada = inicial
        ? await apiFetch(`/api/charlas/${inicial.id}`, { method: 'PUT', body: cuerpo })
        : await apiFetch('/api/charlas', { method: 'POST', body: cuerpo })
      onGuardado(guardada)
    } catch (e) {
      setError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="bg-bg-primary border border-border-tertiary rounded-(--radius-lg) px-4 py-4 mb-5">
      <div className="text-[13px] font-semibold text-text-primary mb-3">{inicial ? 'Editar' : 'Nueva'}</div>
      <div className="mb-2.5">
        <Etiqueta>Nombre</Etiqueta>
        <input
          className={campo}
          value={f.nombre}
          onChange={(e) => cambiar({ nombre: e.target.value })}
          placeholder="Ej: Charla informativa Diseño gráfico"
        />
      </div>
      <div className="grid grid-cols-2 gap-2 mb-2.5">
        <div>
          <Etiqueta>Fecha</Etiqueta>
          <input type="date" className={campo} value={f.dia} onChange={(e) => cambiar({ dia: e.target.value })} />
        </div>
        <div>
          <Etiqueta>Hora</Etiqueta>
          <input type="time" className={campo} value={f.hora} onChange={(e) => cambiar({ hora: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <Etiqueta>Categoría (opcional)</Etiqueta>
          <input
            className={campo}
            list="categorias-charla"
            value={f.categoria}
            onChange={(e) => cambiar({ categoria: e.target.value })}
            placeholder="Ej: Diseño gráfico"
          />
          <datalist id="categorias-charla">
            {categorias.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div>
          <Etiqueta>Enlace de la reunión (opcional)</Etiqueta>
          <input
            className={campo}
            value={f.link}
            onChange={(e) => cambiar({ link: e.target.value })}
            placeholder="https://meet.google.com/..."
          />
        </div>
      </div>
      {error && <p className="text-xs text-red-text bg-red-bg border border-red-border rounded-md px-3 py-2 mb-3">{error}</p>}
      <div className="flex gap-1.5 justify-end">
        <button
          onClick={onCancelar}
          className="text-xs px-3 py-2 rounded-md border border-border-secondary text-text-secondary hover:bg-bg-secondary"
        >
          Cancelar
        </button>
        <button
          onClick={guardar}
          disabled={guardando}
          className="text-xs font-medium px-4 py-2 rounded-md bg-accent text-white hover:bg-accent-dark disabled:opacity-60"
        >
          {guardando ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}

function Detalle({ charlaId, userId, esLider, categorias, onVolver, onAbrirLead, onCambio, cambios }) {
  const { varios } = useTerminos()
  const [charla, setCharla] = useState(null)
  // para invitar alcanzan los activos de la lista compartida
  const { leads } = useLeadsEquipo()
  const [error, setError] = useState(null)
  const [editando, setEditando] = useState(false)
  const [filtro, setFiltro] = useState('')
  const [nuevo, setNuevo] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [aviso, setAviso] = useState(null)
  const [recargas, setRecargas] = useState(0)

  useEffect(() => {
    apiFetch(`/api/charlas/${charlaId}`)
      .then((c) => {
        setCharla(c)
        setError(null)
      })
      .catch((e) => setError(e.message))
  }, [charlaId, cambios, recargas])

  if (error) return <div className="p-5 text-sm text-red-text">{error}</div>
  if (!charla) return <div className="p-5 text-sm text-text-secondary">Cargando...</div>

  // RF34: el líder filtra los invitados por quién los invitó, y los números siguen al filtro
  const invitadores = [
    ...new Map(charla.invitados.filter((i) => i.notificado_por).map((i) => [i.notificado_por, i.invitador?.nombre || 'Sin nombre'])),
  ]
  const visibles = charla.invitados.filter((i) => !filtro || i.notificado_por === filtro)
  const asistieron = visibles.filter((i) => i.asistio === true).length
  const pendientes = visibles.filter((i) => i.asistio === null).length

  const invitadosIds = new Set(charla.invitados.map((i) => i.lead?.id))
  const invitables = leads
    .filter((l) => l.estado === 'activo' && !invitadosIds.has(l.id) && (esLider || l.asesor_id === userId))
    .sort((a, b) => a.nombre.localeCompare(b.nombre))

  async function accion(fn, textoOk) {
    setOcupado(true)
    setAviso(null)
    try {
      await fn()
      if (textoOk) setAviso({ tipo: 'ok', texto: textoOk })
      setRecargas((n) => n + 1)
      onCambio()
    } catch (e) {
      setAviso({ tipo: 'error', texto: e.message })
    } finally {
      setOcupado(false)
    }
  }

  const invitar = () =>
    nuevo &&
    accion(async () => {
      await apiFetch(`/api/charlas/${charla.id}/invitados`, { method: 'POST', body: JSON.stringify({ leadId: nuevo }) })
      setNuevo('')
    }, 'Invitación registrada.')

  const asistencia = (inv, valor) =>
    accion(() =>
      apiFetch(`/api/charlas/invitados/${inv.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ asistio: inv.asistio === valor ? null : valor }),
      }),
    )

  async function eliminar() {
    if (!window.confirm(`¿Eliminar "${charla.nombre}" y sus ${charla.invitados.length} invitaciones?`)) return
    await accion(() => apiFetch(`/api/charlas/${charla.id}`, { method: 'DELETE' }))
    onVolver()
  }

  return (
    <div className="p-5">
      <div className="flex items-start gap-3 mb-4">
        <button
          onClick={onVolver}
          className="text-xs px-3 py-1.5 rounded-md border border-border-secondary text-text-secondary hover:bg-bg-secondary"
        >
          ← Volver
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold tracking-tight text-text-primary">{charla.nombre}</h1>
          <p className="text-xs text-text-secondary">
            {fechaCharla(charla.fecha)}
            {charla.carrera ? ` · ${charla.carrera}` : ''}
          </p>
        </div>
        {esLider && !editando && (
          <div className="flex gap-1.5 shrink-0">
            <button
              onClick={() => setEditando(true)}
              className="text-[11px] px-2.5 py-1.5 rounded-md border border-border-secondary text-text-secondary hover:bg-bg-secondary"
            >
              Editar
            </button>
            <button
              onClick={eliminar}
              disabled={ocupado}
              className="text-[11px] px-2.5 py-1.5 rounded-md border border-red-border text-red-text hover:bg-red-bg"
            >
              Eliminar
            </button>
          </div>
        )}
      </div>

      {editando && (
        <FormCharla
          inicial={charla}
          categorias={categorias}
          onCancelar={() => setEditando(false)}
          onGuardado={() => {
            setEditando(false)
            setRecargas((n) => n + 1)
            onCambio()
          }}
        />
      )}

      {charla.meet_link && (
        <div className="flex items-center gap-2 bg-bg-secondary rounded-md px-3.5 py-2.5 mb-4 text-xs text-text-secondary">
          Reunión:{' '}
          <a href={charla.meet_link} target="_blank" rel="noreferrer" className="text-urgent-blue font-medium truncate">
            {charla.meet_link}
          </a>
        </div>
      )}

      <div className="flex gap-2.5 mb-5">
        <Stat valor={visibles.length} label="Invitados" />
        <Stat valor={asistieron} label="Asistieron" />
        <Stat valor={pendientes} label="Sin registrar" />
      </div>

      {esLider && invitadores.length > 1 && (
        <div className="flex flex-wrap items-center gap-[5px] mb-4">
          {[['', 'Todo el equipo'], ...invitadores].map(([id, nombre]) => (
            <button
              key={id || 'todos'}
              onClick={() => setFiltro(id)}
              className={`flex items-center gap-1.5 text-[11px] rounded-full border ${id ? 'pl-[5px] pr-2.5' : 'px-3'} py-1 ${
                filtro === id ? 'bg-accent text-white border-accent' : 'bg-bg-primary text-text-secondary border-border-secondary'
              }`}
            >
              {id && <Avatar nombre={nombre} />}
              {id ? nombre.split(' ')[0] : nombre}
            </button>
          ))}
        </div>
      )}

      {aviso && (
        <p
          className={`text-xs border rounded-md px-3 py-2 mb-3 ${aviso.tipo === 'ok' ? 'text-green-text bg-green-bg border-green-border' : 'text-red-text bg-red-bg border-red-border'}`}
        >
          {aviso.texto}
        </p>
      )}

      <div className="flex gap-1.5 mb-4">
        <select value={nuevo} onChange={(e) => setNuevo(e.target.value)} className={`${campo} flex-1`}>
          <option value="">
            {invitables.length ? `Invitar a uno de ${esLider ? 'los' : 'tus'} ${varios}...` : `No quedan ${varios} para invitar`}
          </option>
          {invitables.map((l) => (
            <option key={l.id} value={l.id}>
              {l.nombre}
            </option>
          ))}
        </select>
        <button
          onClick={invitar}
          disabled={!nuevo || ocupado}
          className="text-xs font-medium px-4 rounded-md bg-accent text-white hover:bg-accent-dark disabled:opacity-50"
        >
          Invitar
        </button>
      </div>

      <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-text-secondary mb-1.5">Invitados</div>
      {visibles.length === 0 && <p className="text-center py-6 text-xs text-text-tertiary">Todavía no hay invitados.</p>}
      {visibles.map((inv) => {
        const l = inv.lead
        const c = l?.interes ? colorPorInteres[l.interes] : sinCategoria
        const puede = esLider || l?.asesor_id === userId
        return (
          <div
            key={inv.id}
            className="flex items-center gap-2.5 px-3.5 py-2.5 mb-1.5 rounded-md border border-border-tertiary bg-bg-primary"
          >
            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => l && onAbrirLead(l)}>
              <div className="text-xs font-medium text-text-primary">{l?.nombre || 'Contacto no disponible'}</div>
              <div className="text-[10px] text-text-secondary mt-px">Invitado por {inv.invitador?.nombre || 'alguien del equipo'}</div>
            </div>
            <span className={`text-[10px] px-1.5 py-px rounded-full border ${c.bg} ${c.text} ${c.border}`}>
              {l?.interes ? etiquetaInteres[l.interes] : 'Sin categoría'}
            </span>
            {[
              [true, 'Asistió', 'bg-green-bg text-green-text border-green-border'],
              [false, 'No asistió', 'bg-red-bg text-red-text border-red-border'],
            ].map(([valor, texto, activo]) => (
              <button
                key={texto}
                disabled={!puede || ocupado}
                onClick={() => asistencia(inv, valor)}
                title={puede ? undefined : 'Solo el asesor del contacto o el líder'}
                className={`text-[11px] px-2.5 py-1 rounded-full border disabled:cursor-not-allowed ${
                  inv.asistio === valor
                    ? activo
                    : 'bg-bg-primary text-text-secondary border-border-secondary hover:bg-bg-secondary disabled:opacity-50'
                }`}
              >
                {texto}
              </button>
            ))}
          </div>
        )
      })}
    </div>
  )
}

function Tarjeta({ c, pasada, onAbrir }) {
  return (
    <div
      onClick={() => onAbrir(c.id)}
      className={`bg-bg-primary border border-border-tertiary rounded-(--radius-lg) px-4 py-3.5 mb-2.5 cursor-pointer hover:border-accent ${pasada ? 'opacity-70' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[13px] font-semibold text-text-primary">{c.nombre}</div>
          <div className="text-[11px] text-text-secondary mt-0.5">{fechaCharla(c.fecha)}</div>
        </div>
        {c.carrera && (
          <span className="text-[10px] px-2 py-0.5 rounded-full border bg-purple-bg text-purple-text border-purple-border shrink-0">
            {c.carrera}
          </span>
        )}
      </div>
      <div className="flex gap-3.5 mt-2 pt-2 border-t border-border-tertiary text-[11px] text-text-secondary">
        <span>
          <strong className="text-text-primary">{c.invitados}</strong> invitados
        </span>
        <span>
          <strong className="text-text-primary">{c.asistieron}</strong> asistieron
        </span>
        {c.meet_link && <span className="ml-auto text-urgent-blue">Con enlace de reunión</span>}
      </div>
    </div>
  )
}

export default function Charlas({ userId, rol, onAbrirLead, cambios, onCambio }) {
  const { config } = useConfigEquipo()
  const [charlas, setCharlas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [creando, setCreando] = useState(false)
  const [abierta, setAbierta] = useState(null)
  const [recargas, setRecargas] = useState(0)
  const [ahora, setAhora] = useState(0)

  const esLider = rol === 'lider'
  const titulo = nombreEventos(config?.termino_evento)
  const categorias = config?.categorias_origen || []

  useEffect(() => {
    apiFetch('/api/charlas')
      .then((d) => {
        setCharlas(d)
        setAhora(Date.now())
        setError(null)
      })
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false))
  }, [cambios, recargas])

  const proximas = charlas.filter((c) => new Date(c.fecha).getTime() >= ahora - 3 * 3600e3)
  const pasadas = charlas.filter((c) => new Date(c.fecha).getTime() < ahora - 3 * 3600e3).reverse()

  if (abierta) {
    return (
      <Detalle
        charlaId={abierta}
        userId={userId}
        esLider={esLider}
        categorias={categorias}
        cambios={cambios}
        onAbrirLead={onAbrirLead}
        onCambio={onCambio}
        onVolver={() => {
          setAbierta(null)
          setRecargas((n) => n + 1)
        }}
      />
    )
  }

  return (
    <div className="p-5 max-w-[860px]">
      <h1 className="text-base font-semibold tracking-tight text-text-primary mb-[3px]">{titulo}</h1>
      <p className="text-xs text-text-secondary mb-5">
        {esLider ? 'Creá eventos y seguí quién fue invitado y quién asistió' : 'Invitá a tus contactos y registrá quién asistió'}
      </p>

      {esLider && !creando && (
        <button
          onClick={() => setCreando(true)}
          className="w-full flex items-center gap-1.5 px-3 py-2 mb-5 rounded-(--radius-lg) border border-dashed border-border-secondary text-xs text-text-secondary hover:bg-bg-secondary"
        >
          + Nueva
        </button>
      )}
      {creando && (
        <FormCharla
          categorias={categorias}
          onCancelar={() => setCreando(false)}
          onGuardado={(c) => {
            setCreando(false)
            setAbierta(c.id)
            onCambio()
          }}
        />
      )}

      {cargando && <p className="text-sm text-text-secondary">Cargando...</p>}
      {error && <p className="text-sm text-red-text bg-red-bg border border-red-border rounded-md px-3 py-2">{error}</p>}

      {!cargando && !error && charlas.length === 0 && (
        <p className="text-center py-8 text-xs text-text-tertiary">
          Todavía no hay eventos. {esLider ? 'Creá el primero con "+ Nueva".' : 'Cuando el líder cree uno, aparece acá.'}
        </p>
      )}

      {proximas.length > 0 && (
        <>
          <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-text-secondary mb-1.5">Próximas</div>
          {proximas.map((c) => (
            <Tarjeta key={c.id} c={c} onAbrir={setAbierta} />
          ))}
        </>
      )}
      {pasadas.length > 0 && (
        <>
          <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-text-secondary mb-1.5 mt-5">Pasadas</div>
          {pasadas.map((c) => (
            <Tarjeta key={c.id} c={c} pasada onAbrir={setAbierta} />
          ))}
        </>
      )}
    </div>
  )
}
