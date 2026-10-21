import { describe, expect, test } from 'vitest'
import { calcularReporte, DEFINICION_INICIAL } from '../reportes'
import { calcularEstadisticas } from '../estadisticas'

const AHORA = new Date(2026, 9, 21, 12, 0).getTime()
const hace = (dias) => new Date(AHORA - dias * 864e5).toISOString()
const leads = [
  {
    id: 1,
    estado: 'ganado',
    asesor_id: 'a',
    origen: 'Instagram',
    interes: 'muy_interesado',
    fecha_ingreso: hace(5),
    ultimo_contacto: hace(2),
  },
  { id: 2, estado: 'perdido', asesor_id: 'a', origen: 'Instagram', interes: 'frio', fecha_ingreso: hace(6), ultimo_contacto: hace(3) },
  { id: 3, estado: 'activo', asesor_id: 'b', origen: 'Web', interes: null, fecha_ingreso: hace(7), ultimo_contacto: null },
  { id: 4, estado: 'ganado', asesor_id: 'b', origen: 'Web', interes: 'interesado', fecha_ingreso: hace(60), ultimo_contacto: hace(50) },
]
const cierres = [
  { lead_id: 1, datos: { importe: '1000' } },
  { lead_id: 4, datos: { importe: 500 } },
]

describe('reportes personalizados', () => {
  const opciones = { userId: 'a', esLider: true, ahora: AHORA }

  test('cantidad por origen en los últimos 30 días', () => {
    const r = calcularReporte(leads, cierres, DEFINICION_INICIAL, opciones)
    expect(r.tipo).toBe('grupos')
    expect(r.filas).toEqual([
      { etiqueta: 'Instagram', valor: 2 },
      { etiqueta: 'Web', valor: 1 },
    ])
  })

  test('tasa de conversión sin agrupar, en todo el historial', () => {
    const def = {
      ...DEFINICION_INICIAL,
      medida: 'tasa_conversion',
      agrupar: 'ninguno',
      filtros: { ...DEFINICION_INICIAL.filtros, dias: 0 },
    }
    const r = calcularReporte(leads, cierres, def, opciones)
    expect(r.valor).toBeCloseTo(2 / 3)
    expect(r.formato(r.valor)).toBe('67%')
  })

  test('suma de un campo del cierre (solo ganados, acepta texto con números)', () => {
    const def = {
      ...DEFINICION_INICIAL,
      medida: 'suma_campo',
      campoMedida: 'importe',
      agrupar: 'ninguno',
      filtros: { ...DEFINICION_INICIAL.filtros, dias: 0 },
    }
    expect(calcularReporte(leads, cierres, def, opciones).valor).toBe(1500)
  })

  test('el asesor solo ve lo suyo', () => {
    const def = { ...DEFINICION_INICIAL, agrupar: 'ninguno', filtros: { ...DEFINICION_INICIAL.filtros, dias: 0 } }
    expect(calcularReporte(leads, cierres, def, { userId: 'b', esLider: false, ahora: AHORA }).valor).toBe(2)
  })
})

describe('estadísticas', () => {
  test('indicadores de los últimos 30 días', () => {
    const e = calcularEstadisticas(leads, { dias: 30, asesorId: '', ahora: AHORA })
    expect(e).toMatchObject({ ingresados: 3, contactados: 2, ganados: 1, perdidos: 1 })
    expect(e.tasaConversion).toBeCloseTo(0.5)
  })
})
