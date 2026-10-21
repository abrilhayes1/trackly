// Importar contactos desde una planilla (Excel o CSV): elegir el archivo, revisar qué columna es cada
// dato, ver la vista previa con repetidos y errores, importar de a tandas y ver el resumen.
import { useEffect, useMemo, useRef, useState } from 'react'
import { apiFetch } from '../lib/api'
import { useConfigEquipo, useTerminos } from '../lib/configEquipo'
import { useLeadsEquipo } from '../lib/leadsEquipo'
import {
  CAMPOS,
  MAX_FILAS,
  TANDA,
  aCSV,
  armarFilas,
  descargar,
  detectarColumnas,
  filaDeTitulos,
  leerPlanilla,
  plantillaCSV,
  revisarFilas,
} from '../lib/importar'

const ESTADOS = {
  ok: { texto: 'Lista', clases: 'bg-green-bg text-green-text border-green-border' },
  repetido: { texto: 'Repetida', clases: 'bg-amber-bg text-amber-text border-amber-border' },
  error: { texto: 'Con error', clases: 'bg-red-bg text-red-text border-red-border' },
}
const VISTA_PREVIA = 50

const selector =
  'w-full text-xs px-2 py-1.5 rounded-md border border-border-secondary bg-bg-secondary text-text-primary focus:outline-none focus:border-accent'

function Paso({ numero, titulo, activo, hecho }) {
  return (
    <div className={`flex items-center gap-1.5 text-[11px] ${activo ? 'text-text-primary font-medium' : 'text-text-tertiary'}`}>
      <span
        className={`w-5 h-5 rounded-full inline-flex items-center justify-center text-[10px] ${
          hecho ? 'bg-green-bg text-green-text' : activo ? 'bg-accent text-white' : 'bg-bg-tertiary text-text-tertiary'
        }`}
      >
        {hecho ? '✓' : numero}
      </span>
      {titulo}
    </div>
  )
}

function Numero({ valor, texto, clases }) {
  return (
    <div className={`rounded-md border px-3 py-2 ${clases}`}>
      <div className="text-lg font-semibold">{valor}</div>
      <div className="text-[11px]">{texto}</div>
    </div>
  )
}

export default function ImportarLeads({ rol, userId, onCerrar, onImportado }) {
  const { uno, varios, Varios } = useTerminos()
  const { config } = useConfigEquipo()
  const { leads } = useLeadsEquipo()
  const esLider = rol === 'lider'
  const elegir = useRef(null)

  const [paso, setPaso] = useState('archivo') // archivo | revisar | importando | listo
  const [archivo, setArchivo] = useState(null)
  const [datos, setDatos] = useState([])
  const [mapeo, setMapeo] = useState({})
  const [origenFijo, setOrigenFijo] = useState('')
  const [asignar, setAsignar] = useState('yo') // yo | sin | <id de un miembro>
  const [miembros, setMiembros] = useState([])
  const [soloProblemas, setSoloProblemas] = useState(false)
  const [error, setError] = useState(null)
  const [leyendo, setLeyendo] = useState(false)
  const [arrastrando, setArrastrando] = useState(false)
  const [avance, setAvance] = useState(0)
  const [resultado, setResultado] = useState(null)

  useEffect(() => {
    if (!esLider) return
    apiFetch('/api/config/equipo')
      .then((e) => setMiembros(e.miembros))
      .catch(() => setMiembros([]))
  }, [esLider])

  // Escape cierra (menos mientras importa)
  useEffect(() => {
    const alApretar = (e) => e.key === 'Escape' && paso !== 'importando' && onCerrar()
    window.addEventListener('keydown', alApretar)
    return () => window.removeEventListener('keydown', alApretar)
  }, [onCerrar, paso])

  const titulos = useMemo(() => {
    if (!datos.length) return []
    const fila = datos[filaDeTitulos(datos)] || []
    return fila.map((t, i) => String(t ?? '').trim() || `Columna ${i + 1}`)
  }, [datos])

  const filas = useMemo(
    () => (datos.length ? revisarFilas(armarFilas(datos, mapeo, { origenFijo }), leads) : []),
    [datos, mapeo, origenFijo, leads],
  )
  const cuenta = useMemo(
    () => ({
      ok: filas.filter((f) => f.estado === 'ok').length,
      repetido: filas.filter((f) => f.estado === 'repetido').length,
      error: filas.filter((f) => f.estado === 'error').length,
    }),
    [filas],
  )
  const visibles = (soloProblemas ? filas.filter((f) => f.estado !== 'ok') : filas).slice(0, VISTA_PREVIA)

  async function abrirArchivo(nuevo) {
    if (!nuevo) return
    setError(null)
    setLeyendo(true)
    try {
      const leidos = await leerPlanilla(nuevo)
      const conDatos = leidos.filter((f) => f.some((c) => String(c ?? '').trim() !== ''))
      if (conDatos.length < 2)
        throw new Error('El archivo no tiene contactos: hace falta una fila de títulos y al menos una fila con datos.')
      if (conDatos.length - 1 > MAX_FILAS) throw new Error(`El archivo tiene más de ${MAX_FILAS} filas. Dividilo en partes más chicas.`)
      setArchivo(nuevo)
      setDatos(leidos)
      setMapeo(detectarColumnas(leidos[filaDeTitulos(leidos)] || []))
      setSoloProblemas(false)
      setPaso('revisar')
    } catch (e) {
      setError(e.message)
    } finally {
      setLeyendo(false)
    }
  }

  async function importar() {
    const listas = filas.filter((f) => f.estado === 'ok')
    const destino = asignar === 'sin' ? { sinAsignar: true } : asignar === 'yo' ? { asesorId: userId } : { asesorId: asignar }
    setPaso('importando')
    setAvance(0)
    setError(null)
    const total = { importados: 0, repetidos: [], errores: [] }
    try {
      for (let i = 0; i < listas.length; i += TANDA) {
        const tanda = listas.slice(i, i + TANDA).map(({ fila, nombre, telefono, email, origen, consulta }) => ({
          fila,
          nombre,
          telefono,
          email,
          origen,
          consulta,
        }))
        const r = await apiFetch('/api/leads/importar', {
          method: 'POST',
          body: JSON.stringify({ filas: tanda, archivo: archivo.name, ...destino }),
        })
        total.importados += r.importados
        total.repetidos.push(...r.repetidos)
        total.errores.push(...r.errores)
        setAvance(Math.min(listas.length, i + TANDA))
      }
    } catch (e) {
      // lo que ya entró queda importado; se muestra hasta dónde llegó
      setError(`Se cortó la importación: ${e.message}`)
    }

    // lo que no entró: lo que ya se vio en la vista previa y lo que descartó la base
    const porFila = new Map(filas.map((f) => [f.fila, f]))
    const noEntraron = [
      ...filas.filter((f) => f.estado !== 'ok').map((f) => ({ ...f })),
      ...[...total.repetidos, ...total.errores].map((x) => ({ ...porFila.get(x.fila), motivo: x.motivo })),
    ].sort((a, b) => a.fila - b.fila)
    setResultado({ importados: total.importados, noEntraron })
    setPaso('listo')
    if (total.importados > 0) onImportado()
  }

  function descargarNoImportados() {
    descargar(
      'contactos-no-importados.csv',
      aCSV(
        ['Fila', 'Motivo', 'Nombre', 'Teléfono', 'Email', 'Origen', 'Consulta'],
        resultado.noEntraron.map((f) => [f.fila, f.motivo, f.nombre, f.telefono, f.email, f.origen, f.consulta]),
      ),
    )
  }

  const categorias = config?.categorias_origen || []
  const nombreAsignado =
    asignar === 'sin'
      ? 'sin asignar'
      : asignar === 'yo'
        ? 'a tu nombre'
        : `a ${miembros.find((m) => m.id === asignar)?.nombre || 'esa persona'}`

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'var(--color-overlay)' }}
      onClick={(e) => e.target === e.currentTarget && paso !== 'importando' && onCerrar()}
    >
      <div
        className="bg-bg-primary rounded-2xl w-full max-w-[880px] max-h-[92vh] flex flex-col"
        style={{ boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)' }}
      >
        <div className="flex items-start gap-3 px-6 py-4 border-b border-border-tertiary">
          <div>
            <div className="text-[15px] font-semibold text-text-primary">Importar {varios} desde una planilla</div>
            <div className="flex gap-4 mt-2">
              <Paso numero={1} titulo="Archivo" activo={paso === 'archivo'} hecho={paso !== 'archivo'} />
              <Paso numero={2} titulo="Revisar" activo={paso === 'revisar'} hecho={paso === 'importando' || paso === 'listo'} />
              <Paso numero={3} titulo="Importar" activo={paso === 'importando' || paso === 'listo'} hecho={paso === 'listo'} />
            </div>
          </div>
          {paso !== 'importando' && (
            <button onClick={onCerrar} className="ml-auto text-lg leading-none text-text-tertiary hover:text-text-primary">
              ✕
            </button>
          )}
        </div>

        <div className="px-6 py-5 overflow-auto">
          {error && <p className="text-xs text-red-text bg-red-bg border border-red-border rounded-md px-3 py-2 mb-4">{error}</p>}

          {/* 1) elegir el archivo */}
          {paso === 'archivo' && (
            <>
              <div
                onClick={() => !leyendo && elegir.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault()
                  setArrastrando(true)
                }}
                onDragLeave={() => setArrastrando(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setArrastrando(false)
                  abrirArchivo(e.dataTransfer.files?.[0])
                }}
                className={`cursor-pointer rounded-(--radius-lg) border-2 border-dashed px-6 py-12 text-center transition-colors ${
                  arrastrando ? 'border-accent bg-purple-bg' : 'border-border-secondary bg-bg-secondary hover:border-accent'
                }`}
              >
                <svg className="mx-auto mb-3 text-text-tertiary" width="34" height="34" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 16V4m0 0l-4 4m4-4l4 4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path d="M4 15v3a2 2 0 002 2h12a2 2 0 002-2v-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <div className="text-sm font-medium text-text-primary">
                  {leyendo ? 'Leyendo el archivo...' : 'Arrastrá tu archivo acá o tocá para elegirlo'}
                </div>
                <div className="text-xs text-text-secondary mt-1">
                  Excel (.xlsx) o CSV · hasta {MAX_FILAS.toLocaleString('es-AR')} contactos
                </div>
                <input
                  ref={elegir}
                  type="file"
                  accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="hidden"
                  onChange={(e) => {
                    abrirArchivo(e.target.files?.[0])
                    e.target.value = ''
                  }}
                />
              </div>
              <div className="flex items-start justify-between gap-4 mt-4 text-xs text-text-secondary">
                <ul className="list-disc pl-4 space-y-0.5">
                  <li>La primera fila tiene que tener los títulos de las columnas (Nombre, Teléfono, Email...).</li>
                  <li>Cada contacto necesita nombre y teléfono o email.</li>
                  <li>Los repetidos (mismo teléfono o email que uno que ya existe) no se importan.</li>
                </ul>
                <button
                  onClick={() => descargar('planilla-ejemplo-trackly.csv', plantillaCSV())}
                  className="shrink-0 text-xs px-3 py-1.5 rounded-md border border-border-secondary bg-bg-primary text-text-secondary hover:text-text-primary"
                >
                  Descargar planilla de ejemplo
                </button>
              </div>
            </>
          )}

          {/* 2) revisar columnas y vista previa */}
          {paso === 'revisar' && (
            <>
              <div className="flex items-center gap-2 mb-4 text-xs text-text-secondary">
                <span>
                  Archivo: <strong className="text-text-primary">{archivo.name}</strong>
                </span>
                <button onClick={() => setPaso('archivo')} className="text-accent hover:underline">
                  Cambiar
                </button>
              </div>

              <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-text-secondary mb-2">Qué columna es cada dato</div>
              <div className="grid grid-cols-3 gap-x-3 gap-y-2.5 mb-4">
                {CAMPOS.map((c) => (
                  <label key={c.clave} className="block">
                    <span className="block text-[11px] text-text-secondary mb-1">
                      {c.etiqueta}
                      {c.obligatorio && <span className="text-red-text"> *</span>}
                    </span>
                    <select
                      className={selector}
                      value={mapeo[c.clave] ?? ''}
                      onChange={(e) => setMapeo({ ...mapeo, [c.clave]: e.target.value === '' ? null : Number(e.target.value) })}
                    >
                      <option value="">— No importar —</option>
                      {titulos.map((t, i) => (
                        <option key={i} value={i}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
                <label className="block">
                  <span className="block text-[11px] text-text-secondary mb-1">Origen para los que no lo traen</span>
                  <input
                    className={selector}
                    list="importar-origenes"
                    value={origenFijo}
                    onChange={(e) => setOrigenFijo(e.target.value)}
                    placeholder="Ej: Feria educativa"
                    maxLength={80}
                  />
                  <datalist id="importar-origenes">
                    {categorias.map((o) => (
                      <option key={o} value={o} />
                    ))}
                  </datalist>
                </label>
                {esLider && (
                  <label className="block">
                    <span className="block text-[11px] text-text-secondary mb-1">Asignar a</span>
                    <select className={selector} value={asignar} onChange={(e) => setAsignar(e.target.value)}>
                      <option value="yo">A mí</option>
                      {miembros
                        .filter((m) => m.id !== userId)
                        .map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.nombre}
                          </option>
                        ))}
                      <option value="sin">Sin asignar (los repartís desde el Panel)</option>
                    </select>
                  </label>
                )}
              </div>

              {mapeo.nombre === null && (
                <p className="text-xs text-red-text bg-red-bg border border-red-border rounded-md px-3 py-2 mb-4">
                  Elegí qué columna tiene el nombre: es el único dato obligatorio.
                </p>
              )}

              <div className="grid grid-cols-3 gap-2 mb-4">
                <Numero valor={cuenta.ok} texto="listos para importar" clases="bg-green-bg text-green-text border-green-border" />
                <Numero
                  valor={cuenta.repetido}
                  texto="repetidos (no se importan)"
                  clases="bg-amber-bg text-amber-text border-amber-border"
                />
                <Numero valor={cuenta.error} texto="con errores (no se importan)" clases="bg-red-bg text-red-text border-red-border" />
              </div>

              <div className="flex items-center justify-between mb-2">
                <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-text-secondary">Vista previa</div>
                <label className="flex items-center gap-1.5 text-xs text-text-secondary cursor-pointer">
                  <input type="checkbox" checked={soloProblemas} onChange={(e) => setSoloProblemas(e.target.checked)} />
                  Ver solo los que no se importan
                </label>
              </div>
              <div className="border border-border-tertiary rounded-md overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-bg-secondary text-text-secondary">
                    <tr className="text-left">
                      <th className="font-medium px-2.5 py-1.5 w-12">Fila</th>
                      <th className="font-medium px-2.5 py-1.5">Nombre</th>
                      <th className="font-medium px-2.5 py-1.5">Teléfono</th>
                      <th className="font-medium px-2.5 py-1.5">Email</th>
                      <th className="font-medium px-2.5 py-1.5">Origen</th>
                      <th className="font-medium px-2.5 py-1.5">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibles.map((f) => (
                      <tr key={f.fila} className="border-t border-border-tertiary text-text-primary">
                        <td className="px-2.5 py-1.5 text-text-tertiary tabular-nums">{f.fila}</td>
                        <td className="px-2.5 py-1.5 max-w-[180px] truncate">
                          {f.nombre || <span className="text-text-tertiary">—</span>}
                        </td>
                        <td className="px-2.5 py-1.5 whitespace-nowrap">{f.telefono || <span className="text-text-tertiary">—</span>}</td>
                        <td className="px-2.5 py-1.5 max-w-[180px] truncate">{f.email || <span className="text-text-tertiary">—</span>}</td>
                        <td className="px-2.5 py-1.5 max-w-[120px] truncate">
                          {f.origen || <span className="text-text-tertiary">—</span>}
                        </td>
                        <td className="px-2.5 py-1.5">
                          <span className={`text-[10px] px-1.5 py-px rounded-full border whitespace-nowrap ${ESTADOS[f.estado].clases}`}>
                            {ESTADOS[f.estado].texto}
                          </span>
                          {f.motivo && <span className="block text-[10px] text-text-tertiary mt-0.5">{f.motivo}</span>}
                        </td>
                      </tr>
                    ))}
                    {visibles.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-2.5 py-4 text-center text-text-tertiary">
                          No hay filas para mostrar.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {(soloProblemas ? filas.length - cuenta.ok : filas.length) > VISTA_PREVIA && (
                <p className="text-[11px] text-text-tertiary mt-1.5">Se muestran las primeras {VISTA_PREVIA} filas.</p>
              )}
            </>
          )}

          {/* 3) importando */}
          {paso === 'importando' && (
            <div className="py-10 text-center">
              <div className="text-sm text-text-primary mb-3">
                Importando {avance.toLocaleString('es-AR')} de {cuenta.ok.toLocaleString('es-AR')}...
              </div>
              <div className="h-2 rounded-full bg-bg-tertiary overflow-hidden max-w-md mx-auto">
                <div className="h-full bg-accent transition-all" style={{ width: `${cuenta.ok ? (avance / cuenta.ok) * 100 : 0}%` }} />
              </div>
              <p className="text-xs text-text-tertiary mt-3">No cierres esta ventana hasta que termine.</p>
            </div>
          )}

          {/* 4) resultado */}
          {paso === 'listo' && resultado && (
            <div className="py-4">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-10 h-10 rounded-full bg-green-bg text-green-text inline-flex items-center justify-center text-lg">
                  ✓
                </span>
                <div>
                  <div className="text-sm font-semibold text-text-primary">
                    {resultado.importados === 1 ? `Se importó 1 ${uno}` : `Se importaron ${resultado.importados} ${varios}`}{' '}
                    {resultado.importados > 0 && nombreAsignado}
                  </div>
                  <div className="text-xs text-text-secondary">
                    {resultado.noEntraron.length
                      ? `${resultado.noEntraron.length} no se importaron (repetidos o con errores).`
                      : 'Entraron todos los contactos del archivo.'}
                  </div>
                </div>
              </div>
              {resultado.noEntraron.length > 0 && (
                <>
                  <div className="border border-border-tertiary rounded-md max-h-56 overflow-auto mb-3">
                    {resultado.noEntraron.map((f) => (
                      <div
                        key={`${f.fila}-${f.motivo}`}
                        className="flex gap-3 px-3 py-1.5 border-b border-border-tertiary last:border-0 text-xs"
                      >
                        <span className="text-text-tertiary tabular-nums w-14 shrink-0">Fila {f.fila}</span>
                        <span className="text-text-primary truncate flex-1">{f.nombre || '(sin nombre)'}</span>
                        <span className="text-text-secondary">{f.motivo}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={descargarNoImportados}
                    className="text-xs px-3 py-1.5 rounded-md border border-border-secondary bg-bg-primary text-text-secondary hover:text-text-primary"
                  >
                    Descargar los que no se importaron (para corregirlos)
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {(paso === 'revisar' || paso === 'listo') && (
          <div className="flex items-center gap-2 px-6 py-3.5 border-t border-border-tertiary">
            {paso === 'revisar' && (
              <span className="text-[11px] text-text-tertiary">
                {Varios} nuevos, activos, {esLider ? nombreAsignado : 'a tu nombre'}. El plazo de vencimiento cuenta desde hoy.
              </span>
            )}
            <div className="ml-auto flex gap-2">
              {paso === 'revisar' ? (
                <>
                  <button
                    onClick={onCerrar}
                    className="text-xs px-3 py-2 rounded-md border border-border-secondary bg-bg-primary text-text-secondary"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={importar}
                    disabled={mapeo.nombre === null || cuenta.ok === 0}
                    className="text-xs font-medium px-4 py-2 rounded-md bg-accent text-white hover:bg-accent-dark disabled:opacity-50"
                  >
                    Importar {cuenta.ok.toLocaleString('es-AR')} {cuenta.ok === 1 ? 'contacto' : 'contactos'}
                  </button>
                </>
              ) : (
                <button onClick={onCerrar} className="text-xs font-medium px-4 py-2 rounded-md bg-accent text-white hover:bg-accent-dark">
                  Listo
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
