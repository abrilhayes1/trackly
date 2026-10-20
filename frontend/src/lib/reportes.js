// Reportes personalizados (RF45): cada reporte se define con qué medir, cómo agrupar, filtros y
// cómo verlo. Acá se calcula con los leads y los cierres que ya ve el usuario.
import { etiquetaInteres } from './interes'
import { formatearNumero } from './cierre'

export const MEDIDAS = [
  { valor: 'cantidad', etiqueta: 'Cantidad de contactos' },
  { valor: 'contactados', etiqueta: 'Contactados' },
  { valor: 'ganados', etiqueta: 'Ganados' },
  { valor: 'perdidos', etiqueta: 'Perdidos' },
  { valor: 'tasa_contacto', etiqueta: 'Tasa de contacto' },
  { valor: 'tasa_conversion', etiqueta: 'Tasa de conversión' },
  { valor: 'suma_campo', etiqueta: 'Suma de un campo del cierre' },
  { valor: 'promedio_campo', etiqueta: 'Promedio de un campo del cierre' },
]

export const AGRUPAR = [
  { valor: 'ninguno', etiqueta: 'Sin agrupar (un solo número)' },
  { valor: 'origen', etiqueta: 'Origen' },
  { valor: 'interes', etiqueta: 'Nivel de interés' },
  { valor: 'asesor', etiqueta: 'Asesor', soloLider: true },
  { valor: 'estado', etiqueta: 'Estado' },
  { valor: 'semana', etiqueta: 'Semana de ingreso' },
  { valor: 'mes', etiqueta: 'Mes de ingreso' },
  { valor: 'campo_cierre', etiqueta: 'Un campo del cierre' },
]

export const VISTAS = [
  { valor: 'barras', etiqueta: 'Barras' },
  { valor: 'columnas', etiqueta: 'Columnas' },
  { valor: 'tabla', etiqueta: 'Tabla' },
]

export const PERIODOS_REPORTE = [
  { valor: 7, etiqueta: '7 días' },
  { valor: 30, etiqueta: '30 días' },
  { valor: 90, etiqueta: '90 días' },
  { valor: 365, etiqueta: '12 meses' },
  { valor: 0, etiqueta: 'Todo' },
]

export const ESTADOS = [
  { valor: 'activo', etiqueta: 'Activo' },
  { valor: 'vencido', etiqueta: 'Vencido' },
  { valor: 'archivo', etiqueta: 'Archivo' },
  { valor: 'ganado', etiqueta: 'Ganado' },
  { valor: 'perdido', etiqueta: 'Perdido' },
]

export const DEFINICION_INICIAL = {
  medida: 'cantidad',
  campoMedida: null,
  agrupar: 'origen',
  campoAgrupar: null,
  vista: 'barras',
  filtros: { dias: 30, estados: [], asesorId: '', origen: '', interes: '', destacados: false },
}

const MS_DIA = 864e5
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const MAX_GRUPOS = 12

const fueContactado = (l) => !!l.ultimo_contacto || l.estado === 'ganado' || l.estado === 'perdido'
const esTasa = (m) => m === 'tasa_contacto' || m === 'tasa_conversion'
const esSumable = (m) => !esTasa(m) && m !== 'promedio_campo'

function inicioSemana(fecha) {
  const d = new Date(fecha)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d
}

function numero(v) {
  const n = typeof v === 'number' ? v : Number(String(v ?? '').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

// cómo mostrar el valor según lo que se mide
export function formatoDe(medida) {
  if (esTasa(medida)) return (v) => (v === null || v === undefined ? '—' : `${Math.round(v * 100)}%`)
  if (medida === 'suma_campo' || medida === 'promedio_campo') return (v) => (v === null || v === undefined ? '—' : formatearNumero(v))
  return (v) => String(v ?? 0)
}

// el valor de la medida para un grupo de leads
function medir(medida, grupo, def, cierreDe) {
  const ganados = grupo.filter((l) => l.estado === 'ganado')
  const perdidos = grupo.filter((l) => l.estado === 'perdido')
  switch (medida) {
    case 'cantidad':
      return grupo.length
    case 'contactados':
      return grupo.filter(fueContactado).length
    case 'ganados':
      return ganados.length
    case 'perdidos':
      return perdidos.length
    case 'tasa_contacto':
      return grupo.length ? grupo.filter(fueContactado).length / grupo.length : null
    case 'tasa_conversion':
      return ganados.length + perdidos.length ? ganados.length / (ganados.length + perdidos.length) : null
    default: {
      const valores = ganados.map((l) => numero(cierreDe(l)?.datos?.[def.campoMedida])).filter((v) => v !== null)
      if (medida === 'suma_campo') return valores.reduce((s, v) => s + v, 0)
      return valores.length ? valores.reduce((s, v) => s + v, 0) / valores.length : null
    }
  }
}

// resumen de una línea para mostrar debajo del título del reporte
export function describir(def, { campos = [], varios = 'leads' }) {
  const nombreCampo = (id) => campos.find((c) => c.id === id)?.nombre || 'campo'
  const medida =
    def.medida === 'suma_campo'
      ? `Suma de ${nombreCampo(def.campoMedida)}`
      : def.medida === 'promedio_campo'
        ? `Promedio de ${nombreCampo(def.campoMedida)}`
        : MEDIDAS.find((m) => m.valor === def.medida)?.etiqueta.replace('contactos', varios)
  const agrupar =
    def.agrupar === 'ninguno'
      ? ''
      : ` por ${def.agrupar === 'campo_cierre' ? nombreCampo(def.campoAgrupar) : AGRUPAR.find((a) => a.valor === def.agrupar)?.etiqueta.toLowerCase()}`
  const periodo = PERIODOS_REPORTE.find((p) => p.valor === def.filtros.dias)?.etiqueta
  return `${medida}${agrupar} · ${def.filtros.dias ? `últimos ${periodo}` : 'todo el historial'}`
}

export function calcularReporte(leads, cierres, def, { userId, esLider, miembros = [], ahora }) {
  const f = def.filtros
  const cierrePorLead = new Map(cierres.map((c) => [c.lead_id, c]))
  const cierreDe = (l) => cierrePorLead.get(l.id)
  const desde = f.dias ? ahora - f.dias * MS_DIA : 0

  // el asesor solo ve lo suyo (igual que en el resumen); el líder puede filtrar por asesor
  let base = leads.filter((l) => (esLider ? !f.asesorId || l.asesor_id === f.asesorId : l.asesor_id === userId))
  base = base.filter((l) => new Date(l.fecha_ingreso).getTime() >= desde)
  if (f.estados.length) base = base.filter((l) => f.estados.includes(l.estado))
  if (f.origen) base = base.filter((l) => (l.origen || '') === f.origen)
  if (f.interes) base = base.filter((l) => (l.interes || 'sin') === f.interes)
  if (f.destacados) base = base.filter((l) => l.destacado)
  // agrupar por un campo del cierre solo tiene sentido con los ganados que tienen ese dato
  if (def.agrupar === 'campo_cierre') base = base.filter((l) => l.estado === 'ganado' && cierreDe(l))

  const formato = formatoDe(def.medida)

  if (def.agrupar === 'ninguno') {
    return { tipo: 'numero', valor: medir(def.medida, base, def, cierreDe), total: base.length, formato }
  }

  const nombreAsesor = (id) => miembros.find((m) => m.id === id)?.nombre || (id ? 'Otro asesor' : 'Sin asignar')
  const clave = {
    origen: (l) => (l.origen || '').trim() || 'Sin origen',
    interes: (l) => (l.interes ? etiquetaInteres[l.interes] : 'Sin categoría'),
    asesor: (l) => nombreAsesor(l.asesor_id),
    estado: (l) => ESTADOS.find((e) => e.valor === l.estado)?.etiqueta || l.estado,
    semana: (l) => inicioSemana(l.fecha_ingreso).getTime(),
    mes: (l) => {
      const d = new Date(l.fecha_ingreso)
      return d.getFullYear() * 12 + d.getMonth()
    },
    campo_cierre: (l) => String(cierreDe(l)?.datos?.[def.campoAgrupar] ?? '').trim() || 'Sin dato',
  }[def.agrupar]

  const grupos = new Map()
  base.forEach((l) => {
    const k = clave(l)
    if (!grupos.has(k)) grupos.set(k, [])
    grupos.get(k).push(l)
  })

  let filas
  if (def.agrupar === 'semana' || def.agrupar === 'mes') {
    // las fechas van en orden y sin huecos (las semanas o meses sin datos dan 0)
    const claves = [...grupos.keys()]
    const fin = def.agrupar === 'semana' ? inicioSemana(ahora).getTime() : new Date(ahora).getFullYear() * 12 + new Date(ahora).getMonth()
    const paso = def.agrupar === 'semana' ? 7 * MS_DIA : 1
    const limite = def.agrupar === 'semana' ? 26 : 24
    const inicioPeriodo = desde
      ? def.agrupar === 'semana'
        ? inicioSemana(desde).getTime()
        : new Date(desde).getFullYear() * 12 + new Date(desde).getMonth()
      : Math.min(fin, ...claves)
    const pasos = Math.min(limite, Math.round((fin - inicioPeriodo) / paso) + 1)
    filas = Array.from({ length: pasos }, (_, i) => {
      const k = fin - (pasos - 1 - i) * paso
      const etiqueta =
        def.agrupar === 'semana'
          ? new Date(k).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
          : `${MESES[k % 12]} ${Math.floor(k / 12)}`
      return { etiqueta, valor: medir(def.medida, grupos.get(k) || [], def, cierreDe) }
    })
  } else {
    filas = [...grupos].map(([k, lista]) => ({ etiqueta: String(k), valor: medir(def.medida, lista, def, cierreDe), n: lista.length }))
    if (def.agrupar === 'interes') {
      const orden = [...Object.values(etiquetaInteres), 'Sin categoría']
      filas.sort((a, b) => orden.indexOf(a.etiqueta) - orden.indexOf(b.etiqueta))
    } else if (def.agrupar === 'estado') {
      const orden = ESTADOS.map((e) => e.etiqueta)
      filas.sort((a, b) => orden.indexOf(a.etiqueta) - orden.indexOf(b.etiqueta))
    } else {
      filas.sort((a, b) => (b.valor ?? -1) - (a.valor ?? -1))
    }
    // muchos grupos: los primeros y el resto junto en "Otros" (solo si se puede sumar)
    if (filas.length > MAX_GRUPOS) {
      const resto = filas.slice(MAX_GRUPOS - 1)
      filas = filas.slice(0, MAX_GRUPOS - 1)
      if (esSumable(def.medida)) filas.push({ etiqueta: 'Otros', valor: resto.reduce((s, x) => s + (x.valor || 0), 0) })
    }
  }

  // en las tasas, un grupo sin datos queda sin valor (se muestra "—"), no como 0%
  return { tipo: 'grupos', filas: filas.map(({ etiqueta, valor }) => ({ etiqueta, valor })), total: base.length, formato }
}
