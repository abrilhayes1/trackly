import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../lib/api'
import { iniciales } from '../lib/formato'
import { colorPorInteres, sinCategoria, etiquetaInteres } from '../lib/interes'
import { textoArchivo, ordenarArchivo, claveInteres } from '../lib/archivo'
import { useTerminos } from '../lib/configEquipo'

function primerNombre(nombre) {
  return (nombre || '').split(' ')[0]
}

// como en el prototipo: el filtro de interés se marca en oscuro y el de asesor en violeta
function Chip({ activo, onClick, children, conAvatar = false, oscuro = false }) {
  const colorActivo = oscuro
    ? 'bg-text-primary text-bg-primary border-text-primary'
    : 'bg-accent text-white border-accent'
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 text-[11px] rounded-full border ${
        conAvatar ? 'pl-[5px] pr-2.5 py-1' : 'px-3 py-1'
      } ${activo ? colorActivo : 'bg-bg-primary text-text-secondary border-border-secondary'}`}
    >
      {children}
    </button>
  )
}

// pestaña como las del panel del prototipo (.ltab): subrayada en violeta y con contador
function Pestana({ activa, onClick, children, cantidad }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 text-xs px-3.5 py-2 -mb-px border-b-2 ${
        activa
          ? 'text-accent-dark font-semibold border-accent'
          : 'text-text-secondary border-transparent hover:text-text-primary'
      }`}
    >
      {children}
      <span className="text-[10px] font-semibold px-1.5 py-px rounded-full bg-avatar-bg text-urgent-blue">
        {cantidad}
      </span>
    </button>
  )
}

// textos de cada pestaña, con el nombre que el equipo usa para sus contactos
function textosDe({ varios }) {
  return {
    vencido: {
      vacio: `No hay ${varios} vencidos. Cuando alguno pase el plazo sin contacto, aparece acá para que alguien lo reclame.`,
      accion: 'Reclamar',
      enCurso: 'Reclamando...',
      ok: (nombre) => `Reclamaste a ${nombre}: ahora está en Mis ${varios}, con el conteo de días en cero.`,
    },
    archivo: {
      vacio: `No hay ${varios} archivados. Un vencido pasa acá si nadie lo reclama a tiempo.`,
      accion: 'Reactivar',
      enCurso: 'Reactivando...',
      ok: (nombre) => `Reactivaste a ${nombre}: ahora está en Mis ${varios}, con el conteo de días en cero.`,
    },
  }
}

export default function Archivo({ userId, rol, onAbrirLead, cambios, onCambio }) {
  const [leads, setLeads] = useState([])
  const [config, setConfig] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [pestana, setPestana] = useState('vencido')
  const [filtroInteres, setFiltroInteres] = useState('')
  const [filtroAsesor, setFiltroAsesor] = useState('')
  const [confirmando, setConfirmando] = useState(null)
  const [tomando, setTomando] = useState(null)
  const [mensaje, setMensaje] = useState(null)
  const [errorAccion, setErrorAccion] = useState(null)

  const esLider = rol === 'lider'
  const terminos = useTerminos()
  const TEXTOS = textosDe(terminos)
  const textos = TEXTOS[pestana]

  // se carga al abrir la pantalla y cada vez que algo cambia (por ejemplo, un lead reclamado)
  useEffect(() => {
    Promise.all([apiFetch('/api/leads?estado=vencido,archivo'), apiFetch('/api/config')])
      .then(([leadsData, configData]) => {
        setLeads(leadsData)
        setConfig(configData)
        setError(null)
      })
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false))
  }, [cambios])

  const diasArchivo = config?.vencimiento_habilitado ? config.dias_archivo : null
  const ahora = useMemo(() => new Date(), [leads, config])

  const cantidad = {
    vencido: leads.filter((l) => l.estado === 'vencido').length,
    archivo: leads.filter((l) => l.estado === 'archivo').length,
  }

  const dePestana = useMemo(
    () => leads.filter((l) => l.estado === pestana).sort(ordenarArchivo(pestana)),
    [leads, pestana]
  )

  // niveles de interés que realmente aparecen en la pestaña, en el orden de siempre
  const niveles = useMemo(() => {
    const presentes = new Set(dePestana.map(claveInteres))
    return [...Object.keys(etiquetaInteres), 'sin'].filter((n) => presentes.has(n))
  }, [dePestana])

  // dueños que tienen leads en la pestaña (filtro por asesor, solo si hay más de uno)
  const duenios = useMemo(() => {
    const mapa = new Map()
    dePestana.forEach((l) => {
      if (l.asesor_id && !mapa.has(l.asesor_id)) mapa.set(l.asesor_id, l.asesor?.nombre || 'Sin nombre')
    })
    return [...mapa]
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
  }, [dePestana])

  const interesActivo = niveles.includes(filtroInteres) ? filtroInteres : ''
  const asesorActivo = duenios.some((d) => d.id === filtroAsesor) ? filtroAsesor : ''

  const visibles = dePestana.filter(
    (l) =>
      (!interesActivo || claveInteres(l) === interesActivo) &&
      (!asesorActivo || l.asesor_id === asesorActivo)
  )

  function cambiarPestana(nueva) {
    setPestana(nueva)
    setConfirmando(null)
    setMensaje(null)
    setErrorAccion(null)
  }

  // reclamar un vencido o reactivar un archivado: en los dos casos el lead pasa a ser de quien lo toma
  async function tomar(lead) {
    const ruta = lead.estado === 'vencido' ? 'reclamar' : 'reactivar'
    setTomando(lead.id)
    setConfirmando(null)
    setErrorAccion(null)
    setMensaje(null)
    try {
      await apiFetch(`/api/leads/${lead.id}/${ruta}`, { method: 'POST' })
      setLeads((actuales) => actuales.filter((l) => l.id !== lead.id))
      setMensaje(TEXTOS[lead.estado].ok(lead.nombre))
      onCambio()
    } catch (e) {
      // si otro asesor lo tomó antes, la lista que vemos quedó vieja: se vuelve a cargar
      setErrorAccion(e.message)
      onCambio()
    } finally {
      setTomando(null)
    }
  }

  return (
    <div className="p-5">
      <h1 className="text-base font-semibold tracking-tight text-text-primary mb-[3px]">
        {esLider ? 'Archivo del equipo' : `Archivo de ${terminos.varios}`}
      </h1>
      <p className="text-xs text-text-secondary mb-4">
        {esLider
          ? `${terminos.Varios} vencidos y archivados del equipo · filtrá por asesor`
          : 'Cualquier asesor puede reclamar un vencido o reactivar un archivado'}
      </p>

      <div className="flex gap-[5px] border-b border-border-tertiary mb-4">
        <Pestana
          activa={pestana === 'vencido'}
          onClick={() => cambiarPestana('vencido')}
          cantidad={cantidad.vencido}
        >
          Vencidos
        </Pestana>
        <Pestana
          activa={pestana === 'archivo'}
          onClick={() => cambiarPestana('archivo')}
          cantidad={cantidad.archivo}
        >
          Archivados
        </Pestana>
      </div>

      {cargando && <p className="text-sm text-text-secondary">Cargando...</p>}

      {error && (
        <p className="text-sm text-red-text bg-red-bg border border-red-border rounded-md px-3 py-2">
          {error}
        </p>
      )}

      {mensaje && (
        <p className="text-xs text-green-text bg-green-bg border border-green-border rounded-md px-3 py-2 mb-3">
          {mensaje}
        </p>
      )}

      {errorAccion && (
        <p className="text-xs text-red-text bg-red-bg border border-red-border rounded-md px-3 py-2 mb-3">
          {errorAccion}
        </p>
      )}

      {!cargando && !error && dePestana.length > 0 && (
        <>
          <div className="flex flex-wrap gap-[5px] mb-3">
            <Chip oscuro activo={interesActivo === ''} onClick={() => setFiltroInteres('')}>
              Todos
            </Chip>
            {niveles.map((n) => (
              <Chip key={n} oscuro activo={interesActivo === n} onClick={() => setFiltroInteres(n)}>
                {n === 'sin' ? 'Sin categoría' : etiquetaInteres[n]}
              </Chip>
            ))}
          </div>

          {duenios.length > 1 && (
            <div className="flex flex-wrap items-center gap-[5px] mb-4">
              <Chip activo={asesorActivo === ''} onClick={() => setFiltroAsesor('')}>
                {esLider ? 'Todo el equipo' : 'De todos'}
              </Chip>
              {duenios.map((d) => (
                <Chip
                  key={d.id}
                  conAvatar
                  activo={asesorActivo === d.id}
                  onClick={() => setFiltroAsesor(d.id)}
                >
                  <span className="w-5 h-5 rounded-full bg-avatar-bg text-avatar-text inline-flex items-center justify-center text-[8px] font-semibold shrink-0">
                    {iniciales(d.nombre)}
                  </span>
                  {d.id === userId ? 'Míos' : primerNombre(d.nombre)}
                </Chip>
              ))}
            </div>
          )}
        </>
      )}

      {!cargando && !error && dePestana.length === 0 && (
        <p className="text-center py-8 text-xs text-text-tertiary">{textos.vacio}</p>
      )}

      {!cargando && !error && dePestana.length > 0 && visibles.length === 0 && (
        <p className="text-center py-8 text-xs text-text-tertiary">Nada para este filtro.</p>
      )}

      {!cargando &&
        !error &&
        visibles.map((lead) => {
          const colores = lead.interes ? colorPorInteres[lead.interes] : sinCategoria
          const esMio = lead.asesor_id === userId
          return (
            <div
              key={lead.id}
              onClick={() => onAbrirLead(lead)}
              className="flex items-center gap-2 bg-bg-primary border border-border-tertiary rounded-(--radius-lg) px-[0.9rem] py-[0.65rem] mb-1.5 cursor-pointer hover:border-accent transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-text-primary">{lead.nombre}</div>
                <div className="text-[11px] text-text-secondary truncate mt-px">
                  {textoArchivo(lead, diasArchivo, ahora)}
                  {lead.origen ? ` · ${lead.origen}` : ''}
                  {!esLider && !esMio && lead.asesor?.nombre
                    ? ` · de ${primerNombre(lead.asesor.nombre)}`
                    : ''}
                </div>
              </div>
              {/* el líder ve de quién era cada lead con su avatar, como en el prototipo */}
              {esLider && lead.asesor?.nombre && (
                <span className="inline-flex items-center gap-1.5 shrink-0">
                  <span className="w-5 h-5 rounded-full bg-avatar-bg text-avatar-text inline-flex items-center justify-center text-[8px] font-semibold">
                    {iniciales(lead.asesor.nombre)}
                  </span>
                  <span className="text-xs text-text-secondary">
                    {primerNombre(lead.asesor.nombre)}
                  </span>
                </span>
              )}
              <span
                className={`text-[10px] px-1.5 py-px rounded-full border shrink-0 ${colores.bg} ${colores.text} ${colores.border}`}
              >
                {lead.interes ? etiquetaInteres[lead.interes] : 'Sin categoría'}
              </span>

              {/* reclamar pide confirmación (CU06); reactivar un archivado va directo */}
              {confirmando === lead.id ? (
                <span className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <span className="text-[11px] text-text-secondary mr-0.5">¿Reclamarlo?</span>
                  <button
                    onClick={() => tomar(lead)}
                    className="text-[11px] px-[9px] py-[3px] rounded-full bg-accent text-white hover:bg-accent-dark"
                  >
                    Sí, reclamar
                  </button>
                  <button
                    onClick={() => setConfirmando(null)}
                    className="text-[11px] px-[9px] py-[3px] rounded-full border border-border-secondary bg-bg-primary text-text-secondary hover:bg-bg-secondary"
                  >
                    Cancelar
                  </button>
                </span>
              ) : (
                <button
                  disabled={tomando === lead.id}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (lead.estado === 'vencido') setConfirmando(lead.id)
                    else tomar(lead)
                  }}
                  className="shrink-0 text-[11px] px-[9px] py-[3px] rounded-full border border-border-secondary bg-bg-primary text-text-secondary hover:bg-green-bg hover:text-green-text hover:border-green-border disabled:opacity-50"
                >
                  {tomando === lead.id ? textos.enCurso : textos.accion}
                </button>
              )}
            </div>
          )
        })}
    </div>
  )
}
