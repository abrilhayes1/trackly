// Panel del líder (RF38, RF39, RF40 · CU14, CU15): el estado de todo el equipo, el resumen por
// asesor, los leads sin asignar y la reasignación. Sigue el panel del prototipo (docs/prototipos).
import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../lib/api'
import { agruparLeads } from '../lib/urgencia'
import { colorPorInteres, sinCategoria, etiquetaInteres } from '../lib/interes'
import { useConfigEquipo, useTerminos } from '../lib/configEquipo'
import { useLeadsEquipo } from '../lib/leadsEquipo'
import Avatar from '../components/Avatar'

const ESTADOS = {
  porVencer: { label: 'Por vencer', clases: 'bg-red-bg text-red-text border-red-border' },
  estaSemana: { label: 'Esta semana', clases: 'bg-amber-bg text-amber-text border-amber-border' },
  sinContactar: { label: 'Sin contactar', clases: 'bg-avatar-bg text-urgent-blue border-dot-blue' },
  sinProximoPaso: { label: 'Sin próximo paso', clases: 'bg-purple-bg text-purple-text border-purple-border' },
  alDia: { label: 'Al día', clases: 'bg-green-bg text-green-text border-green-border' },
  vencido: { label: 'Vencido', clases: 'bg-bg-tertiary text-text-primary border-border-primary' },
}

function Pill({ clases, children }) {
  return <span className={`text-[10px] px-[7px] py-0.5 rounded-full border whitespace-nowrap ${clases}`}>{children}</span>
}

// con onClick se puede tocar para ver esos contactos (activo = es el filtro que se está mostrando)
function Indicador({ label, valor, color = 'text-text-primary', activo = false, onClick }) {
  const contenido = (
    <>
      <div className="text-[11px] text-text-secondary mb-1">{label}</div>
      <div className={`text-[22px] font-semibold ${color}`}>{valor}</div>
    </>
  )
  if (!onClick) return <div className="bg-bg-secondary rounded-md px-4 py-3">{contenido}</div>
  return (
    <button
      onClick={onClick}
      aria-pressed={activo}
      className={`text-left bg-bg-secondary rounded-md px-4 py-3 border transition-colors ${
        activo ? 'border-accent' : 'border-transparent hover:border-border-secondary'
      }`}
    >
      {contenido}
    </button>
  )
}

// qué muestra cada indicador del detalle de un asesor
const FILTROS_ASESOR = {
  asignados: { label: 'Asignados', vacio: 'No tiene activos asignados.' },
  contactados: { label: 'Contactados', vacio: 'Todavía no contactó a ninguno.' },
  porVencer: { label: 'Por vencer', vacio: 'No tiene ninguno por vencer.' },
  vencidos: { label: 'Vencidos', vacio: 'No tiene vencidos.' },
}

function PillInteres({ interes }) {
  const c = interes ? colorPorInteres[interes] : sinCategoria
  return <Pill clases={`${c.bg} ${c.text} ${c.border}`}>{interes ? etiquetaInteres[interes] : 'Sin categoría'}</Pill>
}

// "Reasignar..." / "Asignar a..." con los miembros del equipo (menos el actual)
function SelectorAsesor({ lead, miembros, onElegir, texto, deshabilitado }) {
  return (
    <select
      value=""
      disabled={deshabilitado}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => e.target.value && onElegir(lead, e.target.value)}
      className="text-[11px] px-2 py-1.5 rounded-md border border-border-secondary bg-bg-primary text-text-primary cursor-pointer disabled:opacity-50"
    >
      <option value="">{texto}</option>
      {miembros
        .filter((m) => m.id !== lead.asesor_id)
        .map((m) => (
          <option key={m.id} value={m.id}>
            {m.nombre}
          </option>
        ))}
    </select>
  )
}

function Pestana({ activa, onClick, children, cantidad }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 text-xs px-3.5 py-2 -mb-px border-b-2 ${
        activa ? 'text-accent-text font-semibold border-accent' : 'text-text-secondary border-transparent hover:text-text-primary'
      }`}
    >
      {children}
      {cantidad !== undefined && (
        <span className="text-[10px] font-semibold px-1.5 py-px rounded-full bg-avatar-bg text-urgent-blue">{cantidad}</span>
      )}
    </button>
  )
}

export default function PanelLider({ rol, onAbrirLead, onCambio }) {
  const { config } = useConfigEquipo()
  const { Uno, Varios, varios } = useTerminos()
  // los leads (activos y vencidos del equipo) salen de la lista compartida; acá solo se piden los miembros
  const { leads, listo, error: errorLeads } = useLeadsEquipo()
  const [miembros, setMiembros] = useState([])
  const [cargandoEquipo, setCargandoEquipo] = useState(true)
  const [errorEquipo, setErrorEquipo] = useState(null)
  const cargando = cargandoEquipo || !listo
  const error = errorEquipo || errorLeads
  const [pestana, setPestana] = useState('asesores')
  const [asesorAbierto, setAsesorAbierto] = useState(null)
  // filtros de los indicadores: en el detalle de un asesor y en la pestaña con todos los del equipo
  const [filtroAsesor, setFiltroAsesor] = useState(null)
  const [filtroEquipo, setFiltroEquipo] = useState(null) // null | 'activos' | 'vencidos'
  const [reasignando, setReasignando] = useState(null)
  const [aviso, setAviso] = useState(null)

  useEffect(() => {
    if (rol !== 'lider') return
    apiFetch('/api/config/equipo')
      .then((equipo) => {
        setMiembros(equipo.miembros)
        setErrorEquipo(null)
      })
      .catch((e) => setErrorEquipo(e.message))
      .finally(() => setCargandoEquipo(false))
  }, [rol])

  // grupo de urgencia de cada lead activo, con la misma regla que Mis leads (por cada asesor)
  const grupoDe = useMemo(() => {
    const mapa = new Map()
    const ids = new Set([...miembros.map((m) => m.id), null])
    ids.forEach((id) => {
      const grupos = agruparLeads(leads, config, id)
      Object.entries(grupos).forEach(([clave, lista]) => lista.forEach((l) => mapa.set(l.id, { clave, dias: l.dias })))
    })
    return mapa
  }, [leads, config, miembros])

  const activos = leads.filter((l) => l.estado === 'activo')
  const sinAsignar = activos.filter((l) => !l.asesor_id)
  const vencidos = leads.filter((l) => l.estado === 'vencido')
  const delEquipo = leads.filter((l) => l.estado === 'activo' || l.estado === 'vencido')

  // RF40: asignados, contactados, por vencer y vencidos de cada asesor
  function resumen(id) {
    const suyos = activos.filter((l) => l.asesor_id === id)
    return {
      asignados: suyos.length,
      contactados: suyos.filter((l) => l.ultimo_contacto).length,
      porVencer: suyos.filter((l) => grupoDe.get(l.id)?.clave === 'porVencer').length,
      vencidos: vencidos.filter((l) => l.asesor_id === id).length,
    }
  }

  const estadoDe = (l) => (l.estado === 'vencido' ? 'vencido' : grupoDe.get(l.id)?.clave || 'alDia')
  const nombreDe = (id) => miembros.find((m) => m.id === id)?.nombre

  async function reasignar(lead, asesorId) {
    setReasignando(lead.id)
    setAviso(null)
    try {
      await apiFetch(`/api/leads/${lead.id}/reasignar`, { method: 'POST', body: JSON.stringify({ asesorId }) })
      setAviso({
        tipo: 'ok',
        texto: `${lead.nombre} ${lead.asesor_id ? 'pasó a' : 'quedó asignado a'} ${nombreDe(asesorId)}. Ya aparece en su vista.`,
      })
      onCambio()
    } catch (e) {
      setAviso({ tipo: 'error', texto: e.message })
    } finally {
      setReasignando(null)
    }
  }

  if (rol !== 'lider') {
    return <div className="p-5 text-sm text-text-secondary">Esta vista es solo para el líder del equipo.</div>
  }

  // cambiar de pestaña (desde las pestañas o tocando un indicador)
  function irA(nueva, filtro = null) {
    setAviso(null)
    setPestana(nueva)
    setFiltroEquipo(filtro)
  }
  const listaEquipo = delEquipo.filter((l) => !filtroEquipo || l.estado === (filtroEquipo === 'activos' ? 'activo' : 'vencido'))

  const avisoHtml = aviso && (
    <p
      className={`text-xs border rounded-md px-3 py-2 mb-3 ${
        aviso.tipo === 'ok' ? 'text-green-text bg-green-bg border-green-border' : 'text-red-text bg-red-bg border-red-border'
      }`}
    >
      {aviso.texto}
    </p>
  )

  // ---------- detalle de un asesor ----------
  if (asesorAbierto) {
    const m = miembros.find((x) => x.id === asesorAbierto)
    const r = resumen(asesorAbierto)
    const cumple = {
      asignados: (l) => l.estado === 'activo',
      contactados: (l) => l.estado === 'activo' && !!l.ultimo_contacto,
      porVencer: (l) => l.estado === 'activo' && grupoDe.get(l.id)?.clave === 'porVencer',
      vencidos: (l) => l.estado === 'vencido',
    }
    const suyos = delEquipo
      .filter((l) => l.asesor_id === asesorAbierto && (!filtroAsesor || cumple[filtroAsesor](l)))
      .sort((a, b) => (grupoDe.get(b.id)?.dias ?? 0) - (grupoDe.get(a.id)?.dias ?? 0))
    const indicador = (clave, valor, color) => (
      <Indicador
        label={FILTROS_ASESOR[clave].label}
        valor={valor}
        color={color}
        activo={filtroAsesor === clave}
        onClick={() => setFiltroAsesor(filtroAsesor === clave ? null : clave)}
      />
    )
    return (
      <div className="p-5">
        <button
          onClick={() => {
            setAviso(null)
            setAsesorAbierto(null)
            setFiltroAsesor(null)
          }}
          className="text-xs px-3 py-1.5 rounded-md border border-border-secondary text-text-secondary hover:bg-bg-secondary mb-4"
        >
          ← Volver al panel
        </button>
        <div className="flex items-center gap-3 mb-5">
          <Avatar nombre={m?.nombre} foto={m?.avatar_url} tamano="w-[42px] h-[42px] text-sm" />
          <div>
            <h1 className="text-base font-semibold tracking-tight text-text-primary">{m?.nombre}</h1>
            <p className="text-xs text-text-secondary">{m?.rol === 'lider' ? 'Líder de equipo' : 'Asesor comercial'}</p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2 mb-5">
          {indicador('asignados', r.asignados)}
          {indicador('contactados', r.contactados, 'text-urgent-blue')}
          {indicador('porVencer', r.porVencer, 'text-urgent-amber')}
          {indicador('vencidos', r.vencidos, 'text-urgent-red')}
        </div>
        {avisoHtml}
        <div className="flex items-center gap-2 mb-1.5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-text-secondary">
            {Varios} de {m?.nombre?.split(' ')[0]}
            {filtroAsesor && ` · ${FILTROS_ASESOR[filtroAsesor].label}`}
          </div>
          {filtroAsesor && (
            <button onClick={() => setFiltroAsesor(null)} className="text-[11px] text-accent hover:underline">
              Ver todos
            </button>
          )}
        </div>
        {suyos.length === 0 && (
          <p className="text-center py-8 text-xs text-text-tertiary">
            {filtroAsesor ? FILTROS_ASESOR[filtroAsesor].vacio : `No tiene ${varios} asignados.`}
          </p>
        )}
        {suyos.map((l) => (
          <div
            key={l.id}
            onClick={() => onAbrirLead(l)}
            className="flex items-center gap-2 bg-bg-primary border border-border-tertiary rounded-(--radius-lg) px-[0.9rem] py-[0.65rem] mb-1.5 cursor-pointer hover:border-accent"
          >
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium text-text-primary">{l.nombre}</div>
              <div className="text-[11px] text-text-secondary truncate">{l.consulta || l.origen || 'Sin consulta registrada'}</div>
            </div>
            <Pill clases={ESTADOS[estadoDe(l)].clases}>{ESTADOS[estadoDe(l)].label}</Pill>
            <PillInteres interes={l.interes} />
            {l.estado === 'activo' && (
              <SelectorAsesor lead={l} miembros={miembros} onElegir={reasignar} texto="Reasignar..." deshabilitado={reasignando === l.id} />
            )}
          </div>
        ))}
      </div>
    )
  }

  // ---------- panel ----------
  return (
    <div className="p-5">
      <h1 className="text-base font-semibold tracking-tight text-text-primary mb-[3px]">Panel del equipo</h1>
      <p className="text-xs text-text-secondary mb-5">El estado de todo el equipo en tiempo real</p>

      {cargando && <p className="text-sm text-text-secondary">Cargando...</p>}
      {error && <p className="text-sm text-red-text bg-red-bg border border-red-border rounded-md px-3 py-2">{error}</p>}

      {!cargando && !error && (
        <>
          <div className="grid grid-cols-4 gap-2 mb-5">
            <Indicador
              label="Miembros del equipo"
              valor={miembros.length}
              activo={pestana === 'asesores'}
              onClick={() => irA('asesores')}
            />
            <Indicador
              label={`${Varios} activos`}
              valor={activos.length}
              activo={pestana === 'leads' && filtroEquipo === 'activos'}
              onClick={() => irA('leads', 'activos')}
            />
            <Indicador
              label="Sin asignar"
              valor={sinAsignar.length}
              color="text-urgent-blue"
              activo={pestana === 'sinAsignar'}
              onClick={() => irA('sinAsignar')}
            />
            <Indicador
              label="Vencidos sin gestión"
              valor={vencidos.length}
              color="text-urgent-red"
              activo={pestana === 'leads' && filtroEquipo === 'vencidos'}
              onClick={() => irA('leads', 'vencidos')}
            />
          </div>

          <div className="flex gap-[5px] border-b border-border-tertiary mb-4">
            <Pestana activa={pestana === 'asesores'} onClick={() => irA('asesores')}>
              Asesores
            </Pestana>
            <Pestana activa={pestana === 'leads'} onClick={() => irA('leads')}>
              {Varios} del equipo
            </Pestana>
            <Pestana activa={pestana === 'sinAsignar'} onClick={() => irA('sinAsignar')} cantidad={sinAsignar.length}>
              Sin asignar
            </Pestana>
          </div>

          {avisoHtml}

          {pestana === 'asesores' && (
            <>
              <p className="text-xs text-text-secondary mb-3">Tocá a alguien para ver sus {varios} y su actividad</p>
              {miembros.map((m) => {
                const r = resumen(m.id)
                return (
                  <div
                    key={m.id}
                    onClick={() => {
                      setAviso(null)
                      setAsesorAbierto(m.id)
                    }}
                    className="flex items-center gap-3 px-4 py-3 mb-2 border border-border-tertiary rounded-(--radius-lg) bg-bg-primary cursor-pointer hover:border-accent transition-colors"
                  >
                    <Avatar nombre={m.nombre} foto={m.avatar_url} tamano="w-[34px] h-[34px] text-[11px]" />
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium text-text-primary">{m.nombre}</div>
                      <div className="text-[11px] text-text-secondary">
                        {r.asignados === 1 ? `1 ${Uno.toLowerCase()} asignado` : `${r.asignados} ${varios} asignados`}
                        {m.rol === 'lider' ? ' · líder' : ''}
                      </div>
                    </div>
                    <div className="ml-auto flex gap-[18px] shrink-0">
                      {[
                        ['Contact.', r.contactados, false],
                        ['Por vencer', r.porVencer, r.porVencer > 0],
                        ['Vencidos', r.vencidos, r.vencidos > 0],
                      ].map(([label, n, alerta]) => (
                        <div key={label} className="text-center">
                          <div className={`text-[15px] font-semibold ${alerta ? 'text-urgent-red' : 'text-text-primary'}`}>{n}</div>
                          <div className="text-[10px] uppercase tracking-[0.03em] text-text-tertiary mt-px">{label}</div>
                        </div>
                      ))}
                    </div>
                    <span className="text-text-tertiary shrink-0">›</span>
                  </div>
                )
              })}
              {miembros.length === 1 && (
                <p className="text-[11px] text-text-tertiary mt-2">
                  Todavía sos la única persona del equipo. Invitá asesores desde Configuración.
                </p>
              )}
            </>
          )}

          {pestana === 'leads' && (
            <>
              <div className="flex items-center gap-2 mb-3">
                <p className="text-xs text-text-secondary">
                  {filtroEquipo === 'activos'
                    ? `Los ${varios} activos del equipo, con su asesor`
                    : filtroEquipo === 'vencidos'
                      ? `Los ${varios} vencidos del equipo: se reclaman en Archivo`
                      : `Los ${varios} activos y vencidos del equipo, con su asesor`}
                </p>
                {filtroEquipo && (
                  <button onClick={() => setFiltroEquipo(null)} className="text-[11px] text-accent hover:underline">
                    Ver todos
                  </button>
                )}
              </div>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-[0.04em] text-text-tertiary">
                    {[Uno, 'Asignado a', 'Estado', 'Interés', ''].map((t) => (
                      <th key={t} className="font-medium px-2.5 py-2 border-b border-border-tertiary">
                        {t}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {listaEquipo.map((l) => (
                    <tr key={l.id} onClick={() => onAbrirLead(l)} className="cursor-pointer hover:bg-bg-secondary">
                      <td className="px-2.5 py-2 border-b border-border-tertiary text-text-primary">
                        {l.destacado && <span className="text-amber-border mr-1">★</span>}
                        {l.nombre}
                      </td>
                      <td className="px-2.5 py-2 border-b border-border-tertiary">
                        {l.asesor_id ? (
                          <span className="inline-flex items-center gap-1.5 text-text-secondary">
                            <Avatar
                              nombre={nombreDe(l.asesor_id)}
                              foto={miembros.find((x) => x.id === l.asesor_id)?.avatar_url}
                              tamano="w-[22px] h-[22px] text-[8px]"
                            />
                            {nombreDe(l.asesor_id) || 'Otro asesor'}
                          </span>
                        ) : (
                          <Pill clases="bg-avatar-bg text-urgent-blue border-dot-blue">Sin asignar</Pill>
                        )}
                      </td>
                      <td className="px-2.5 py-2 border-b border-border-tertiary">
                        <Pill clases={ESTADOS[estadoDe(l)].clases}>{ESTADOS[estadoDe(l)].label}</Pill>
                      </td>
                      <td className="px-2.5 py-2 border-b border-border-tertiary">
                        <PillInteres interes={l.interes} />
                      </td>
                      <td className="px-2.5 py-2 border-b border-border-tertiary text-right">
                        {l.estado === 'activo' ? (
                          <SelectorAsesor
                            lead={l}
                            miembros={miembros}
                            onElegir={reasignar}
                            texto={l.asesor_id ? 'Reasignar...' : 'Asignar a...'}
                            deshabilitado={reasignando === l.id}
                          />
                        ) : (
                          <span className="text-[10px] text-text-tertiary">Se reclama en Archivo</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {listaEquipo.length === 0 && (
                <p className="text-center py-8 text-xs text-text-tertiary">
                  {filtroEquipo === 'vencidos'
                    ? 'No hay vencidos sin gestión.'
                    : filtroEquipo === 'activos'
                      ? `No hay ${varios} activos.`
                      : `Todavía no hay ${varios} en el equipo.`}
                </p>
              )}
            </>
          )}

          {pestana === 'sinAsignar' && (
            <>
              <p className="text-xs text-text-secondary mb-3">{Varios} que llegaron y todavía no tienen asesor. Asignalos al equipo.</p>
              {sinAsignar.length === 0 && (
                <p className="text-center py-8 text-xs text-text-tertiary">
                  No hay {varios} sin asignar. Todo el equipo tiene sus contactos repartidos.
                </p>
              )}
              {sinAsignar.map((l) => (
                <div
                  key={l.id}
                  onClick={() => onAbrirLead(l)}
                  className="flex items-center gap-2 bg-bg-primary border border-border-tertiary rounded-(--radius-lg) px-[0.9rem] py-[0.65rem] mb-1.5 cursor-pointer hover:border-accent"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium text-text-primary">{l.nombre}</div>
                    <div className="text-[11px] text-text-secondary truncate">
                      {[l.origen, l.consulta].filter(Boolean).join(' · ') || 'Sin consulta registrada'}
                    </div>
                  </div>
                  <PillInteres interes={l.interes} />
                  <SelectorAsesor
                    lead={l}
                    miembros={miembros}
                    onElegir={reasignar}
                    texto="Asignar a..."
                    deshabilitado={reasignando === l.id}
                  />
                </div>
              ))}
            </>
          )}
        </>
      )}
    </div>
  )
}
