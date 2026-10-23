// Estadísticas (RF37 · CU11): leads por origen, distribución por interés, evolución semanal y tasa
// de contacto. El asesor ve lo suyo; el líder, todo el equipo con filtro por asesor.
// Gráficos de una sola serie en el color de acento, con tooltip al pasar el mouse y vista de tabla.
import { useEffect, useMemo, useState } from 'react'
import { TarjetaGrafico as Tarjeta, Barras, Columnas } from '../components/Graficos'
import { useTooltip } from '../lib/useTooltip'
import Reportes from './Reportes'
import { apiFetch } from '../lib/api'
import { leadsParaAnalisis } from '../lib/analisis'
import Avatar from '../components/Avatar'
import { useConfigEquipo, useTerminos } from '../lib/configEquipo'
import { calcularEstadisticas, compararAsesores, PERIODOS, porcentaje } from '../lib/estadisticas'

function Indicador({ label, valor, detalle }) {
  return (
    <div className="bg-bg-secondary rounded-md px-4 py-3">
      <div className="text-[11px] text-text-secondary mb-1">{label}</div>
      <div className="text-[22px] font-semibold text-text-primary">{valor}</div>
      {detalle && <div className="text-[11px] text-text-tertiary mt-0.5">{detalle}</div>}
    </div>
  )
}

function Chip({ activo, onClick, children, conAvatar }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 text-[11px] rounded-full border ${conAvatar ? 'pl-[5px] pr-2.5' : 'px-3'} py-1 ${
        activo ? 'bg-accent text-white border-accent' : 'bg-bg-primary text-text-secondary border-border-secondary'
      }`}
    >
      {children}
    </button>
  )
}

export default function Estadisticas({ userId, rol, cambios }) {
  const { varios, Varios } = useTerminos()
  const esLider = rol === 'lider'
  const [leads, setLeads] = useState([])
  const [cierres, setCierres] = useState([])
  const [miembros, setMiembros] = useState([])
  const [ahora, setAhora] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [dias, setDias] = useState(30)
  const [asesor, setAsesor] = useState('')
  const [pestana, setPestana] = useState('resumen')
  const tooltip = useTooltip()

  useEffect(() => {
    Promise.all([
      leadsParaAnalisis(`${userId}:${cambios}`),
      esLider ? apiFetch('/api/config/equipo') : Promise.resolve({ miembros: [] }),
      // los cierres: el motivo de los perdidos ("¿Por qué se pierden?") y los datos de los ganados (comparación)
      apiFetch('/api/cierres?campos=analisis').catch(() => []),
    ])
      .then(([l, equipo, c]) => {
        setLeads(l)
        setCierres(c)
        setMiembros(equipo.miembros)
        setAhora(Date.now())
        setError(null)
      })
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false))
  }, [esLider, cambios, userId])

  // el asesor ve solo lo suyo; el líder, todo el equipo o una persona
  const asesorId = esLider ? asesor : userId
  const e = useMemo(() => calcularEstadisticas(leads, { dias, asesorId, ahora, cierres }), [leads, dias, asesorId, ahora, cierres])
  const periodo = PERIODOS.find((p) => p.valor === dias).etiqueta.toLowerCase()

  // comparación entre asesores (solo el líder, con todo el equipo): si los cierres ganados tienen un
  // campo numérico (por ejemplo el importe), también se suma
  const { config } = useConfigEquipo()
  const campoNumero = (config?.campos_cierre || []).find((c) => c.tipo === 'numero')
  const comparar = esLider && asesor === '' && miembros.length > 1
  const filas = useMemo(
    () => (comparar ? compararAsesores(leads, { dias, ahora, cierres, miembros, campoImporte: campoNumero?.id }) : []),
    [comparar, leads, dias, ahora, cierres, miembros, campoNumero?.id],
  )

  return (
    <div className="p-5 max-w-[1040px]">
      <h1 className="text-base font-semibold tracking-tight text-text-primary mb-[3px]">Estadísticas</h1>
      <p className="text-xs text-text-secondary mb-4">
        {esLider ? 'La actividad comercial de todo el equipo' : 'Resumen de tu actividad comercial'}
      </p>

      <div className="flex gap-[5px] border-b border-border-tertiary mb-4">
        {[
          ['resumen', 'Resumen'],
          ['reportes', 'Reportes'],
        ].map(([v, t]) => (
          <button
            key={v}
            onClick={() => setPestana(v)}
            className={`text-xs px-3.5 py-2 -mb-px border-b-2 ${
              pestana === v
                ? 'text-accent-text font-semibold border-accent'
                : 'text-text-secondary border-transparent hover:text-text-primary'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {pestana === 'reportes' && <Reportes userId={userId} rol={rol} cambios={cambios} />}

      {pestana === 'resumen' && (
        <>
          {/* filtros: una sola fila arriba, valen para todo lo de abajo */}
          <div className="flex flex-wrap items-center gap-[5px] mb-5">
            {PERIODOS.map((p) => (
              <Chip key={p.valor} activo={dias === p.valor} onClick={() => setDias(p.valor)}>
                {p.etiqueta}
              </Chip>
            ))}
            {esLider && miembros.length > 1 && (
              <>
                <span className="w-px h-5 bg-border-tertiary mx-1.5" />
                <Chip activo={asesor === ''} onClick={() => setAsesor('')}>
                  Todo el equipo
                </Chip>
                {miembros.map((m) => (
                  <Chip key={m.id} conAvatar activo={asesor === m.id} onClick={() => setAsesor(m.id)}>
                    <Avatar nombre={m.nombre} foto={m.avatar_url} tamano="w-5 h-5 text-[8px]" />
                    {m.nombre.split(' ')[0]}
                  </Chip>
                ))}
              </>
            )}
          </div>

          {cargando && <p className="text-sm text-text-secondary">Cargando...</p>}
          {error && <p className="text-sm text-red-text bg-red-bg border border-red-border rounded-md px-3 py-2">{error}</p>}

          {!cargando && !error && (
            <>
              <div className="grid grid-cols-4 gap-2 mb-4">
                <Indicador label={`${Varios} ingresados`} valor={e.ingresados} detalle={periodo} />
                <Indicador
                  label="Tasa de contacto"
                  valor={porcentaje(e.tasaContacto)}
                  detalle={`${e.contactados} de ${e.ingresados} contactados`}
                />
                <Indicador label="Ganados" valor={e.ganados} detalle={`${e.perdidos} perdidos`} />
                <Indicador
                  label="Tasa de conversión"
                  valor={porcentaje(e.tasaConversion)}
                  detalle={e.ganados + e.perdidos ? 'ganados sobre cerrados' : 'todavía sin cierres'}
                />
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <Tarjeta titulo={`${Varios} por origen`} sub={`De dónde vinieron los ${varios} ingresados`} datos={e.porOrigen}>
                  <Barras datos={e.porOrigen} tooltip={tooltip} />
                </Tarjeta>
                <Tarjeta titulo="Nivel de interés" sub={`Cómo están categorizados los ${varios} ingresados`} datos={e.porInteres}>
                  <Barras datos={e.porInteres} tooltip={tooltip} />
                </Tarjeta>
              </div>

              {comparar && (
                <>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <Tarjeta titulo="Ganados por asesor" datos={filas.map((f) => ({ etiqueta: f.nombre, valor: f.ganados }))}>
                      <Barras datos={filas.map((f) => ({ etiqueta: f.nombre, valor: f.ganados }))} tooltip={tooltip} />
                    </Tarjeta>
                    <Tarjeta
                      titulo="Tasa de conversión por asesor"
                      sub="Ganados sobre cerrados"
                      datos={filas.map((f) => ({ etiqueta: f.nombre, valor: f.tasaConversion ?? 0 }))}
                      columna="Conversión"
                      formato={(x) => `${Math.round(x * 100)}%`}
                    >
                      <Barras
                        datos={filas.map((f) => ({ etiqueta: f.nombre, valor: f.tasaConversion ?? 0 }))}
                        tooltip={tooltip}
                        formato={(x) => `${Math.round(x * 100)}%`}
                      />
                    </Tarjeta>
                  </div>
                  <section className="bg-bg-primary border border-border-tertiary rounded-(--radius-lg) px-[1.1rem] py-4 mb-3 overflow-x-auto">
                    <h2 className="text-[13px] font-semibold text-text-primary mb-3">Comparación del equipo</h2>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-[10px] uppercase tracking-[0.04em] text-text-tertiary">
                          {['Asesor', 'Ingresados', 'Contactados', 'Ganados', 'Perdidos', 'Conversión', 'Se vencieron']
                            .concat(campoNumero ? [campoNumero.nombre] : [])
                            .map((t, i) => (
                              <th key={t} className={`font-medium pb-2 border-b border-border-tertiary ${i ? 'text-right' : 'text-left'}`}>
                                {t}
                              </th>
                            ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filas.map((f) => (
                          <tr
                            key={f.id}
                            onClick={() => setAsesor(f.id)}
                            title={`Ver las estadísticas de ${f.nombre}`}
                            className="border-b border-border-tertiary last:border-0 cursor-pointer hover:bg-bg-secondary"
                          >
                            <td className="py-2">
                              <span className="flex items-center gap-2 text-text-primary">
                                <Avatar nombre={f.nombre} foto={f.avatar_url} tamano="w-[22px] h-[22px] text-[8px]" />
                                {f.nombre}
                              </span>
                            </td>
                            <td className="py-2 text-right tabular-nums text-text-primary">{f.ingresados}</td>
                            <td className="py-2 text-right tabular-nums text-text-primary">
                              {f.contactados} <span className="text-text-tertiary">({porcentaje(f.tasaContacto)})</span>
                            </td>
                            <td className="py-2 text-right tabular-nums text-text-primary">{f.ganados}</td>
                            <td className="py-2 text-right tabular-nums text-text-primary">{f.perdidos}</td>
                            <td className="py-2 text-right tabular-nums text-text-primary">{porcentaje(f.tasaConversion)}</td>
                            <td className="py-2 text-right tabular-nums text-text-primary">{f.vencidos}</td>
                            {campoNumero && (
                              <td className="py-2 text-right tabular-nums text-text-primary">{f.importe.toLocaleString('es-AR')}</td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </section>
                </>
              )}

              <div className="mb-3">
                <Tarjeta
                  titulo="¿Por qué se pierden?"
                  sub={`El motivo de los ${varios} cerrados como perdidos (los motivos se configuran en Configuración)`}
                  datos={e.porMotivo}
                >
                  {e.perdidos === 0 ? (
                    <p className="text-xs text-text-tertiary py-6 text-center">No hay perdidos en este período.</p>
                  ) : (
                    <Barras datos={e.porMotivo} tooltip={tooltip} />
                  )}
                </Tarjeta>
              </div>

              <Tarjeta
                titulo="Evolución semanal"
                sub={`${Varios} nuevos por semana`}
                datos={e.porSemana.map((s) => ({ etiqueta: `Semana del ${s.etiqueta}`, valor: s.valor }))}
              >
                {e.ingresados === 0 ? (
                  <p className="text-xs text-text-tertiary py-6 text-center">Sin datos en este período.</p>
                ) : (
                  <Columnas datos={e.porSemana} tooltip={tooltip} />
                )}
              </Tarjeta>
              <p className="text-[10px] text-text-tertiary mt-3">
                Se cuentan los {varios} ingresados en el período. Un contacto cuenta como contactado si tiene un contacto registrado o ya se
                cerró.
              </p>
            </>
          )}
        </>
      )}
      {tooltip.nodo}
    </div>
  )
}
