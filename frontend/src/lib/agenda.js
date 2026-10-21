const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const dos = (n) => String(n).padStart(2, '0')

// la fecha de HOY en hora local del navegador, como la espera el servidor: "2026-10-05"
export function fechaLocal(ahora = new Date()) {
  return `${ahora.getFullYear()}-${dos(ahora.getMonth() + 1)}-${dos(ahora.getDate())}`
}

// "17:30:00" -> "17:30"
export function hhmm(hora) {
  return hora ? hora.slice(0, 5) : ''
}

// la próxima hora en punto (a las 23:xx sugiere 23:59, para que siga siendo de hoy)
export function horaSugerida(ahora = new Date()) {
  return ahora.getHours() >= 23 ? '23:59' : `${dos(ahora.getHours() + 1)}:00`
}

// hecho | atrasado (de un día anterior) | urgente (ya es la hora o pasó) | pronto (en las próximas 2 horas) | normal
export function estadoRecordatorio(item, ahora = new Date()) {
  if (item.hecho) return 'hecho'
  if (item.fecha < fechaLocal(ahora)) return 'atrasado'
  if (!item.hora) return 'normal'
  const [h, m] = item.hora.split(':').map(Number)
  const diferencia = h * 60 + m - (ahora.getHours() * 60 + ahora.getMinutes())
  if (diferencia <= 0) return 'urgente'
  if (diferencia <= 120) return 'pronto'
  return 'normal'
}

export function textoPendientes(delDia) {
  if (delDia.length === 0) return 'Sin recordatorios para hoy'
  const pendientes = delDia.filter((r) => !r.hecho).length
  if (pendientes === 0) return 'Todo listo por hoy'
  return `${pendientes} pendiente${pendientes === 1 ? '' : 's'}`
}

// "ayer", "mañana" o "4 oct"
export function etiquetaFecha(fecha, hoy) {
  const [anio, mes, dia] = fecha.split('-').map(Number)
  if (fecha === diasDespues(hoy, -1)) return 'ayer'
  if (fecha === diasDespues(hoy, 1)) return 'mañana'
  const nombreDia = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'][new Date(anio, mes - 1, dia).getDay()]
  return fecha > hoy ? `${nombreDia} ${dia} ${MESES[mes - 1]}` : `${dia} ${MESES[mes - 1]}`
}

// "2026-10-05" + 2 -> "2026-10-07" (en hora local)
export function diasDespues(fecha, n) {
  const [anio, mes, dia] = fecha.split('-').map(Number)
  return fechaLocal(new Date(anio, mes - 1, dia + n))
}

// Los recordatorios que se cargan en la tarjeta de cada lead (RF25), con la misma forma que los de
// la agenda, para mostrarlos juntos. Cuentan como hechos si después se registró un contacto.
export function recordatoriosDeLeads(leads, userId) {
  return leads
    .filter((l) => l.asesor_id === userId && l.estado === 'activo' && l.recordatorio)
    .map((l) => {
      const f = new Date(l.recordatorio)
      return {
        id: `lead-${l.id}`,
        lead: l,
        fecha: fechaLocal(f),
        hora: `${dos(f.getHours())}:${dos(f.getMinutes())}`,
        contacto: l.nombre,
        nota: 'Recordatorio del contacto',
        hecho: !!l.ultimo_contacto && new Date(l.ultimo_contacto) >= f,
      }
    })
}

// por fecha y después por hora (sin hora, al final)
export function ordenarRecordatorios(a, b) {
  if (a.fecha !== b.fecha) return a.fecha < b.fecha ? -1 : 1
  if (a.hora === b.hora) return 0
  if (!a.hora) return 1
  if (!b.hora) return -1
  return a.hora < b.hora ? -1 : 1
}

// ---- vistas de la agenda (días, semana, mes) ----

const DIAS_CORTOS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
const MESES_LARGOS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
]

export const VISTAS_AGENDA = [
  { valor: 'dias', etiqueta: 'Días', paso: 5 },
  { valor: 'semana', etiqueta: 'Semana', paso: 7 },
  { valor: 'mes', etiqueta: 'Mes' },
]

function partes(fecha) {
  const [anio, mes, dia] = fecha.split('-').map(Number)
  return { anio, mes, dia, semana: new Date(anio, mes - 1, dia).getDay() }
}

export const nombreDia = (fecha) => DIAS_CORTOS[partes(fecha).semana]
export const numeroDia = (fecha) => partes(fecha).dia
export const mesCorto = (fecha) => MESES[partes(fecha).mes - 1]

// el lunes de la semana de esa fecha
export function inicioSemana(fecha) {
  return diasDespues(fecha, -((partes(fecha).semana + 6) % 7))
}

export function inicioMes(fecha) {
  return `${fecha.slice(0, 7)}-01`
}

// mueve el cursor un período para adelante (1) o para atrás (-1)
export function moverCursor(vista, cursor, sentido) {
  if (vista === 'mes') {
    const { anio, mes } = partes(cursor)
    return fechaLocal(new Date(anio, mes - 1 + sentido, 1))
  }
  return diasDespues(cursor, sentido * VISTAS_AGENDA.find((v) => v.valor === vista).paso)
}

// el primer día que se muestra según la vista (la semana arranca el lunes; el mes muestra 6 semanas)
export function primerDia(vista, cursor) {
  if (vista === 'semana') return inicioSemana(cursor)
  if (vista === 'mes') return inicioSemana(inicioMes(cursor))
  return cursor
}

// los días que se ven en pantalla, en orden
export function diasDeVista(vista, cursor) {
  const cantidad = vista === 'mes' ? 42 : VISTAS_AGENDA.find((v) => v.valor === vista).paso
  const desde = primerDia(vista, cursor)
  return Array.from({ length: cantidad }, (_, i) => diasDespues(desde, i))
}

// "21 – 25 oct 2026", "19 – 25 oct 2026" u "octubre 2026"
export function etiquetaPeriodo(vista, cursor) {
  if (vista === 'mes') {
    const { anio, mes } = partes(cursor)
    return `${MESES_LARGOS[mes - 1]} ${anio}`
  }
  const dias = diasDeVista(vista, cursor)
  const a = partes(dias[0])
  const b = partes(dias[dias.length - 1])
  const inicio = a.mes === b.mes ? `${a.dia}` : `${a.dia} ${MESES[a.mes - 1]}`
  return `${inicio} – ${b.dia} ${MESES[b.mes - 1]} ${b.anio}`
}

// "Hoy", "Mañana", "Ayer" o "jueves 23"
export function tituloDia(fecha, hoy) {
  if (fecha === hoy) return 'Hoy'
  if (fecha === diasDespues(hoy, 1)) return 'Mañana'
  if (fecha === diasDespues(hoy, -1)) return 'Ayer'
  return `${nombreDia(fecha)} ${numeroDia(fecha)}`
}

// "miércoles 21 de octubre"
export function fechaLarga(fecha) {
  const { mes, dia, semana } = partes(fecha)
  const nombres = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
  return `${nombres[semana]} ${dia} de ${MESES_LARGOS[mes - 1]}`
}
