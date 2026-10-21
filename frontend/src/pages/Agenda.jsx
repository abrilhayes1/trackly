// Agenda (RF25 / RF27): los recordatorios manuales y los de las tarjetas de los contactos, en tres
// vistas (5 días, semana y mes). Al tocar uno se abre su detalle.
import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'
import RecordatorioModal from '../components/RecordatorioModal'
import {
  fechaLocal,
  hhmm,
  horaSugerida,
  estadoRecordatorio,
  ordenarRecordatorios,
  recordatoriosDeLeads,
  VISTAS_AGENDA,
  moverCursor,
  diasDeVista,
  etiquetaPeriodo,
  tituloDia,
  nombreDia,
  numeroDia,
  mesCorto,
  inicioMes,
} from '../lib/agenda'

const MAX_EN_CELDA = 3
const colorHora = {
  normal: 'text-text-primary',
  pronto: 'text-urgent-amber',
  urgente: 'text-urgent-red',
  atrasado: 'text-urgent-red',
  hecho: 'text-text-tertiary',
}

function leerVista() {
  try {
    const v = localStorage.getItem('agenda-vista')
    return VISTAS_AGENDA.some((x) => x.valor === v) ? v : 'dias'
  } catch {
    return 'dias'
  }
}

// los colores de urgencia solo valen para hoy; lo que viene después se ve normal
function estadoDe(item, hoy, ahora) {
  if (!item.hecho && item.fecha > hoy) return 'normal'
  return estadoRecordatorio(item, ahora)
}

// un recordatorio en una columna de días o semana
function Evento({ item, estado, compacto, onAbrir, onCompletar }) {
  const deLead = !!item.lead
  // los de un contacto se completan registrando el contacto (y no se pueden desmarcar desde acá)
  const conCheck = !deLead || !item.hecho
  const tituloCheck = deLead ? 'Registré el contacto' : item.hecho ? 'Volver a pendiente' : 'Marcar como hecho'
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onAbrir(item)}
      onKeyDown={(e) => e.key === 'Enter' && onAbrir(item)}
      title={`${hhmm(item.hora)} · ${item.contacto}${item.nota ? ` · ${item.nota}` : ''}`}
      className={`relative w-full text-left cursor-pointer bg-bg-primary border border-border-tertiary rounded-md hover:border-accent transition-colors ${
        compacto ? 'px-2 py-1.5' : 'px-2.5 py-2'
      } ${item.hecho ? 'opacity-50' : ''}`}
    >
      {conCheck && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onCompletar(item)
          }}
          title={tituloCheck}
          aria-label={tituloCheck}
          className={`absolute top-1.5 right-1.5 w-[18px] h-[18px] rounded-full border flex items-center justify-center text-[10px] leading-none ${
            item.hecho
              ? 'bg-green-bg border-green-border text-green-text'
              : 'border-border-secondary text-transparent hover:border-green-border hover:text-green-text hover:bg-green-bg'
          }`}
        >
          ✓
        </button>
      )}
      <div className="flex items-center gap-1.5 pr-5">
        <span className={`text-[11px] font-semibold tabular-nums ${colorHora[estado]}`}>{hhmm(item.hora) || '—'}</span>
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${deLead ? 'bg-dot-blue' : 'bg-accent'}`}
          title={deLead ? 'Recordatorio de un contacto' : 'Recordatorio de la agenda'}
        />
      </div>
      <div className={`text-xs text-text-primary truncate mt-0.5 ${item.hecho ? 'line-through' : ''}`}>{item.contacto}</div>
      {!compacto && item.nota && <div className="text-[11px] text-text-tertiary truncate mt-0.5">{item.nota}</div>}
    </div>
  )
}

function Columna({ fecha, hoy, items, compacto, ahora, onAbrir, onNuevo, onCompletar }) {
  const esHoy = fecha === hoy
  const pendientes = items.filter((r) => !r.hecho).length
  return (
    <div
      className={`group flex flex-col min-w-0 rounded-(--radius-lg) border ${
        esHoy ? 'border-accent bg-purple-bg/40' : 'border-border-tertiary bg-bg-secondary'
      }`}
    >
      <div className="px-2.5 pt-2.5 pb-2 border-b border-border-tertiary">
        <div className={`text-[10px] uppercase tracking-wide ${esHoy ? 'text-accent font-semibold' : 'text-text-tertiary'}`}>
          {compacto ? nombreDia(fecha) : tituloDia(fecha, hoy)}
        </div>
        <div className="flex items-baseline justify-between">
          <span className={`text-lg font-semibold ${esHoy ? 'text-accent' : 'text-text-primary'}`}>{numeroDia(fecha)}</span>
          {pendientes > 0 && <span className="text-[10px] text-text-tertiary">{pendientes} pend.</span>}
        </div>
      </div>
      <div className="flex-1 flex flex-col gap-1.5 p-2 min-h-[320px]">
        {items.length === 0 && <p className="text-[11px] text-text-tertiary text-center pt-3">Sin recordatorios</p>}
        {items.map((r) => (
          <Evento key={r.id} item={r} estado={estadoDe(r, hoy, ahora)} compacto={compacto} onAbrir={onAbrir} onCompletar={onCompletar} />
        ))}
        {fecha >= hoy && (
          <button
            onClick={() => onNuevo(fecha)}
            className="mt-auto text-[11px] text-text-tertiary hover:text-accent rounded-md py-1 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
          >
            + Agregar
          </button>
        )}
      </div>
    </div>
  )
}

function Mes({ dias, cursor, hoy, porDia, ahora, onAbrir, onVerDia }) {
  const mes = inicioMes(cursor).slice(0, 7)
  return (
    <div className="rounded-(--radius-lg) border border-border-tertiary overflow-hidden">
      <div className="grid grid-cols-7 bg-bg-secondary border-b border-border-tertiary">
        {['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'].map((d) => (
          <div key={d} className="text-[10px] uppercase tracking-wide text-text-tertiary px-2 py-1.5">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {dias.map((fecha, i) => {
          const items = porDia(fecha)
          const fuera = fecha.slice(0, 7) !== mes
          const esHoy = fecha === hoy
          return (
            <div
              key={fecha}
              className={`min-h-[88px] p-1.5 border-border-tertiary ${i % 7 ? 'border-l' : ''} ${i >= 7 ? 'border-t' : ''} ${
                fuera ? 'bg-bg-secondary/60' : 'bg-bg-primary'
              }`}
            >
              <button
                onClick={() => onVerDia(fecha)}
                title="Ver este día"
                className={`text-[11px] w-6 h-6 rounded-full inline-flex items-center justify-center mb-0.5 hover:bg-bg-tertiary ${
                  esHoy ? 'bg-accent text-white font-semibold hover:bg-accent-dark' : fuera ? 'text-text-tertiary' : 'text-text-primary'
                }`}
              >
                {numeroDia(fecha)}
              </button>
              {numeroDia(fecha) === 1 && <span className="text-[10px] text-text-tertiary ml-1">{mesCorto(fecha)}</span>}
              <div className="flex flex-col gap-0.5">
                {items.slice(0, MAX_EN_CELDA).map((r) => (
                  <button
                    key={r.id}
                    onClick={() => onAbrir(r)}
                    title={`${hhmm(r.hora)} · ${r.contacto}`}
                    className={`flex items-center gap-1 text-left text-[10px] px-1 py-0.5 rounded hover:bg-bg-tertiary min-w-0 ${
                      r.hecho ? 'opacity-50 line-through' : ''
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${r.lead ? 'bg-dot-blue' : 'bg-accent'}`} />
                    <span className={`tabular-nums font-medium ${colorHora[estadoDe(r, hoy, ahora)]}`}>{hhmm(r.hora)}</span>
                    <span className="truncate text-text-secondary">{r.contacto}</span>
                  </button>
                ))}
                {items.length > MAX_EN_CELDA && (
                  <button onClick={() => onVerDia(fecha)} className="text-[10px] text-left px-1 text-accent hover:underline">
                    +{items.length - MAX_EN_CELDA} más
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function Agenda({ userId, onAbrirLead, onCambioLead, cambios }) {
  const [ahora, setAhora] = useState(() => new Date())
  const hoy = fechaLocal(ahora)
  const [vista, setVista] = useState(leerVista)
  const [cursor, setCursor] = useState(hoy)
  const [items, setItems] = useState([])
  const [deLeads, setDeLeads] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  // { item } para ver uno; { fecha } para crear uno nuevo
  const [modal, setModal] = useState(null)

  const dias = diasDeVista(vista, cursor)
  const desde = dias[0]
  const hasta = dias[dias.length - 1]

  // cada minuto se actualizan los colores (urgente / pronto) según la hora
  useEffect(() => {
    const reloj = setInterval(() => setAhora(new Date()), 60000)
    return () => clearInterval(reloj)
  }, [])

  // los del período en pantalla (más los atrasados sin hacer) y los de las tarjetas de los contactos
  useEffect(() => {
    Promise.all([apiFetch(`/api/recordatorios?fecha=${desde}&hasta=${hasta}`), apiFetch('/api/leads')])
      .then(([datos, leads]) => {
        setItems(datos)
        setDeLeads(recordatoriosDeLeads(leads, userId))
        setError(null)
      })
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false))
  }, [desde, hasta, userId, cambios])

  const todos = [...items, ...deLeads].sort(ordenarRecordatorios)
  const atrasados = todos.filter((r) => !r.hecho && r.fecha < hoy)
  const porDia = (fecha) => todos.filter((r) => r.fecha === fecha)

  function cambiarVista(v) {
    setVista(v)
    try {
      localStorage.setItem('agenda-vista', v)
    } catch {
      // sin almacenamiento, la vista vuelve a "Días" la próxima vez
    }
  }

  function verDia(fecha) {
    cambiarVista('dias')
    setCursor(fecha)
  }

  function abrir(item) {
    setModal({ item })
  }

  // ✓: los de la agenda se marcan o desmarcan; en los de un contacto se registra el contacto de hoy
  // (si el recordatorio todavía no llegó, además se quita, porque el contacto ya se hizo)
  async function completar(item) {
    if (item.lead) {
      const futuro = new Date(item.lead.recordatorio) > new Date()
      const respuesta = await apiFetch(`/api/leads/${item.lead.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ ultimo_contacto: new Date().toISOString(), ...(futuro && { recordatorio: null }) }),
      })
      setModal(null)
      onCambioLead(respuesta)
    } else {
      const r = await apiFetch(`/api/recordatorios/${item.id}`, { method: 'PATCH', body: JSON.stringify({ hecho: !item.hecho }) })
      guardado(r)
    }
  }

  async function moverLead(item, recordatorio) {
    const respuesta = await apiFetch(`/api/leads/${item.lead.id}`, { method: 'PATCH', body: JSON.stringify({ recordatorio }) })
    setModal(null)
    onCambioLead(respuesta)
  }

  function completarDesdeTarjeta(item) {
    setError(null)
    completar(item).catch((e) => setError(e.message))
  }

  function guardado(r) {
    setItems((actuales) => [...actuales.filter((x) => x.id !== r.id), r].sort(ordenarRecordatorios))
    setModal(null)
  }

  const flecha =
    'w-7 h-7 rounded-md border border-border-secondary bg-bg-primary text-text-secondary hover:text-text-primary flex items-center justify-center'

  return (
    <div className="p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-base font-semibold tracking-tight text-text-primary mb-[3px]">Agenda</h1>
          <p className="text-xs text-text-secondary">Tus recordatorios y los de tus contactos. Tocá uno para ver el detalle.</p>
        </div>
        <button
          onClick={() => setModal({ fecha: cursor > hoy && vista === 'dias' ? cursor : hoy })}
          className="text-xs font-medium px-3 py-2 rounded-md bg-accent text-white hover:bg-accent-dark"
        >
          + Nuevo recordatorio
        </button>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => setCursor(moverCursor(vista, cursor, -1))} className={flecha} title="Anterior">
          ‹
        </button>
        <button
          onClick={() => setCursor(hoy)}
          className="text-xs px-3 h-7 rounded-md border border-border-secondary bg-bg-primary text-text-secondary hover:text-text-primary"
        >
          Hoy
        </button>
        <button onClick={() => setCursor(moverCursor(vista, cursor, 1))} className={flecha} title="Siguiente">
          ›
        </button>
        <span className="text-sm font-medium text-text-primary ml-2 first-letter:uppercase">{etiquetaPeriodo(vista, cursor)}</span>

        <div className="ml-auto flex p-0.5 rounded-md bg-bg-tertiary">
          {VISTAS_AGENDA.map((v) => (
            <button
              key={v.valor}
              onClick={() => cambiarVista(v.valor)}
              className={`text-xs px-3 py-1 rounded ${
                vista === v.valor ? 'bg-bg-primary text-text-primary font-medium shadow-sm' : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {v.etiqueta}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-text bg-red-bg border border-red-border rounded-md px-3 py-2 mb-3">{error}</p>}

      {atrasados.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap bg-red-bg border border-red-border/40 rounded-md px-3 py-2 mb-4">
          <span className="text-xs font-medium text-red-text mr-1">
            {atrasados.length} {atrasados.length === 1 ? 'atrasado' : 'atrasados'}
          </span>
          {atrasados.map((r) => (
            <button
              key={r.id}
              onClick={() => abrir(r)}
              className="flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full bg-bg-primary border border-red-border/40 text-text-primary hover:border-red-border"
            >
              {r.lead && <span className="w-1.5 h-1.5 rounded-full bg-dot-blue" />}
              <span className="text-urgent-red tabular-nums">
                {numeroDia(r.fecha)} {mesCorto(r.fecha)}
              </span>
              <span className="truncate max-w-[140px]">{r.contacto}</span>
            </button>
          ))}
        </div>
      )}

      {cargando ? (
        <p className="text-sm text-text-secondary">Cargando...</p>
      ) : vista === 'mes' ? (
        <Mes dias={dias} cursor={cursor} hoy={hoy} porDia={porDia} ahora={ahora} onAbrir={abrir} onVerDia={verDia} />
      ) : (
        <div className={`grid gap-2 ${vista === 'semana' ? 'grid-cols-7' : 'grid-cols-5'}`}>
          {dias.map((fecha) => (
            <Columna
              key={fecha}
              fecha={fecha}
              hoy={hoy}
              items={porDia(fecha)}
              compacto={vista === 'semana'}
              ahora={ahora}
              onAbrir={abrir}
              onNuevo={(f) => setModal({ fecha: f })}
              onCompletar={completarDesdeTarjeta}
            />
          ))}
        </div>
      )}

      <div className="flex items-center gap-4 mt-3 text-[10px] text-text-tertiary">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-accent" /> Recordatorio de la agenda
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-dot-blue" /> Recordatorio de un contacto
        </span>
      </div>

      {modal && (
        <RecordatorioModal
          item={modal.item ?? null}
          fechaInicial={modal.fecha}
          horaInicial={horaSugerida(ahora)}
          hoy={hoy}
          onCerrar={() => setModal(null)}
          onGuardado={guardado}
          onCompletar={completar}
          onMoverLead={moverLead}
          onAbrirLead={(lead) => {
            setModal(null)
            onAbrirLead(lead)
          }}
        />
      )}
    </div>
  )
}
