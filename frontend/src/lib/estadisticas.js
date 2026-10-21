// Cálculos del dashboard de estadísticas (RF37), a partir de los leads del equipo.
import { etiquetaInteres } from './interes'

const MS_DIA = 864e5

export const PERIODOS = [
  { valor: 30, etiqueta: 'Últimos 30 días' },
  { valor: 90, etiqueta: 'Últimos 90 días' },
  { valor: 0, etiqueta: 'Todo' },
]

// lunes 00:00 de la semana de una fecha (hora local)
function inicioSemana(fecha) {
  const d = new Date(fecha)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d
}

// un lead cuenta como contactado si tiene contacto registrado o ya se cerró
const fueContactado = (l) => !!l.ultimo_contacto || l.estado === 'ganado' || l.estado === 'perdido'

export function calcularEstadisticas(leads, { dias, asesorId, ahora }) {
  const desde = dias ? ahora - dias * MS_DIA : 0
  const base = leads.filter((l) => (!asesorId || l.asesor_id === asesorId) && new Date(l.fecha_ingreso).getTime() >= desde)

  const contactados = base.filter(fueContactado).length
  const ganados = base.filter((l) => l.estado === 'ganado').length
  const perdidos = base.filter((l) => l.estado === 'perdido').length

  // por origen: los 6 más frecuentes y el resto junto en "Otros"
  const conteo = new Map()
  base.forEach((l) => {
    const o = (l.origen || '').trim() || 'Sin origen'
    conteo.set(o, (conteo.get(o) || 0) + 1)
  })
  let porOrigen = [...conteo].map(([etiqueta, valor]) => ({ etiqueta, valor })).sort((a, b) => b.valor - a.valor)
  if (porOrigen.length > 7) {
    const resto = porOrigen.slice(6).reduce((s, x) => s + x.valor, 0)
    porOrigen = [...porOrigen.slice(0, 6), { etiqueta: 'Otros', valor: resto }]
  }

  // por nivel de interés, en el orden de siempre
  const porInteres = [...Object.keys(etiquetaInteres), null].map((clave) => ({
    etiqueta: clave ? etiquetaInteres[clave] : 'Sin categoría',
    valor: base.filter((l) => (l.interes || null) === clave).length,
  }))

  // evolución semanal de ingresos: las semanas del período (como máximo 26)
  const primera = base.reduce((min, l) => Math.min(min, new Date(l.fecha_ingreso).getTime()), ahora)
  const cantidadSemanas = Math.min(26, Math.max(1, Math.ceil(((dias ? dias * MS_DIA : ahora - primera) + 1) / (7 * MS_DIA))))
  const estaSemana = inicioSemana(ahora)
  const porSemana = Array.from({ length: cantidadSemanas }, (_, i) => {
    const inicio = new Date(estaSemana)
    inicio.setDate(inicio.getDate() - 7 * (cantidadSemanas - 1 - i))
    return { inicio, valor: 0 }
  })
  base.forEach((l) => {
    const t = inicioSemana(l.fecha_ingreso).getTime()
    const semana = porSemana.find((s) => s.inicio.getTime() === t)
    if (semana) semana.valor += 1
  })

  return {
    ingresados: base.length,
    contactados,
    tasaContacto: base.length ? contactados / base.length : null,
    ganados,
    perdidos,
    tasaConversion: ganados + perdidos ? ganados / (ganados + perdidos) : null,
    porOrigen,
    porInteres,
    porSemana: porSemana.map((s) => ({
      etiqueta: s.inicio.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }),
      valor: s.valor,
    })),
  }
}

export function porcentaje(x) {
  return x === null ? '—' : `${Math.round(x * 100)}%`
}
