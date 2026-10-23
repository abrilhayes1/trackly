import { describe, expect, test } from 'vitest'
import { compararAsesores } from '../estadisticas'

const ahora = new Date('2026-10-23T12:00:00').getTime()
const hace = (d) => new Date(ahora - d * 864e5).toISOString()
const miembros = [
  { id: 'a', nombre: 'Ana' },
  { id: 'b', nombre: 'Beto' },
]
const leads = [
  { id: '1', asesor_id: 'a', estado: 'ganado', fecha_ingreso: hace(10) },
  { id: '2', asesor_id: 'a', estado: 'ganado', fecha_ingreso: hace(12) },
  { id: '3', asesor_id: 'a', estado: 'perdido', fecha_ingreso: hace(5) },
  { id: '4', asesor_id: 'a', estado: 'activo', fecha_ingreso: hace(1), ultimo_contacto: null },
  { id: '5', asesor_id: 'b', estado: 'vencido', fecha_ingreso: hace(20), ultimo_contacto: hace(18) },
  { id: '6', asesor_id: 'b', estado: 'archivo', fecha_ingreso: hace(25) },
  { id: '7', asesor_id: 'b', estado: 'ganado', fecha_ingreso: hace(80) },
  { id: '8', asesor_id: null, estado: 'activo', fecha_ingreso: hace(2) },
]
const cierres = [
  { lead_id: '1', tipo: 'ganado', datos: { importe: 100000 } },
  { lead_id: '2', tipo: 'ganado', datos: { importe: '50000' } },
  { lead_id: '7', tipo: 'ganado', datos: { importe: 999 } },
]

describe('compararAsesores', () => {
  test('una fila por persona con sus números del período, ordenadas por ganados', () => {
    const [ana, beto] = compararAsesores(leads, { dias: 30, ahora, cierres, miembros, campoImporte: 'importe' })
    expect(ana).toMatchObject({ nombre: 'Ana', ingresados: 4, contactados: 3, ganados: 2, perdidos: 1, vencidos: 0, importe: 150000 })
    expect(ana.tasaConversion).toBeCloseTo(2 / 3)
    // el ganado de hace 80 días queda fuera de los últimos 30
    expect(beto).toMatchObject({ nombre: 'Beto', ingresados: 2, contactados: 1, ganados: 0, vencidos: 2, importe: 0, tasaConversion: null })
  })
  test('con "Todo" entra todo, y sin campo de importe no se suma nada', () => {
    const filas = compararAsesores(leads, { dias: 0, ahora, cierres, miembros })
    expect(filas.find((f) => f.nombre === 'Beto')).toMatchObject({ ingresados: 3, ganados: 1, importe: null })
  })
})
