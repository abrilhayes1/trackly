import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'
import { iniciales, fechaHoraCorta } from '../lib/formato'
import { detalleCierre } from '../lib/cierre'
import { useTerminos, useConfigEquipo } from '../lib/configEquipo'

// textos de cada vista, con el nombre que el equipo usa para sus contactos
function textosDe({ Varios }) {
  return {
    ganado: {
      titulo: 'Casos exitosos',
      tituloLider: 'Casos exitosos del equipo',
      sub: `${Varios} cerrados como ganados`,
      subLider: `${Varios} ganados por el equipo`,
      vacio: (filtrado) =>
        `Aún no hay casos exitosos${filtrado ? ' para este asesor' : ''}. Se cierran como ganados desde la tarjeta de contacto.`,
    },
    perdido: {
      titulo: 'Cerrados perdidos',
      tituloLider: 'Cerrados perdidos del equipo',
      sub: `${Varios} que no convirtieron`,
      subLider: `${Varios} que no convirtieron en el equipo`,
      vacio: (filtrado) => `Aún no hay cierres perdidos${filtrado ? ' para este asesor' : ''} registrados.`,
    },
  }
}

function Chip({ children, clases = 'bg-bg-secondary text-text-secondary border-border-tertiary' }) {
  return <span className={`text-[10px] px-2 py-0.5 rounded-full border ${clases}`}>{children}</span>
}

function Avatar({ nombre, tamano }) {
  return (
    <span className={`${tamano} rounded-full bg-avatar-bg text-avatar-text inline-flex items-center justify-center font-semibold shrink-0`}>
      {iniciales(nombre)}
    </span>
  )
}

function primerNombre(nombre) {
  return (nombre || '').split(' ')[0]
}

const POR_PAGINA = 30

// una página de cierres, del más nuevo al más viejo; el filtro por asesor lo hace el servidor
const urlPagina = (tipo, asesor, desde) =>
  `/api/cierres?tipo=${tipo}&limite=${POR_PAGINA}&desde=${desde}${asesor ? `&asesor=${asesor}` : ''}`

export default function CasosCerrados({ tipo, rol, onAbrirLead, cambios }) {
  const [cierres, setCierres] = useState([])
  const [hayMas, setHayMas] = useState(false)
  const [cargandoMas, setCargandoMas] = useState(false)
  const [miembros, setMiembros] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [filtro, setFiltro] = useState('')

  const t = textosDe(useTerminos())[tipo]
  const camposCierre = useConfigEquipo().config?.campos_cierre || []
  const esLider = rol === 'lider'

  // se carga al abrir la pantalla, al cambiar el filtro y cada vez que se modifica un lead desde la tarjeta
  useEffect(() => {
    apiFetch(urlPagina(tipo, filtro, 0))
      .then((datos) => {
        setCierres(datos.cierres)
        setHayMas(datos.hayMas)
        setError(null)
      })
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false))
  }, [tipo, cambios, filtro])

  // el líder filtra por cualquier persona del equipo
  useEffect(() => {
    if (!esLider) return
    apiFetch('/api/config/equipo')
      .then((equipo) => setMiembros(equipo.miembros))
      .catch(() => setMiembros([]))
  }, [esLider])

  async function verMas() {
    setCargandoMas(true)
    try {
      const datos = await apiFetch(urlPagina(tipo, filtro, cierres.length))
      // por si alguien cerró uno nuevo mientras tanto, no se repiten
      setCierres((actuales) => [...actuales, ...datos.cierres.filter((c) => !actuales.some((a) => a.id === c.id))])
      setHayMas(datos.hayMas)
    } catch (e) {
      setError(e.message)
    } finally {
      setCargandoMas(false)
    }
  }

  const asesores = miembros.map((m) => ({ id: m.id, nombre: m.nombre }))
  const filtroActivo = filtro
  const mostrarFiltro = esLider && asesores.length > 1
  const visibles = cierres

  return (
    <div className="p-5">
      <h1 className="text-base font-semibold tracking-tight text-text-primary mb-[3px]">{esLider ? t.tituloLider : t.titulo}</h1>
      <p className="text-xs text-text-secondary mb-5">{esLider ? t.subLider : t.sub}</p>

      {cargando && <p className="text-sm text-text-secondary">Cargando...</p>}

      {error && <p className="text-sm text-red-text bg-red-bg border border-red-border rounded-md px-3 py-2">{error}</p>}

      {!cargando && !error && mostrarFiltro && (
        <div className="flex flex-wrap items-center gap-[5px] mb-[1.1rem]">
          <button
            onClick={() => setFiltro('')}
            className={`text-[11px] px-3 py-1 rounded-full border ${
              filtroActivo === '' ? 'bg-accent text-white border-accent' : 'bg-bg-primary text-text-secondary border-border-secondary'
            }`}
          >
            Todos
          </button>
          {asesores.map((a) => (
            <button
              key={a.id}
              onClick={() => setFiltro(a.id)}
              className={`flex items-center gap-1.5 text-[11px] pl-[5px] pr-2.5 py-1 rounded-full border ${
                filtroActivo === a.id ? 'bg-accent text-white border-accent' : 'bg-bg-primary text-text-secondary border-border-secondary'
              }`}
            >
              <Avatar nombre={a.nombre} tamano="w-5 h-5 text-[8px]" />
              {primerNombre(a.nombre)}
            </button>
          ))}
        </div>
      )}

      {!cargando && !error && visibles.length === 0 && (
        <p className="text-center py-8 text-xs text-text-tertiary">{t.vacio(filtroActivo !== '')}</p>
      )}

      {!cargando &&
        !error &&
        visibles.map((c) => {
          const ganado = c.tipo === 'ganado'
          return (
            <div
              key={c.id}
              onClick={() => c.lead && onAbrirLead(c.lead)}
              className={`bg-bg-primary border border-border-tertiary border-l-[3px] ${
                ganado ? 'border-l-green-border' : 'border-l-red-border'
              } rounded-(--radius-lg) px-4 py-3 mb-1.5 ${c.lead ? 'cursor-pointer hover:bg-bg-secondary' : ''}`}
            >
              <div className="flex items-center gap-2 mb-[3px]">
                <Avatar nombre={c.lead?.nombre} tamano="w-7 h-7 text-[10px]" />
                <div className="text-[13px] font-medium text-text-primary">{c.lead?.nombre || 'Contacto no disponible'}</div>
                {esLider && c.lead?.asesor?.nombre && (
                  <span className="ml-auto inline-flex items-center gap-1.5">
                    <Avatar nombre={c.lead.asesor.nombre} tamano="w-[22px] h-[22px] text-[8px]" />
                    <span className="text-xs text-text-secondary">{primerNombre(c.lead.asesor.nombre)}</span>
                  </span>
                )}
              </div>
              <div className="text-[11px] text-text-secondary mb-1.5">{fechaHoraCorta(c.updated_at)}</div>
              <div className="flex flex-wrap gap-[5px]">
                {ganado ? (
                  // el primer dato va resaltado; los números llevan su nombre para entenderse
                  detalleCierre(camposCierre, c.datos).map((d, i) => (
                    <Chip key={d.id} clases={i === 0 ? 'bg-green-bg text-green-text border-green-border' : undefined}>
                      {d.tipo === 'numero' && d.nombre ? `${d.nombre}: ${d.texto}` : d.texto}
                    </Chip>
                  ))
                ) : c.motivo ? (
                  <Chip clases="bg-red-bg text-red-text border-red-border">{c.motivo}</Chip>
                ) : (
                  <Chip>Sin motivo registrado</Chip>
                )}
              </div>
            </div>
          )
        })}

      {!cargando && !error && hayMas && (
        <div className="text-center mt-3">
          <button
            onClick={verMas}
            disabled={cargandoMas}
            className="text-xs px-4 py-2 rounded-md border border-border-secondary bg-bg-primary text-text-secondary hover:text-text-primary disabled:opacity-50"
          >
            {cargandoMas ? 'Cargando...' : 'Ver más'}
          </button>
        </div>
      )}
    </div>
  )
}
