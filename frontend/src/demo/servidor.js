// Servidor del prototipo: responde las mismas rutas que el backend real (backend/src/routes), con el
// mismo formato, pero sobre los datos en memoria de datos.js. Aplica las mismas reglas que importan
// para probar la app: permisos por rol, licencias, contactos repetidos e historial automático.
import { db, guardar, nuevoId } from './datos'
import { ordenarRecordatorios } from '../lib/agenda'

class ErrorDemo extends Error {
  constructor(status, mensaje) {
    super(mensaje)
    this.status = status
  }
}
const error = (status, mensaje) => {
  throw new ErrorDemo(status, mensaje)
}

const ahora = () => new Date().toISOString()
const INTERES = {
  muy_interesado: 'Muy interesado',
  interesado: 'Interesado',
  duda: 'Duda',
  poco_interesado: 'Poco interesado',
  frio: 'Frío',
  no_interesado: 'No interesado',
}
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const fechaTexto = (iso) => {
  const d = new Date(iso)
  return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`
}
const fechaHoraTexto = (iso) => {
  const d = new Date(iso)
  return `${fechaTexto(iso)} · ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// ---------- quién pide ----------
function contexto(uid) {
  const yo = db.profiles.find((p) => p.id === uid && !p.historico)
  const activo = yo && yo.activo
  return {
    uid,
    yo,
    tenant: activo ? yo.tenant_id : null,
    lider: activo && yo.rol === 'lider',
    usuario: db.usuarios.find((u) => u.id === uid),
  }
}
const exigirEquipo = (c) => c.tenant || error(401, 'Tu sesión venció. Volvé a ingresar.')
const exigirLider = (c, texto = 'Solo el líder puede hacer esto') => (exigirEquipo(c), c.lider || error(403, texto))

const nombreDe = (id) => db.profiles.find((p) => p.id === id)?.nombre
const conAsesor = (l) => ({ ...l, asesor: l.asesor_id ? { nombre: nombreDe(l.asesor_id) } : null })
const leadDelEquipo = (c, id) => db.leads.find((l) => l.id === id && l.tenant_id === c.tenant) || error(404, 'Lead no encontrado')
const historial = (leadId, texto, autor) =>
  db.historial.push({ id: nuevoId(), lead_id: leadId, texto, autor_id: autor, created_at: ahora() })
const puedeEditar = (c, l) => c.lider || (l.asesor_id === c.uid && l.estado !== 'vencido') || l.estado === 'vencido'
const licenciasUsadas = (t) =>
  db.profiles.filter((p) => p.tenant_id === t && p.activo).length +
  db.invitaciones.filter((i) => i.tenant_id === t && !i.aceptada_at).length

// teléfono: últimos 10 dígitos; emails: en minúsculas
const claveTelefono = (t) =>
  String(t || '')
    .replace(/\D/g, '')
    .slice(-10)
const emailsDe = (l) => [l.email, ...(l.emails_extra || [])].filter(Boolean).map((e) => e.toLowerCase())
function repetido(c, datos, menosId) {
  const tel = claveTelefono(datos.telefono)
  const mails = emailsDe(datos)
  return db.leads.find(
    (l) =>
      l.tenant_id === c.tenant &&
      l.id !== menosId &&
      ((tel.length >= 6 && claveTelefono(l.telefono) === tel) || emailsDe(l).some((e) => mails.includes(e))),
  )
}

// ---------- leads ----------
function entradasHistorial(antes, cambios) {
  const e = []
  if ('destacado' in cambios && cambios.destacado !== !!antes.destacado)
    e.push(cambios.destacado ? 'Marcado como destacado.' : 'Se quitó de destacados.')
  if ('interes' in cambios && cambios.interes !== antes.interes)
    e.push(cambios.interes ? `Categorizado como ${INTERES[cambios.interes]}.` : 'Se quitó la categoría de interés.')
  if ('ultimo_contacto' in cambios && cambios.ultimo_contacto && cambios.ultimo_contacto !== antes.ultimo_contacto)
    e.push(`Último contacto registrado: ${fechaTexto(cambios.ultimo_contacto)}.`)
  if ('recordatorio' in cambios && cambios.recordatorio !== antes.recordatorio)
    e.push(cambios.recordatorio ? `Recordatorio programado para el ${fechaHoraTexto(cambios.recordatorio)}.` : 'Se quitó el recordatorio.')
  if ('telefono' in cambios && cambios.telefono !== antes.telefono) e.push('Se actualizó el teléfono.')
  if ('email' in cambios && cambios.email !== antes.email) e.push('Se actualizó el email.')
  if ('emails_extra' in cambios) {
    const previos = (antes.emails_extra || []).map((x) => x.toLowerCase())
    const despues = cambios.emails_extra.map((x) => x.trim().toLowerCase()).filter(Boolean)
    despues.filter((x) => !previos.includes(x)).forEach((x) => e.push(`Se agregó el email ${x}.`))
    previos.filter((x) => !despues.includes(x)).forEach((x) => e.push(`Se quitó el email ${x}.`))
  }
  if ('consulta' in cambios && cambios.consulta !== antes.consulta) e.push('Se editó la consulta.')
  return e
}

const EDITABLES = ['interes', 'destacado', 'ultimo_contacto', 'recordatorio', 'telefono', 'email', 'emails_extra', 'consulta']

function tomar(c, id, desde, texto) {
  const l = leadDelEquipo(c, id)
  if (l.estado !== desde) error(409, desde === 'vencido' ? 'Otro asesor ya lo reclamó' : 'Ya no está en Archivo')
  Object.assign(l, {
    estado: 'activo',
    asesor_id: c.uid,
    ultimo_contacto: null,
    fecha_ingreso: ahora(),
    vencido_at: null,
    archivado_at: null,
    updated_at: ahora(),
  })
  historial(l.id, `${texto} por ${c.yo.nombre}.`, c.uid)
  return conAsesor(l)
}

const rutasLeads = {
  'GET /api/leads': (c, q) => {
    exigirEquipo(c)
    let lista = db.leads.filter((l) => l.tenant_id === c.tenant)
    if (q.get('estado')) {
      const estados = q.get('estado').split(',')
      lista = lista.filter((l) => estados.includes(l.estado))
    }
    return lista.map(conAsesor)
  },
  'GET /api/leads/buscar': (c, q) => {
    exigirEquipo(c)
    const t = (q.get('q') || '').trim().toLowerCase()
    if (t.length < 2) return []
    const digitos = t.replace(/\D/g, '')
    return db.leads
      .filter(
        (l) =>
          l.tenant_id === c.tenant &&
          (l.nombre.toLowerCase().includes(t) ||
            emailsDe(l).some((e) => e.includes(t)) ||
            (digitos.length >= 3 && claveTelefono(l.telefono).includes(digitos))),
      )
      .slice(0, 30)
      .map(conAsesor)
  },
  'GET /api/leads/totales': (c) => {
    exigirEquipo(c)
    const mios = db.leads.filter((l) => l.tenant_id === c.tenant && (c.lider || l.asesor_id === c.uid))
    return { ganados: mios.filter((l) => l.estado === 'ganado').length, perdidos: mios.filter((l) => l.estado === 'perdido').length }
  },
  'GET /api/leads/:id': (c, q, p) => conAsesor(leadDelEquipo(c, p.id)),
  'POST /api/leads': (c, q, p, b) => {
    exigirEquipo(c)
    if (!b?.nombre) error(400, 'El nombre es obligatorio')
    const otro = repetido(c, b)
    if (otro) error(409, `Ya hay un contacto con ese teléfono o email: ${otro.nombre}`)
    const l = {
      id: nuevoId(),
      tenant_id: c.tenant,
      asesor_id: c.uid,
      nombre: b.nombre,
      telefono: b.telefono || null,
      email: b.email || null,
      emails_extra: [],
      origen: b.origen || null,
      consulta: b.consulta || null,
      interes: null,
      estado: 'activo',
      destacado: false,
      fecha_ingreso: ahora(),
      ultimo_contacto: null,
      recordatorio: null,
      created_at: ahora(),
      updated_at: ahora(),
    }
    db.leads.push(l)
    historial(l.id, 'Alta manual del contacto.', c.uid)
    return conAsesor(l)
  },
  'POST /api/leads/importar': (c, q, p, b) => {
    exigirEquipo(c)
    const asesor = c.lider ? (b.sinAsignar ? null : b.asesorId || c.uid) : c.uid
    let importados = 0
    const repetidos = []
    const errores = []
    for (const f of b.filas || []) {
      if (!f.nombre?.trim()) errores.push({ fila: f.fila, motivo: 'Falta el nombre' })
      else if (!f.telefono?.trim() && !f.email?.trim()) errores.push({ fila: f.fila, motivo: 'Falta el teléfono o el email' })
      else if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim()))
        errores.push({ fila: f.fila, motivo: 'El email no es válido' })
      else if (repetido(c, f)) repetidos.push({ fila: f.fila, nombre: f.nombre, motivo: 'Ya hay un contacto con ese teléfono o email' })
      else {
        const l = {
          id: nuevoId(),
          tenant_id: c.tenant,
          asesor_id: asesor,
          nombre: f.nombre.trim(),
          telefono: f.telefono || null,
          email: f.email?.trim().toLowerCase() || null,
          emails_extra: [],
          origen: f.origen || null,
          consulta: f.consulta || null,
          interes: null,
          estado: 'activo',
          destacado: false,
          fecha_ingreso: ahora(),
          ultimo_contacto: null,
          recordatorio: null,
          created_at: ahora(),
          updated_at: ahora(),
        }
        db.leads.push(l)
        historial(l.id, `Importado desde ${b.archivo || 'una planilla'}.`, c.uid)
        importados += 1
      }
    }
    return { importados, repetidos, errores }
  },
  'PATCH /api/leads/:id': (c, q, p, b) => {
    const l = leadDelEquipo(c, p.id)
    if (!puedeEditar(c, l)) error(403, 'No tenés permiso para modificar este lead')
    const cambios = {}
    EDITABLES.forEach((k) => b[k] !== undefined && (cambios[k] = b[k]))
    if (!Object.keys(cambios).length) error(400, 'No mandaste ningún campo válido para actualizar')
    if ('telefono' in cambios || 'email' in cambios || 'emails_extra' in cambios) {
      const otro = repetido(c, { ...l, ...cambios }, l.id)
      if (otro) error(409, `Ya hay un contacto con ese teléfono o email: ${otro.nombre}`)
    }
    const textos = entradasHistorial(l, cambios)
    Object.assign(l, cambios, { updated_at: ahora() })
    textos.forEach((t) => historial(l.id, t, c.uid))
    return conAsesor(l)
  },
  'GET /api/leads/:id/historial': (c, q, p) => {
    leadDelEquipo(c, p.id)
    return db.historial
      .filter((h) => h.lead_id === p.id)
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .map((h) => ({ id: h.id, texto: h.texto, created_at: h.created_at, autor: h.autor_id ? { nombre: nombreDe(h.autor_id) } : null }))
  },
  'POST /api/leads/:id/historial': (c, q, p, b) => {
    const l = leadDelEquipo(c, p.id)
    if (!puedeEditar(c, l)) error(403, 'No tenés permiso para registrar actividad en este lead')
    const texto = String(b?.texto || '').trim()
    if (!texto) error(400, 'Escribí algo para registrar')
    historial(l.id, texto, c.uid)
    const h = db.historial[db.historial.length - 1]
    return { id: h.id, texto, created_at: h.created_at, autor: { nombre: c.yo.nombre } }
  },
  'POST /api/leads/:id/reclamar': (c, q, p) => tomar(c, p.id, 'vencido', 'Reclamado'),
  'POST /api/leads/:id/reactivar': (c, q, p) => tomar(c, p.id, 'archivo', 'Reactivado desde Archivo'),
  'POST /api/leads/:id/reasignar': (c, q, p, b) => {
    exigirLider(c, 'Solo el líder puede reasignar leads')
    const l = leadDelEquipo(c, p.id)
    if (l.estado !== 'activo') error(409, `Solo se pueden reasignar leads activos (este está ${l.estado})`)
    const nuevo = db.profiles.find((x) => x.id === b.asesorId && x.tenant_id === c.tenant)
    if (!nuevo) error(400, 'Esa persona no es parte del equipo')
    if (!nuevo.activo) error(400, 'Esa persona está desactivada: no se le pueden asignar contactos')
    const anterior = nombreDe(l.asesor_id)
    l.asesor_id = nuevo.id
    l.updated_at = ahora()
    historial(
      l.id,
      anterior ? `Reasignado de ${anterior} a ${nuevo.nombre} por ${c.yo.nombre}.` : `Asignado a ${nuevo.nombre} por ${c.yo.nombre}.`,
      c.uid,
    )
    return conAsesor(l)
  },
}

// ---------- cierres ----------
const rutasCierres = {
  'GET /api/cierres': (c, q) => {
    exigirEquipo(c)
    const tipo = q.get('tipo')
    let lista = db.cierres.filter((x) => x.tenant_id === c.tenant && (!tipo || x.tipo === tipo))
    if (q.get('campos') === 'analisis') return lista.map(({ lead_id, tipo: t, datos, motivo }) => ({ lead_id, tipo: t, datos, motivo }))
    const lead = (x) => db.leads.find((l) => l.id === x.lead_id)
    // el asesor ve los suyos; el líder, todo el equipo
    lista = lista.filter((x) => c.lider || lead(x)?.asesor_id === c.uid)
    if (q.get('asesor')) lista = lista.filter((x) => lead(x)?.asesor_id === q.get('asesor'))
    lista = lista
      .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))
      .map((x) => ({ ...x, lead: conAsesor(lead(x)), cerrador: x.cerrado_por ? { nombre: nombreDe(x.cerrado_por) } : null }))
    if (q.get('limite') === null) return lista
    const desde = Number(q.get('desde') || 0)
    const cantidad = Number(q.get('limite'))
    return { cierres: lista.slice(desde, desde + cantidad), hayMas: lista.length > desde + cantidad }
  },
  'GET /api/cierres/:id': (c, q, p) => {
    leadDelEquipo(c, p.id)
    return db.cierres.find((x) => x.lead_id === p.id) || null
  },
  'PUT /api/cierres/:id': (c, q, p, b) => {
    const l = leadDelEquipo(c, p.id)
    if (!c.lider && l.asesor_id !== c.uid) error(403, 'No tenés permiso para cerrar este lead')
    if (b.tipo !== 'ganado' && b.tipo !== 'perdido') error(400, 'El tipo de cierre tiene que ser "ganado" o "perdido"')
    const config = db.config[c.tenant]
    if (b.tipo === 'ganado') {
      const falta = (config.campos_cierre || []).find((f) => f.obligatorio && (b.datos?.[f.id] === undefined || b.datos?.[f.id] === ''))
      if (falta) error(400, `Completá "${falta.nombre}"`)
    }
    let cierre = db.cierres.find((x) => x.lead_id === l.id)
    const valores = {
      tipo: b.tipo,
      datos: b.tipo === 'ganado' ? b.datos || {} : {},
      motivo: b.tipo === 'perdido' ? b.motivo || null : null,
      updated_at: ahora(),
    }
    if (cierre) Object.assign(cierre, valores)
    else {
      cierre = { id: nuevoId(), lead_id: l.id, tenant_id: c.tenant, cerrado_por: c.uid, created_at: ahora(), ...valores }
      db.cierres.push(cierre)
    }
    const editado = l.estado === b.tipo
    l.estado = b.tipo
    l.updated_at = ahora()
    const principal = (config.campos_cierre || [])[0]
    historial(
      l.id,
      b.tipo === 'ganado'
        ? `${editado ? 'Se editó el cierre' : 'Cerrado como ganado'}${principal && b.datos?.[principal.id] ? `: ${b.datos[principal.id]}` : ''}.`
        : `${editado ? 'Se editó el cierre' : 'Cerrado como perdido'}${b.motivo ? `. Motivo: ${b.motivo}` : ''}.`,
      c.uid,
    )
    return cierre
  },
}

// ---------- agenda ----------
function validarRecordatorio(b) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b?.fecha || '')) error(400, 'La fecha no es válida')
  if (!/^\d{2}:\d{2}/.test(b?.hora || '')) error(400, 'Indicá la hora')
  if (!String(b?.contacto || '').trim()) error(400, 'Indicá con quién o qué es')
  return { fecha: b.fecha, hora: b.hora.length === 5 ? `${b.hora}:00` : b.hora, contacto: b.contacto.trim(), nota: b.nota?.trim() || null }
}
const rutasAgenda = {
  'GET /api/recordatorios': (c, q) => {
    exigirEquipo(c)
    const fecha = q.get('fecha')
    const hasta = q.get('hasta') || fecha
    let quien = c.uid
    const pedido = q.get('asesor')
    if (pedido && pedido !== c.uid) {
      if (!c.lider) error(403, 'Solo el líder puede ver la agenda de otras personas')
      quien = pedido
    }
    return db.recordatorios
      .filter((r) => r.tenant_id === c.tenant && (quien === '*' || r.asesor_id === quien))
      .filter((r) => (r.fecha >= fecha && r.fecha <= hasta) || (r.fecha < fecha && !r.hecho))
      .sort(ordenarRecordatorios)
  },
  'POST /api/recordatorios': (c, q, p, b) => {
    exigirEquipo(c)
    const r = {
      id: nuevoId(),
      tenant_id: c.tenant,
      asesor_id: c.uid,
      lead_id: null,
      hecho: false,
      created_at: ahora(),
      ...validarRecordatorio(b),
    }
    db.recordatorios.push(r)
    return r
  },
  'PATCH /api/recordatorios/:id': (c, q, p, b) => {
    exigirEquipo(c)
    const r = db.recordatorios.find((x) => x.id === p.id && x.tenant_id === c.tenant && (x.asesor_id === c.uid || c.lider))
    if (!r) error(404, 'Recordatorio no encontrado')
    if (Object.keys(b).every((k) => k === 'hecho')) r.hecho = !!b.hecho
    else Object.assign(r, validarRecordatorio(b), b.hecho !== undefined ? { hecho: !!b.hecho } : {})
    return r
  },
}

// ---------- charlas ----------
const charlaDelEquipo = (c, id) => db.charlas.find((x) => x.id === id && x.tenant_id === c.tenant) || error(404, 'Charla no encontrada')
const invitadoConDatos = (i) => ({
  id: i.id,
  asistio: i.asistio,
  notificado_at: i.notificado_at,
  notificado_por: i.notificado_por,
  invitador: i.notificado_por ? { nombre: nombreDe(i.notificado_por) } : null,
  lead: conAsesor(db.leads.find((l) => l.id === i.lead_id)),
})
function datosCharla(b) {
  if (!String(b?.nombre || '').trim()) error(400, 'Ingresá el nombre de la charla')
  if (!b?.fecha || Number.isNaN(new Date(b.fecha).getTime())) error(400, 'Indicá una fecha y hora válidas')
  return { nombre: b.nombre.trim(), fecha: new Date(b.fecha).toISOString(), carrera: b.categoria || null, meet_link: b.link || null }
}
const rutasCharlas = {
  'GET /api/charlas': (c) => {
    exigirEquipo(c)
    return db.charlas
      .filter((x) => x.tenant_id === c.tenant)
      .sort((a, b) => (a.fecha < b.fecha ? -1 : 1))
      .map((x) => {
        const inv = db.notificados.filter((i) => i.charla_id === x.id)
        return { ...x, invitados: inv.length, asistieron: inv.filter((i) => i.asistio === true).length }
      })
  },
  'GET /api/charlas/proximas': (c) => {
    exigirEquipo(c)
    const desde = new Date(Date.now() - 3 * 36e5).toISOString()
    return { proximas: db.charlas.filter((x) => x.tenant_id === c.tenant && x.fecha >= desde).length }
  },
  'GET /api/charlas/lead/:id': (c, q, p) => {
    leadDelEquipo(c, p.id)
    return db.notificados
      .filter((i) => i.lead_id === p.id)
      .map((i) => {
        const ch = db.charlas.find((x) => x.id === i.charla_id)
        return { id: i.id, asistio: i.asistio, charla: ch && { id: ch.id, nombre: ch.nombre, fecha: ch.fecha, carrera: ch.carrera } }
      })
      .filter((i) => i.charla)
      .sort((a, b) => (a.charla.fecha < b.charla.fecha ? -1 : 1))
  },
  'GET /api/charlas/:id': (c, q, p) => {
    const ch = charlaDelEquipo(c, p.id)
    return { ...ch, invitados: db.notificados.filter((i) => i.charla_id === ch.id).map(invitadoConDatos) }
  },
  'POST /api/charlas': (c, q, p, b) => {
    exigirLider(c, 'Solo el líder puede crear charlas')
    const ch = { id: nuevoId(), tenant_id: c.tenant, created_by: c.uid, created_at: ahora(), ...datosCharla(b) }
    db.charlas.push(ch)
    return ch
  },
  'PUT /api/charlas/:id': (c, q, p, b) => {
    const ch = charlaDelEquipo(c, p.id)
    if (!c.lider && ch.created_by !== c.uid) error(403, 'Solo el líder puede editar la charla')
    return Object.assign(ch, datosCharla(b))
  },
  'DELETE /api/charlas/:id': (c, q, p) => {
    exigirLider(c, 'Solo el líder puede eliminar charlas')
    const ch = charlaDelEquipo(c, p.id)
    db.charlas = db.charlas.filter((x) => x.id !== ch.id)
    db.notificados = db.notificados.filter((i) => i.charla_id !== ch.id)
    return { ok: true }
  },
  'POST /api/charlas/:id/invitados': (c, q, p, b) => {
    const ch = charlaDelEquipo(c, p.id)
    const l = leadDelEquipo(c, b.leadId)
    if (!c.lider && l.asesor_id !== c.uid) error(403, 'Solo podés invitar a tus propios contactos')
    let i = db.notificados.find((x) => x.charla_id === ch.id && x.lead_id === l.id)
    if (!i) {
      i = { id: nuevoId(), charla_id: ch.id, lead_id: l.id, asistio: null, notificado_at: ahora(), notificado_por: c.uid }
      db.notificados.push(i)
      historial(l.id, `Invitado a "${ch.nombre}" (${fechaHoraTexto(ch.fecha)}).`, c.uid)
    }
    return i
  },
  'PATCH /api/charlas/invitados/:id': (c, q, p, b) => {
    exigirEquipo(c)
    const i = db.notificados.find((x) => x.id === p.id) || error(404, 'Invitación no encontrada')
    i.asistio = b.asistio
    return i
  },
}

// ---------- equipo, perfil y configuración ----------
function armarConfig(b) {
  const texto = (v) => (typeof v === 'string' ? v.trim() : '')
  const entero = (v) => (Number.isInteger(Number(v)) && v !== '' && v !== null ? Number(v) : null)
  const config = {
    rubro: texto(b.rubro),
    termino_contacto: texto(b.terminoContacto),
    termino_contacto_plural: texto(b.terminoContactoPlural),
    vencimiento_habilitado: b.vencimientoHabilitado === true,
    dias_vencimiento_lead: entero(b.diasVencimiento),
    dias_alerta_previa: entero(b.diasAlertaPrevia),
    dias_archivo: entero(b.diasArchivo),
    categorias_origen: Array.isArray(b.categoriasOrigen) ? b.categoriasOrigen : [],
    eventos_habilitado: b.eventosHabilitado === true,
    termino_evento: texto(b.terminoEvento) || 'Charla informativa',
    email_diario: b.emailDiario !== false,
    dias_habiles: b.diasHabiles === true,
  }
  if (!texto(b.equipoNombre)) error(400, 'Ingresá el nombre del equipo')
  if (!config.termino_contacto || !config.termino_contacto_plural) error(400, 'Indicá cómo se llaman tus contactos')
  if (Array.isArray(b.camposCierre)) config.campos_cierre = b.camposCierre
  if (Array.isArray(b.motivosPerdida)) config.motivos_perdida = b.motivosPerdida.map((m) => m.trim()).filter(Boolean)
  return config
}

function leerArchivo(archivo) {
  return new Promise((listo, fallo) => {
    const lector = new FileReader()
    lector.onload = () => listo(lector.result)
    lector.onerror = () => fallo(new ErrorDemo(400, 'No se pudo leer la imagen'))
    lector.readAsDataURL(archivo)
  })
}

const rutasEquipo = {
  'GET /api/me': (c) => {
    if (!c.yo) return null
    if (!c.yo.activo) return { desactivado: true, equipo: db.tenants.find((t) => t.id === c.yo.tenant_id)?.nombre, invitaciones: [] }
    return { ...c.yo, tenants: { nombre: db.tenants.find((t) => t.id === c.tenant)?.nombre }, invitaciones: [] }
  },
  'PATCH /api/me': (c, q, p, b) => {
    exigirEquipo(c)
    const nombre = String(b?.nombre || '').trim()
    if (!nombre) error(400, 'Escribí tu nombre')
    c.yo.nombre = nombre
    return rutasEquipo['GET /api/me'](c)
  },
  'PUT /api/me/foto': async (c, q, p, b) => {
    exigirEquipo(c)
    c.yo.avatar_url = b instanceof Blob ? await leerArchivo(b) : null
    return rutasEquipo['GET /api/me'](c)
  },
  'DELETE /api/me/foto': (c) => {
    exigirEquipo(c)
    c.yo.avatar_url = ''
    return rutasEquipo['GET /api/me'](c)
  },
  'POST /api/me/invitaciones/:id/aceptar': () => error(404, 'Esa invitación ya no está disponible'),
  'DELETE /api/me/invitaciones/:id': () => ({ ok: true }),
  'GET /api/config': (c) => (exigirEquipo(c), db.config[c.tenant]),
  'PUT /api/config': (c, q, p, b) => {
    exigirLider(c, 'Solo el líder puede cambiar la configuración del equipo')
    Object.assign(db.config[c.tenant], armarConfig(b))
    db.tenants.find((t) => t.id === c.tenant).nombre = b.equipoNombre.trim()
    return db.config[c.tenant]
  },
  'GET /api/config/equipo': (c) => {
    exigirEquipo(c)
    return {
      miembros: db.profiles.filter((x) => x.tenant_id === c.tenant).sort((a, b) => a.nombre.localeCompare(b.nombre)),
      invitaciones: c.lider ? db.invitaciones.filter((i) => i.tenant_id === c.tenant && !i.aceptada_at) : [],
      licencias: db.tenants.find((t) => t.id === c.tenant)?.licencias,
    }
  },
  'POST /api/config/invitaciones': (c, q, p, b) => {
    exigirLider(c, 'Solo el líder puede invitar miembros')
    const emailsEquipo = db.profiles.filter((x) => x.tenant_id === c.tenant).map((x) => db.usuarios.find((u) => u.id === x.id)?.email)
    const nuevos = [...new Set((b.emails || []).map((e) => e.trim().toLowerCase()))].filter(
      (e) => e && !emailsEquipo.includes(e) && !db.invitaciones.some((i) => i.tenant_id === c.tenant && i.email === e && !i.aceptada_at),
    )
    const tenant = db.tenants.find((t) => t.id === c.tenant)
    const libres = tenant.licencias - licenciasUsadas(c.tenant)
    if (nuevos.length > libres)
      error(
        409,
        libres <= 0
          ? tenant.licencias === 1
            ? 'Tu equipo tiene 1 licencia, la tuya. Para sumar personas necesitás más licencias.'
            : `Usaste las ${tenant.licencias} licencias del equipo. Desactivá a alguien o pedí más licencias.`
          : `Te ${libres === 1 ? 'queda 1 licencia libre' : `quedan ${libres} licencias libres`}: invitá hasta ${libres}.`,
      )
    nuevos.forEach((email) =>
      db.invitaciones.push({
        id: nuevoId(),
        tenant_id: c.tenant,
        email,
        rol: 'asesor',
        invitado_por: c.uid,
        created_at: ahora(),
        aceptada_at: null,
      }),
    )
    return { agregadas: nuevos.length }
  },
  'DELETE /api/config/invitaciones/:id': (c, q, p) => {
    exigirLider(c)
    db.invitaciones = db.invitaciones.filter((i) => !(i.id === p.id && i.tenant_id === c.tenant))
    return { ok: true }
  },
  'POST /api/config/miembros/:id/desactivar': (c, q, p) => {
    exigirLider(c, 'Solo el líder puede desactivar miembros')
    if (p.id === c.uid) error(400, 'No podés desactivarte a vos')
    const m =
      db.profiles.find((x) => x.id === p.id && x.tenant_id === c.tenant && x.activo) ||
      error(404, 'Esa persona no es un miembro activo del equipo')
    Object.assign(m, { activo: false, desactivado_at: ahora(), desactivado_por: c.uid })
    return { leads: db.leads.filter((l) => l.asesor_id === m.id && ['activo', 'vencido'].includes(l.estado)).length }
  },
  'POST /api/config/miembros/:id/reactivar': (c, q, p) => {
    exigirLider(c, 'Solo el líder puede reactivar miembros')
    const tenant = db.tenants.find((t) => t.id === c.tenant)
    if (licenciasUsadas(c.tenant) >= tenant.licencias)
      error(409, `Usaste las ${tenant.licencias} licencias del equipo. Desactivá a alguien o pedí más licencias.`)
    const m =
      db.profiles.find((x) => x.id === p.id && x.tenant_id === c.tenant && !x.activo) || error(404, 'Esa persona no está desactivada')
    Object.assign(m, { activo: true, desactivado_at: null, desactivado_por: null })
    return { ok: true }
  },
  'PATCH /api/config/miembros/:id': (c, q, p, b) => {
    exigirLider(c, 'Solo el líder puede cambiar roles')
    if (b.rol !== 'asesor' && b.rol !== 'lider') error(400, 'Rol inválido')
    if (b.rol === 'asesor' && !db.profiles.some((x) => x.tenant_id === c.tenant && x.activo && x.rol === 'lider' && x.id !== p.id))
      error(409, 'El equipo tiene que tener al menos una persona líder')
    const m =
      db.profiles.find((x) => x.id === p.id && x.tenant_id === c.tenant && x.activo) ||
      error(404, 'Esa persona no es un miembro activo del equipo')
    m.rol = b.rol
    return { ok: true }
  },
  'POST /api/onboarding': (c, q, p, b) => {
    if (c.tenant) error(409, 'Tu usuario ya pertenece a un equipo')
    const config = armarConfig(b)
    const id = nuevoId()
    db.tenants.push({ id, nombre: b.equipoNombre.trim(), plan: 'individual', licencias: 1, created_by: c.uid, created_at: ahora() })
    db.config[id] = {
      tenant_id: id,
      motivos_perdida: ['Precio', 'Eligió otra opción', 'No respondió', 'Horarios', 'Ya no le interesa'],
      campos_cierre: [],
      ...config,
    }
    db.profiles.push({
      id: c.uid,
      tenant_id: id,
      nombre: String(b.nombreUsuario || '').trim() || c.usuario?.nombre || 'Líder',
      rol: 'lider',
      avatar_url: null,
      activo: true,
      historico: false,
      created_at: ahora(),
    })
    return { tenantId: id, invitados: 0 }
  },
}

// ---------- reportes y plantillas ----------
function crud(tabla, compartidoCampo, permisoTexto, validar) {
  const visibles = (c) => db[tabla].filter((x) => x.tenant_id === c.tenant && (x.creado_por === c.uid || x[compartidoCampo]))
  const conAutor = (x) => ({ ...x, autor: { nombre: nombreDe(x.creado_por) } })
  const puede = (c, x) => x.creado_por === c.uid || (x[compartidoCampo] && c.lider)
  return {
    lista: (c) => (exigirEquipo(c), visibles(c).map(conAutor)),
    crear: (c, q, p, b) => {
      exigirEquipo(c)
      const datos = validar(b)
      if (datos[compartidoCampo] && !c.lider) error(403, permisoTexto)
      const x = { id: nuevoId(), tenant_id: c.tenant, creado_por: c.uid, created_at: ahora(), updated_at: ahora(), ...datos }
      db[tabla].push(x)
      return conAutor(x)
    },
    editar: (c, q, p, b) => {
      const x = visibles(c).find((y) => y.id === p.id)
      if (!x || !puede(c, x)) error(403, 'No podés modificar esto')
      const datos = validar(b)
      if (datos[compartidoCampo] && !c.lider) error(403, permisoTexto)
      Object.assign(x, datos, { updated_at: ahora() })
      return conAutor(x)
    },
    borrar: (c, q, p) => {
      const x = visibles(c).find((y) => y.id === p.id)
      if (!x || !puede(c, x)) error(403, 'No podés borrar esto')
      db[tabla] = db[tabla].filter((y) => y.id !== x.id)
      return { ok: true }
    },
  }
}
const reportes = crud('reportes', 'compartido', 'Solo el líder puede compartir reportes con el equipo', (b) => {
  if (!String(b?.nombre || '').trim()) error(400, 'Ponele un nombre al reporte')
  return { nombre: b.nombre.trim(), definicion: b.definicion, compartido: b.compartido === true }
})
const plantillas = crud('plantillas', 'compartida', 'Solo el líder puede compartir plantillas con el equipo', (b) => {
  const nombre = String(b?.nombre || '').trim()
  const texto = String(b?.texto || '').trim()
  if (!nombre) error(400, 'Ponele un nombre a la plantilla')
  if (!texto) error(400, 'Escribí el texto del mensaje')
  const canal = ['whatsapp', 'email', 'ambos'].includes(b.canal) ? b.canal : 'ambos'
  return {
    nombre,
    texto,
    canal,
    asunto: canal === 'whatsapp' ? null : String(b.asunto || '').trim() || null,
    compartida: b.compartida === true,
  }
})

const RUTAS = {
  ...rutasLeads,
  ...rutasCierres,
  ...rutasAgenda,
  ...rutasCharlas,
  ...rutasEquipo,
  'GET /api/reportes': reportes.lista,
  'POST /api/reportes': reportes.crear,
  'PUT /api/reportes/:id': reportes.editar,
  'DELETE /api/reportes/:id': reportes.borrar,
  'GET /api/plantillas': plantillas.lista,
  'POST /api/plantillas': plantillas.crear,
  'PUT /api/plantillas/:id': plantillas.editar,
  'DELETE /api/plantillas/:id': plantillas.borrar,
}

// las rutas fijas antes que las que tienen :id (como en Express)
const ORDENADAS = Object.keys(RUTAS).sort((a, b) => a.includes(':') - b.includes(':'))

function buscarRuta(metodo, camino) {
  for (const clave of ORDENADAS) {
    const [m, patron] = clave.split(' ')
    if (m !== metodo) continue
    const partes = patron.split('/')
    const pedidas = camino.split('/')
    if (partes.length !== pedidas.length) continue
    const params = {}
    if (partes.every((x, i) => (x.startsWith(':') ? ((params[x.slice(1)] = decodeURIComponent(pedidas[i])), true) : x === pedidas[i]))) {
      return { manejar: RUTAS[clave], params }
    }
  }
  return null
}

// responde un pedido como lo haría el backend: devuelve los datos o lanza un error con mensaje
export async function responder(metodo, ruta, cuerpo, uid) {
  const url = new URL(ruta, 'http://prototipo')
  const encontrada = buscarRuta(metodo, url.pathname)
  if (!encontrada) error(404, 'Esta acción no está disponible en el prototipo')
  const resultado = await encontrada.manejar(contexto(uid), url.searchParams, encontrada.params, cuerpo ?? {})
  if (metodo !== 'GET') guardar()
  // copia, para que la pantalla no modifique los datos "del servidor" sin pasar por una ruta
  return resultado === undefined ? null : JSON.parse(JSON.stringify(resultado))
}
