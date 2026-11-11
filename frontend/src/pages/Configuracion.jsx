// Configuración del equipo (RF02, RF06, RF07): solo para el líder. Lo mismo que se eligió en el
// onboarding, editable, más los miembros del equipo y las invitaciones pendientes.
import { useEffect, useState } from 'react'
import Avatar from '../components/Avatar'
import Confirmacion from '../components/Confirmacion'
import { apiFetch } from '../lib/api'
import { useConfigEquipo, RUBROS, EMAIL_VALIDO, errorVencimiento } from '../lib/configEquipo'
import {
  Campo,
  claseInput,
  Opcion,
  GrillaOpciones,
  Interruptor,
  Etiquetas,
  CamposVencimiento,
  ListaEmails,
  EditorCamposCierre,
} from '../components/CamposEquipo'
import { TIPOS_CAMPO, nuevoIdCampo } from '../lib/cierre'
import { useLeadsEquipo } from '../lib/leadsEquipo'
import { estaActivo, licenciasUsadas } from '../lib/miembros'

const etiquetaRol = { lider: 'Líder', asesor: 'Asesor' }

function Tarjeta({ titulo, descripcion, children }) {
  return (
    <section className="bg-bg-primary border border-border-tertiary rounded-(--radius-lg) px-5 py-4 mb-3">
      <h2 className="text-[13px] font-semibold text-text-primary">{titulo}</h2>
      {descripcion && <p className="text-[11px] text-text-secondary mt-0.5 mb-3">{descripcion}</p>}
      <div className={descripcion ? '' : 'mt-3'}>{children}</div>
    </section>
  )
}

function Aviso({ tipo, children }) {
  const estilo = tipo === 'ok' ? 'text-green-text bg-green-bg border-green-border' : 'text-red-text bg-red-bg border-red-border'
  return <p className={`text-xs border rounded-md px-3 py-2 mb-3 ${estilo}`}>{children}</p>
}

// de la fila de tenant_config (y el nombre del equipo) al formulario
function desdeConfig(config, nombreEquipo) {
  return {
    equipoNombre: nombreEquipo || '',
    rubro: config.rubro || '',
    terminoContacto: config.termino_contacto || 'Lead',
    terminoContactoPlural: config.termino_contacto_plural || 'Leads',
    vencimientoHabilitado: !!config.vencimiento_habilitado,
    diasVencimiento: config.dias_vencimiento_lead ?? 14,
    diasAlertaPrevia: config.dias_alerta_previa ?? 3,
    diasArchivo: config.dias_archivo ?? 30,
    categoriasOrigen: config.categorias_origen || [],
    eventosHabilitado: !!config.eventos_habilitado,
    terminoEvento: config.termino_evento || 'Charla informativa',
    emailDiario: config.email_diario !== false,
    camposCierre: config.campos_cierre || [],
    motivosPerdida: config.motivos_perdida || [],
    diasHabiles: !!config.dias_habiles,
  }
}

function errorFormulario(f) {
  if (!f.equipoNombre.trim()) return 'Ingresá el nombre del equipo.'
  if (!f.rubro) return 'Elegí el rubro del equipo.'
  if (!f.terminoContacto.trim() || !f.terminoContactoPlural.trim()) {
    return 'Indicá cómo se llaman tus contactos, en singular y en plural.'
  }
  if (f.eventosHabilitado && !f.terminoEvento.trim()) return 'Indicá cómo se llaman tus eventos.'
  const nombres = f.camposCierre.map((c) => c.nombre.trim().toLowerCase())
  if (nombres.some((n) => !n)) return 'Cada campo del cierre necesita un nombre.'
  if (new Set(nombres).size !== nombres.length) return 'Hay dos campos del cierre con el mismo nombre.'
  const listaVacia = f.camposCierre.find((c) => c.tipo === 'lista' && !(c.opciones || []).length)
  if (listaVacia) return `El campo "${listaVacia.nombre}" es una lista: cargale al menos una opción.`
  return errorVencimiento(f)
}

export default function Configuracion({ rol, nombreEquipo, miId, onGuardado }) {
  const { config, recargar } = useConfigEquipo()
  const [form, setForm] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [aviso, setAviso] = useState(null)

  const [equipo, setEquipo] = useState(null)
  const [errorEquipo, setErrorEquipo] = useState(null)
  const [nuevos, setNuevos] = useState([''])
  const [invitando, setInvitando] = useState(false)
  const [avisoInvitar, setAvisoInvitar] = useState(null)
  // desactivar a alguien pide confirmación: muestra cuántos leads quedan a su nombre
  const [aDesactivar, setADesactivar] = useState(null)
  const [accion, setAccion] = useState({ ocupado: false, error: null })
  const { leads } = useLeadsEquipo()

  // el formulario arranca con la configuración actual (y se resetea si se recarga desde afuera)
  const [base, setBase] = useState(null)
  if (config && base !== config) {
    setBase(config)
    setForm(desdeConfig(config, nombreEquipo))
  }

  function cargarEquipo() {
    apiFetch('/api/config/equipo')
      .then((data) => {
        setEquipo(data)
        setErrorEquipo(null)
      })
      .catch((e) => setErrorEquipo(e.message))
  }

  useEffect(() => {
    if (rol === 'lider') cargarEquipo()
  }, [rol])

  if (rol !== 'lider') {
    return <div className="p-5 text-sm text-text-secondary">Solo el líder del equipo puede ver y cambiar la configuración.</div>
  }

  if (!form) return <div className="p-5 text-sm text-text-secondary">Cargando...</div>

  const cambiar = (cambios) => setForm((actual) => ({ ...actual, ...cambios }))

  async function guardar() {
    const error = errorFormulario(form)
    if (error) {
      setAviso({ tipo: 'error', texto: error })
      return
    }
    setGuardando(true)
    setAviso(null)
    try {
      const camposCierre = form.camposCierre.map((c) => ({
        id: c.id,
        nombre: c.nombre.trim(),
        tipo: c.tipo,
        obligatorio: !!c.obligatorio,
        ...(c.tipo === 'lista' ? { opciones: c.opciones } : {}),
      }))
      await apiFetch('/api/config', { method: 'PUT', body: JSON.stringify({ ...form, camposCierre }) })
      setAviso({ tipo: 'ok', texto: 'Configuración guardada.' })
      recargar()
      onGuardado()
    } catch (e) {
      setAviso({ tipo: 'error', texto: e.message })
    } finally {
      setGuardando(false)
    }
  }

  async function invitar() {
    const emails = nuevos.map((e) => e.trim().toLowerCase()).filter(Boolean)
    const mal = emails.find((e) => !EMAIL_VALIDO.test(e))
    if (mal) {
      setAvisoInvitar({ tipo: 'error', texto: `El email "${mal}" no es válido.` })
      return
    }
    if (emails.length === 0) return
    setInvitando(true)
    setAvisoInvitar(null)
    try {
      const { agregadas } = await apiFetch('/api/config/invitaciones', {
        method: 'POST',
        body: JSON.stringify({ emails }),
      })
      setAvisoInvitar({
        tipo: 'ok',
        texto:
          agregadas === 0
            ? 'Esos emails ya estaban invitados o ya son parte del equipo.'
            : `Listo: ${agregadas === 1 ? '1 invitación nueva' : `${agregadas} invitaciones nuevas`}. Entran solos al equipo cuando crean su cuenta con ese email.`,
      })
      setNuevos([''])
      cargarEquipo()
    } catch (e) {
      setAvisoInvitar({ tipo: 'error', texto: e.message })
    } finally {
      setInvitando(false)
    }
  }

  // acciones sobre un miembro: desactivar, reactivar o cambiar el rol
  async function accionMiembro(ruta, opciones, textoOk) {
    setAccion({ ocupado: true, error: null })
    try {
      await apiFetch(`/api/config/miembros/${ruta}`, { method: 'POST', ...opciones })
      setAccion({ ocupado: false, error: null })
      setADesactivar(null)
      setAvisoInvitar({ tipo: 'ok', texto: textoOk })
      cargarEquipo()
      return true
    } catch (e) {
      setAccion({ ocupado: false, error: e.message })
      if (!aDesactivar) setAvisoInvitar({ tipo: 'error', texto: e.message })
      return false
    }
  }

  async function cancelarInvitacion(id) {
    try {
      await apiFetch(`/api/config/invitaciones/${id}`, { method: 'DELETE' })
      cargarEquipo()
    } catch (e) {
      setAvisoInvitar({ tipo: 'error', texto: e.message })
    }
  }

  return (
    <div className="p-5 max-w-[720px]">
      <h1 className="text-base font-semibold tracking-tight text-text-primary mb-[3px]">Configuración del equipo</h1>
      <p className="text-xs text-text-secondary mb-5">Lo que definas acá se refleja en toda la aplicación, para todo el equipo.</p>

      <Tarjeta titulo="Equipo">
        <Campo label="Nombre del equipo o empresa">
          <input value={form.equipoNombre} onChange={(e) => cambiar({ equipoNombre: e.target.value })} className={claseInput} />
        </Campo>
        <Campo label="Rubro">
          <GrillaOpciones>
            {RUBROS.map((r) => (
              <Opcion
                key={r.valor}
                sel={form.rubro === r.valor}
                onClick={() => cambiar({ rubro: r.valor })}
                icono={r.icono}
                label={r.label}
                sub={r.sub}
              />
            ))}
          </GrillaOpciones>
        </Campo>
      </Tarjeta>

      <Tarjeta titulo="Contactos" descripcion="Cómo se llaman las personas que siguen y de dónde vienen.">
        <div className="grid grid-cols-2 gap-2">
          <Campo label="En singular">
            <input
              value={form.terminoContacto}
              onChange={(e) => cambiar({ terminoContacto: e.target.value })}
              placeholder="Lead, Alumno, Cliente..."
              className={claseInput}
            />
          </Campo>
          <Campo label="En plural">
            <input
              value={form.terminoContactoPlural}
              onChange={(e) => cambiar({ terminoContactoPlural: e.target.value })}
              placeholder="Leads, Alumnos, Clientes..."
              className={claseInput}
            />
          </Campo>
        </div>
        <Campo label="Categorías de origen" ayuda="Escribí cada categoría y presioná Enter.">
          <Etiquetas
            valores={form.categoriasOrigen}
            onCambiar={(v) => cambiar({ categoriasOrigen: v })}
            placeholder="Ej: Instagram, Referido, Web..."
          />
        </Campo>
      </Tarjeta>

      <Tarjeta titulo="Vencimiento" descripcion="Qué pasa cuando un contacto queda sin atender.">
        <Interruptor
          prendido={form.vencimientoHabilitado}
          onCambiar={(v) => cambiar({ vencimientoHabilitado: v })}
          label="Vencimiento automático"
          sub="Avisa antes del plazo, vence al cumplirse y archiva si nadie lo reclama"
        />
        {form.vencimientoHabilitado && <CamposVencimiento valores={form} onCambiar={cambiar} />}
        {form.vencimientoHabilitado && (
          <Interruptor
            prendido={form.diasHabiles}
            onCambiar={(v) => cambiar({ diasHabiles: v })}
            label="Contar solo días hábiles"
            sub="Los plazos cuentan de lunes a viernes: sábados y domingos no suman días (los feriados sí cuentan)"
          />
        )}
      </Tarjeta>

      <Tarjeta
        titulo="Cierre perdido"
        descripcion="Los motivos que se ofrecen al cerrar un contacto como perdido (siempre está también la opción Otro). Con ellos se arma la estadística de por qué se pierden."
      >
        <Campo label="Motivos de pérdida" ayuda="Escribí cada motivo y presioná Enter. Hasta 20.">
          <Etiquetas
            valores={form.motivosPerdida}
            onCambiar={(v) => cambiar({ motivosPerdida: v.slice(0, 20) })}
            placeholder="Ej: Precio, Eligió otra opción, No respondió..."
          />
        </Campo>
      </Tarjeta>

      <Tarjeta
        titulo="Cierre ganado"
        descripcion="Los datos que se piden al cerrar un contacto como ganado. Si cambiás un campo, los cierres que ya están guardados no se modifican."
      >
        <EditorCamposCierre
          campos={form.camposCierre}
          onCambiar={(v) => cambiar({ camposCierre: v })}
          tipos={TIPOS_CAMPO}
          nuevoId={nuevoIdCampo}
        />
      </Tarjeta>

      <Tarjeta titulo="Eventos y avisos">
        <Interruptor
          prendido={form.eventosHabilitado}
          onCambiar={(v) => cambiar({ eventosHabilitado: v })}
          label="Usar gestión de eventos"
          sub="Charlas, webinars, demos, visitas, reuniones grupales"
        />
        {form.eventosHabilitado && (
          <Campo label="¿Cómo se llaman sus eventos?">
            <input
              value={form.terminoEvento}
              onChange={(e) => cambiar({ terminoEvento: e.target.value })}
              placeholder="Charla informativa, Webinar, Demo..."
              className={claseInput}
            />
          </Campo>
        )}
        <Interruptor
          prendido={form.emailDiario}
          onCambiar={(v) => cambiar({ emailDiario: v })}
          label="Resumen diario por email"
          sub="Cada mañana, un resumen de lo que hay que atender ese día"
        />
      </Tarjeta>

      {aviso && <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso>}
      <div className="flex justify-end mb-6">
        <button
          onClick={guardar}
          disabled={guardando}
          className="text-xs font-medium px-4 py-2 rounded-md bg-accent text-white hover:bg-accent-dark disabled:opacity-60"
        >
          {guardando ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>

      <Tarjeta titulo="Miembros del equipo">
        {errorEquipo && <Aviso tipo="error">{errorEquipo}</Aviso>}
        {equipo && (
          <MiembrosEquipo
            equipo={equipo}
            miId={miId}
            onDesactivar={(m) => {
              setAccion({ ocupado: false, error: null })
              setADesactivar(m)
            }}
            onReactivar={(m) => accionMiembro(`${m.id}/reactivar`, {}, `${m.nombre} volvió a estar activo.`)}
            onCambiarRol={(m, rol) =>
              accionMiembro(
                m.id,
                { method: 'PATCH', body: JSON.stringify({ rol }) },
                `${m.nombre} ahora es ${rol === 'lider' ? 'líder' : 'asesor'}.`,
              )
            }
            onCancelarInvitacion={cancelarInvitacion}
          />
        )}

        {equipo && <InvitarPersonas equipo={equipo} nuevos={nuevos} setNuevos={setNuevos} />}
        {avisoInvitar && <Aviso tipo={avisoInvitar.tipo}>{avisoInvitar.texto}</Aviso>}
        {equipo && libres(equipo) > 0 && (
          <div className="flex justify-end">
            <button
              onClick={invitar}
              disabled={invitando}
              className="text-xs font-medium px-4 py-2 rounded-md bg-accent text-white hover:bg-accent-dark disabled:opacity-60"
            >
              {invitando ? 'Invitando...' : 'Invitar'}
            </button>
          </div>
        )}
      </Tarjeta>

      {aDesactivar && (
        <Confirmacion
          titulo={`¿Desactivar a ${aDesactivar.nombre}?`}
          textoConfirmar="Desactivar"
          peligro
          ocupado={accion.ocupado}
          error={accion.error}
          onCancelar={() => setADesactivar(null)}
          onConfirmar={() =>
            accionMiembro(`${aDesactivar.id}/desactivar`, {}, `${aDesactivar.nombre} quedó desactivado y se liberó su licencia.`)
          }
        >
          <p>No va a poder entrar más a Trackly con este equipo y se libera su licencia.</p>
          <p>
            {(() => {
              const n = leads.filter((l) => l.asesor_id === aDesactivar.id && (l.estado === 'activo' || l.estado === 'vencido')).length
              return n === 0
                ? 'No tiene contactos activos a su nombre.'
                : `Tiene ${n === 1 ? '1 contacto' : `${n} contactos`} a su nombre: van a seguir ahí hasta que los reasignes desde el Panel del equipo.`
            })()}
          </p>
          <p>Su historial no se borra. Si vuelve, lo podés reactivar.</p>
        </Confirmacion>
      )}
    </div>
  )
}

const libres = (equipo) => (equipo.licencias == null ? Infinity : equipo.licencias - licenciasUsadas(equipo.miembros, equipo.invitaciones))

const claseAccion = 'text-[11px] text-text-tertiary hover:text-text-primary px-1.5 py-1 rounded'

function FilaMiembro({ m, children, apagado }) {
  return (
    <div className="flex items-center gap-2 py-2 border-b border-border-tertiary last:border-0">
      <span className={apagado ? 'opacity-50' : ''}>
        <Avatar nombre={m.nombre} foto={m.avatar_url} />
      </span>
      <span className={`text-xs flex-1 min-w-0 truncate ${apagado ? 'text-text-tertiary' : 'text-text-primary'}`}>{m.nombre}</span>
      {children}
    </div>
  )
}

function MiembrosEquipo({ equipo, miId, onDesactivar, onReactivar, onCambiarRol, onCancelarInvitacion }) {
  const activos = equipo.miembros.filter(estaActivo)
  const desactivados = equipo.miembros.filter((m) => !estaActivo(m))
  const lideres = activos.filter((m) => m.rol === 'lider').length
  const usadas = licenciasUsadas(equipo.miembros, equipo.invitaciones)

  return (
    <div className="mb-4">
      {equipo.licencias != null && (
        <div className="mb-3">
          <div className="flex items-baseline justify-between text-xs mb-1.5">
            <span className="text-text-primary font-medium">
              Usás {usadas} de {equipo.licencias} {equipo.licencias === 1 ? 'licencia' : 'licencias'}
            </span>
            <span className="text-text-tertiary">Cada persona activa o invitada ocupa una</span>
          </div>
          <div className="h-1.5 rounded-full bg-bg-secondary overflow-hidden">
            <div
              className={`h-full rounded-full ${usadas >= equipo.licencias ? 'bg-amber-border' : 'bg-accent'}`}
              style={{ width: `${Math.min(100, (usadas / equipo.licencias) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {activos.map((m) => (
        <FilaMiembro key={m.id} m={m}>
          {m.id === miId && <span className="text-[10px] text-text-tertiary">Vos</span>}
          <select
            value={m.rol}
            aria-label={`Rol de ${m.nombre}`}
            disabled={m.rol === 'lider' && lideres === 1}
            title={m.rol === 'lider' && lideres === 1 ? 'El equipo tiene que tener al menos una persona líder' : undefined}
            onChange={(e) => onCambiarRol(m, e.target.value)}
            className="text-[11px] px-1.5 py-1 rounded-md border border-border-secondary bg-bg-primary text-text-secondary disabled:opacity-60"
          >
            <option value="asesor">{etiquetaRol.asesor}</option>
            <option value="lider">{etiquetaRol.lider}</option>
          </select>
          {m.id !== miId && (
            <button onClick={() => onDesactivar(m)} className={`${claseAccion} hover:text-red-text`}>
              Desactivar
            </button>
          )}
        </FilaMiembro>
      ))}

      {equipo.invitaciones.map((inv) => (
        <div key={inv.id} className="flex items-center gap-2 py-2 border-b border-border-tertiary last:border-0">
          <span className="w-6 h-6 rounded-full border border-dashed border-border-secondary shrink-0" />
          <span className="text-xs text-text-secondary flex-1 min-w-0 truncate">{inv.email}</span>
          <span className="text-[10px] px-1.5 py-px rounded-full bg-amber-bg text-amber-text">Invitación pendiente</span>
          <button onClick={() => onCancelarInvitacion(inv.id)} className={`${claseAccion} hover:text-red-text`}>
            Cancelar
          </button>
        </div>
      ))}

      {desactivados.length > 0 && (
        <>
          <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-text-tertiary mt-4 mb-1">Desactivados</div>
          {desactivados.map((m) => (
            <FilaMiembro key={m.id} m={m} apagado>
              {m.historico ? (
                <span className="text-[10px] text-text-tertiary">Se unió a otro equipo</span>
              ) : (
                <button onClick={() => onReactivar(m)} className={claseAccion}>
                  Reactivar
                </button>
              )}
            </FilaMiembro>
          ))}
        </>
      )}
    </div>
  )
}

function InvitarPersonas({ equipo, nuevos, setNuevos }) {
  const quedan = libres(equipo)
  if (quedan <= 0) {
    return (
      <p className="text-xs text-text-secondary bg-bg-secondary rounded-md px-3 py-2.5 mb-3">
        {equipo.licencias === 1
          ? 'Tu equipo tiene 1 licencia, la tuya. Para invitar personas necesitás más licencias.'
          : `Usaste las ${equipo.licencias} licencias. Para invitar a alguien, desactivá a quien ya no esté o pedí más licencias.`}
      </p>
    )
  }
  return (
    <Campo
      label="Invitar personas"
      ayuda={`Entran solas al equipo, como asesores, cuando crean su cuenta con ese email.${
        Number.isFinite(quedan) ? ` ${quedan === 1 ? 'Queda 1 licencia libre' : `Quedan ${quedan} licencias libres`}.` : ''
      }`}
    >
      <ListaEmails emails={nuevos} onCambiar={setNuevos} textoAgregar="+ Agregar otro email" />
    </Campo>
  )
}
