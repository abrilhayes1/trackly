// Reportes personalizados (RF45): cada persona arma sus gráficos eligiendo qué medir, cómo agrupar,
// filtros y cómo verlo, con vista previa en vivo. Privados, o compartidos con el equipo (líder).
import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../lib/api'
import { leadsParaAnalisis } from '../lib/analisis'
import { useConfigEquipo, useTerminos } from '../lib/configEquipo'
import { etiquetaInteres } from '../lib/interes'
import { useTooltip } from '../lib/useTooltip'
import { TarjetaGrafico, Barras, Columnas, NumeroGrande } from '../components/Graficos'
import { MEDIDAS, AGRUPAR, VISTAS, PERIODOS_REPORTE, ESTADOS, DEFINICION_INICIAL, calcularReporte, describir } from '../lib/reportes'

const control =
  'w-full text-xs px-2.5 py-1.5 rounded-md border border-border-secondary bg-bg-secondary text-text-primary focus:outline-none focus:border-accent focus:bg-bg-primary'

function Etiqueta({ children }) {
  return <div className="text-[11px] font-medium text-text-secondary mb-1">{children}</div>
}

function Chip({ activo, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-[11px] px-2.5 py-1 rounded-full border ${
        activo ? 'bg-accent text-white border-accent' : 'bg-bg-primary text-text-secondary border-border-secondary'
      }`}
    >
      {children}
    </button>
  )
}

// el gráfico de un reporte ya calculado
function Vista({ resultado, def, tooltip, varios }) {
  if (resultado.tipo === 'numero') {
    return <NumeroGrande valor={resultado.formato(resultado.valor)} detalle={`Sobre ${resultado.total} ${varios}`} />
  }
  if (def.vista === 'tabla') {
    return (
      <table className="w-full text-xs">
        <tbody>
          {resultado.filas.map((f) => (
            <tr key={f.etiqueta} className="border-b border-border-tertiary last:border-0">
              <td className="py-1.5 text-text-secondary">{f.etiqueta}</td>
              <td className="py-1.5 text-right font-medium text-text-primary tabular-nums">{resultado.formato(f.valor)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }
  if (def.vista === 'columnas') {
    return <Columnas datos={resultado.filas} tooltip={tooltip} formato={resultado.formato} prefijoTooltip="" />
  }
  return <Barras datos={resultado.filas} tooltip={tooltip} formato={resultado.formato} />
}

function Constructor({ inicial, datos, contexto, esLider, onGuardado, onCancelar }) {
  const { varios } = useTerminos()
  const [nombre, setNombre] = useState(inicial?.nombre || '')
  const [compartido, setCompartido] = useState(!!inicial?.compartido)
  const [def, setDef] = useState(() => structuredClone(inicial?.definicion || DEFINICION_INICIAL))
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)
  const tooltip = useTooltip()

  const cambiar = (c) => setDef((d) => ({ ...d, ...c }))
  const filtro = (c) => setDef((d) => ({ ...d, filtros: { ...d.filtros, ...c } }))

  const camposNumero = contexto.campos.filter((c) => c.tipo === 'numero')
  const camposAgrupar = contexto.campos.filter((c) => c.tipo !== 'numero')
  const origenes = [...new Set(datos.leads.map((l) => l.origen).filter(Boolean))].sort()

  // la vista previa se recalcula con cada cambio
  const valido =
    (!['suma_campo', 'promedio_campo'].includes(def.medida) || def.campoMedida) && (def.agrupar !== 'campo_cierre' || def.campoAgrupar)
  const vistaReal = def.agrupar === 'ninguno' ? 'numero' : def.vista === 'numero' ? 'barras' : def.vista
  const defVista = { ...def, vista: vistaReal }
  const resultado = valido ? calcularReporte(datos.leads, datos.cierres, defVista, contexto) : null

  async function guardar() {
    if (!nombre.trim()) return setError('Ponele un nombre al reporte.')
    if (!valido) return setError('Elegí el campo del cierre.')
    setGuardando(true)
    setError(null)
    try {
      const cuerpo = JSON.stringify({ nombre, definicion: defVista, compartido: esLider && compartido })
      const r = inicial?.id
        ? await apiFetch(`/api/reportes/${inicial.id}`, { method: 'PUT', body: cuerpo })
        : await apiFetch('/api/reportes', { method: 'POST', body: cuerpo })
      onGuardado(r)
    } catch (e) {
      setError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="grid grid-cols-[300px_1fr] gap-3 mb-5">
      <div className="bg-bg-primary border border-border-tertiary rounded-(--radius-lg) px-4 py-4 flex flex-col gap-3">
        <div>
          <Etiqueta>Nombre</Etiqueta>
          <input className={control} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej: Ganados por modalidad" />
        </div>

        <div>
          <Etiqueta>Qué medir</Etiqueta>
          <select className={control} value={def.medida} onChange={(e) => cambiar({ medida: e.target.value })}>
            {MEDIDAS.filter((m) => !['suma_campo', 'promedio_campo'].includes(m.valor) || camposNumero.length).map((m) => (
              <option key={m.valor} value={m.valor}>
                {m.etiqueta.replace('contactos', varios)}
              </option>
            ))}
          </select>
          {['suma_campo', 'promedio_campo'].includes(def.medida) && (
            <select
              className={`${control} mt-1.5`}
              value={def.campoMedida || ''}
              onChange={(e) => cambiar({ campoMedida: e.target.value || null })}
            >
              <option value="">Elegí un campo numérico...</option>
              {camposNumero.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <Etiqueta>Agrupar por</Etiqueta>
          <select className={control} value={def.agrupar} onChange={(e) => cambiar({ agrupar: e.target.value })}>
            {AGRUPAR.filter((a) => (!a.soloLider || esLider) && (a.valor !== 'campo_cierre' || camposAgrupar.length)).map((a) => (
              <option key={a.valor} value={a.valor}>
                {a.etiqueta}
              </option>
            ))}
          </select>
          {def.agrupar === 'campo_cierre' && (
            <>
              <select
                className={`${control} mt-1.5`}
                value={def.campoAgrupar || ''}
                onChange={(e) => cambiar({ campoAgrupar: e.target.value || null })}
              >
                <option value="">Elegí un campo del cierre...</option>
                {camposAgrupar.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-text-tertiary mt-1">Cuenta solo los cierres ganados que tienen ese dato.</p>
            </>
          )}
        </div>

        <div>
          <Etiqueta>Período (por fecha de ingreso)</Etiqueta>
          <div className="flex flex-wrap gap-1">
            {PERIODOS_REPORTE.map((p) => (
              <Chip key={p.valor} activo={def.filtros.dias === p.valor} onClick={() => filtro({ dias: p.valor })}>
                {p.etiqueta}
              </Chip>
            ))}
          </div>
        </div>

        <div>
          <Etiqueta>Estado</Etiqueta>
          <div className="flex flex-wrap gap-1">
            {ESTADOS.map((e) => (
              <Chip
                key={e.valor}
                activo={def.filtros.estados.includes(e.valor)}
                onClick={() =>
                  filtro({
                    estados: def.filtros.estados.includes(e.valor)
                      ? def.filtros.estados.filter((x) => x !== e.valor)
                      : [...def.filtros.estados, e.valor],
                  })
                }
              >
                {e.etiqueta}
              </Chip>
            ))}
          </div>
          <p className="text-[10px] text-text-tertiary mt-1">Sin ninguno elegido, cuentan todos.</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Etiqueta>Origen</Etiqueta>
            <select className={control} value={def.filtros.origen} onChange={(e) => filtro({ origen: e.target.value })}>
              <option value="">Todos</option>
              {origenes.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Etiqueta>Interés</Etiqueta>
            <select className={control} value={def.filtros.interes} onChange={(e) => filtro({ interes: e.target.value })}>
              <option value="">Todos</option>
              {Object.entries(etiquetaInteres).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
              <option value="sin">Sin categoría</option>
            </select>
          </div>
        </div>

        {esLider && contexto.miembros.length > 1 && (
          <div>
            <Etiqueta>Asesor</Etiqueta>
            <select className={control} value={def.filtros.asesorId} onChange={(e) => filtro({ asesorId: e.target.value })}>
              <option value="">Todo el equipo</option>
              {contexto.miembros.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </select>
          </div>
        )}

        <label className="flex items-center gap-1.5 text-xs text-text-secondary">
          <input
            type="checkbox"
            className="accent-accent"
            checked={def.filtros.destacados}
            onChange={(e) => filtro({ destacados: e.target.checked })}
          />
          Solo destacados
        </label>

        {def.agrupar !== 'ninguno' && (
          <div>
            <Etiqueta>Cómo verlo</Etiqueta>
            <div className="flex gap-1">
              {VISTAS.map((v) => (
                <Chip key={v.valor} activo={vistaReal === v.valor} onClick={() => cambiar({ vista: v.valor })}>
                  {v.etiqueta}
                </Chip>
              ))}
            </div>
          </div>
        )}

        {esLider && (
          <label className="flex items-center gap-1.5 text-xs text-text-secondary">
            <input type="checkbox" className="accent-accent" checked={compartido} onChange={(e) => setCompartido(e.target.checked)} />
            Compartir con el equipo
          </label>
        )}

        {error && <p className="text-xs text-red-text bg-red-bg border border-red-border rounded-md px-3 py-2">{error}</p>}
        <div className="flex gap-1.5 justify-end pt-1">
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
            {guardando ? 'Guardando...' : 'Guardar reporte'}
          </button>
        </div>
      </div>

      <div className="min-w-0">
        <TarjetaGrafico titulo={nombre.trim() || 'Vista previa'} sub={describir(defVista, { campos: contexto.campos, varios })}>
          {resultado ? (
            <Vista resultado={resultado} def={defVista} tooltip={tooltip} varios={varios} />
          ) : (
            <p className="text-xs text-text-tertiary py-6 text-center">Elegí el campo del cierre para ver el reporte.</p>
          )}
        </TarjetaGrafico>
      </div>
      {tooltip.nodo}
    </div>
  )
}

export default function Reportes({ userId, rol, cambios }) {
  const { config } = useConfigEquipo()
  const { varios } = useTerminos()
  const esLider = rol === 'lider'
  const [datos, setDatos] = useState(null)
  const [reportes, setReportes] = useState([])
  const [miembros, setMiembros] = useState([])
  const [ahora, setAhora] = useState(0)
  const [error, setError] = useState(null)
  const [editando, setEditando] = useState(null) // null | 'nuevo' | reporte
  const [recargas, setRecargas] = useState(0)
  const tooltip = useTooltip()

  useEffect(() => {
    Promise.all([
      leadsParaAnalisis(`${userId}:${cambios}`),
      // ganados (sus datos) y perdidos (su motivo)
      apiFetch('/api/cierres?campos=analisis'),
      apiFetch('/api/reportes'),
      esLider ? apiFetch('/api/config/equipo') : Promise.resolve({ miembros: [] }),
    ])
      .then(([leads, cierres, rep, equipo]) => {
        setDatos({ leads, cierres })
        setReportes(rep)
        setMiembros(equipo.miembros)
        setAhora(Date.now())
        setError(null)
      })
      .catch((e) => setError(e.message))
  }, [esLider, cambios, recargas, userId])

  const contexto = useMemo(
    () => ({ userId, esLider, miembros, campos: config?.campos_cierre || [], ahora }),
    [userId, esLider, miembros, config, ahora],
  )

  async function borrar(r) {
    if (!window.confirm(`¿Borrar el reporte "${r.nombre}"?`)) return
    try {
      await apiFetch(`/api/reportes/${r.id}`, { method: 'DELETE' })
      setRecargas((n) => n + 1)
    } catch (e) {
      setError(e.message)
    }
  }

  if (error) return <p className="text-sm text-red-text bg-red-bg border border-red-border rounded-md px-3 py-2">{error}</p>
  if (!datos) return <p className="text-sm text-text-secondary">Cargando...</p>

  const puedeEditar = (r) => r.creado_por === userId || (esLider && r.compartido)
  const accion = 'text-[11px] text-text-secondary hover:text-text-primary'

  return (
    <div>
      {editando ? (
        <Constructor
          key={editando === 'nuevo' ? 'nuevo' : editando.id || 'copia'}
          inicial={editando === 'nuevo' ? null : editando}
          datos={datos}
          contexto={contexto}
          esLider={esLider}
          onCancelar={() => setEditando(null)}
          onGuardado={() => {
            setEditando(null)
            setRecargas((n) => n + 1)
          }}
        />
      ) : (
        <button
          onClick={() => setEditando('nuevo')}
          className="w-full flex items-center gap-1.5 px-3 py-2 mb-4 rounded-(--radius-lg) border border-dashed border-border-secondary text-xs text-text-secondary hover:bg-bg-secondary"
        >
          + Nuevo reporte
        </button>
      )}

      {reportes.length === 0 && !editando && (
        <p className="text-center py-8 text-xs text-text-tertiary">
          Todavía no hay reportes. Armá uno eligiendo qué medir, cómo agruparlo y qué filtrar.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        {reportes.map((r) => {
          const res = calcularReporte(datos.leads, datos.cierres, r.definicion, contexto)
          const sub = `${describir(r.definicion, { campos: contexto.campos, varios })}${
            r.compartido ? ` · compartido${r.creado_por !== userId ? ` por ${r.autor?.nombre || 'el líder'}` : ''}` : ''
          }`
          return (
            <TarjetaGrafico
              key={r.id}
              titulo={r.nombre}
              sub={sub}
              datos={res.tipo === 'grupos' && r.definicion.vista !== 'tabla' ? res.filas : null}
              formato={res.formato}
              acciones={
                <>
                  {puedeEditar(r) && (
                    <button className={accion} onClick={() => setEditando(r)}>
                      Editar
                    </button>
                  )}
                  <button
                    className={accion}
                    onClick={() => setEditando({ ...r, id: null, nombre: `${r.nombre} (copia)`, compartido: false })}
                  >
                    Duplicar
                  </button>
                  {puedeEditar(r) && (
                    <button className={`${accion} hover:text-red-text`} onClick={() => borrar(r)}>
                      Borrar
                    </button>
                  )}
                </>
              }
            >
              <Vista resultado={res} def={r.definicion} tooltip={tooltip} varios={varios} />
            </TarjetaGrafico>
          )
        })}
      </div>
      {tooltip.nodo}
    </div>
  )
}
