import { describe, expect, test } from 'vitest'
import {
  diasDespues,
  diasDeVista,
  estadoRecordatorio,
  etiquetaFecha,
  etiquetaPeriodo,
  inicioSemana,
  moverCursor,
  recordatoriosDeLeads,
} from '../agenda'

describe('fechas de la agenda', () => {
  test('diasDespues cruza meses y años', () => {
    expect(diasDespues('2026-10-30', 3)).toBe('2026-11-02')
    expect(diasDespues('2026-12-31', 1)).toBe('2027-01-01')
    expect(diasDespues('2026-03-01', -1)).toBe('2026-02-28')
  })

  test('la semana arranca el lunes', () => {
    expect(inicioSemana('2026-10-21')).toBe('2026-10-19') // miércoles → lunes
    expect(inicioSemana('2026-10-25')).toBe('2026-10-19') // domingo → lunes anterior
  })

  test('cada vista muestra los días que corresponden', () => {
    expect(diasDeVista('dias', '2026-10-21')).toEqual(['2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25'])
    expect(diasDeVista('semana', '2026-10-21')[0]).toBe('2026-10-19')
    const mes = diasDeVista('mes', '2026-10-21')
    expect(mes).toHaveLength(42)
    expect(mes[0]).toBe('2026-09-28') // lunes de la semana del 1 de octubre
  })

  test('las flechas avanzan 5 días, una semana o un mes', () => {
    expect(moverCursor('dias', '2026-10-21', 1)).toBe('2026-10-26')
    expect(moverCursor('semana', '2026-10-21', -1)).toBe('2026-10-14')
    expect(moverCursor('mes', '2026-10-21', 1)).toBe('2026-11-01')
  })

  test('etiquetas de fechas y períodos', () => {
    expect(etiquetaFecha('2026-10-20', '2026-10-21')).toBe('ayer')
    expect(etiquetaFecha('2026-10-22', '2026-10-21')).toBe('mañana')
    expect(etiquetaFecha('2026-10-23', '2026-10-21')).toBe('vie 23 oct')
    expect(etiquetaPeriodo('dias', '2026-10-29')).toBe('29 oct – 2 nov 2026')
    expect(etiquetaPeriodo('mes', '2026-10-21')).toBe('octubre 2026')
  })
})

describe('recordatorios', () => {
  const ahora = new Date(2026, 9, 21, 15, 0) // 21 oct 2026, 15:00

  test('estado según el día y la hora', () => {
    expect(estadoRecordatorio({ fecha: '2026-10-20', hora: '10:00', hecho: false }, ahora)).toBe('atrasado')
    expect(estadoRecordatorio({ fecha: '2026-10-21', hora: '14:00', hecho: false }, ahora)).toBe('urgente')
    expect(estadoRecordatorio({ fecha: '2026-10-21', hora: '16:30', hecho: false }, ahora)).toBe('pronto')
    expect(estadoRecordatorio({ fecha: '2026-10-21', hora: '20:00', hecho: false }, ahora)).toBe('normal')
    expect(estadoRecordatorio({ fecha: '2026-10-20', hora: '10:00', hecho: true }, ahora)).toBe('hecho')
  })

  test('los recordatorios de los leads: solo propios y activos; hechos si hubo contacto después', () => {
    const leads = [
      { id: 1, nombre: 'Ana', asesor_id: 'yo', estado: 'activo', recordatorio: '2026-10-21T13:00:00', ultimo_contacto: null },
      {
        id: 2,
        nombre: 'Beto',
        asesor_id: 'yo',
        estado: 'activo',
        recordatorio: '2026-10-20T10:00:00',
        ultimo_contacto: '2026-10-20T12:00:00',
      },
      { id: 3, nombre: 'Caro', asesor_id: 'otro', estado: 'activo', recordatorio: '2026-10-21T10:00:00' },
      { id: 4, nombre: 'Dani', asesor_id: 'yo', estado: 'ganado', recordatorio: '2026-10-21T10:00:00' },
      { id: 5, nombre: 'Eva', asesor_id: 'yo', estado: 'activo', recordatorio: null },
    ]
    const r = recordatoriosDeLeads(leads, 'yo')
    expect(r.map((x) => x.contacto)).toEqual(['Ana', 'Beto'])
    expect(r[0]).toMatchObject({ fecha: '2026-10-21', hora: '13:00', hecho: false })
    expect(r[1].hecho).toBe(true)
  })
})

describe('agenda sin fines de semana', () => {
  test('la vista Días junta 5 días hábiles (con el fin de semana del medio)', () => {
    // jueves 22/10/2026
    expect(diasDeVista('dias', '2026-10-22', true)).toEqual([
      '2026-10-22',
      '2026-10-23',
      '2026-10-24',
      '2026-10-25',
      '2026-10-26',
      '2026-10-27',
      '2026-10-28',
    ])
  })
  test('las flechas avanzan y retroceden 5 días hábiles', () => {
    expect(moverCursor('dias', '2026-10-22', 1, true)).toBe('2026-10-29')
    expect(moverCursor('dias', '2026-10-29', -1, true)).toBe('2026-10-22')
  })
})
