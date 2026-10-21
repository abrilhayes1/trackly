import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { agruparLeads } from '../urgencia'
import { calcularAlertas } from '../alertas'
import { calcularContadores } from '../contadores'

const AHORA = new Date(2026, 9, 21, 12, 0)
const hace = (dias) => new Date(AHORA.getTime() - dias * 864e5).toISOString()
const config = { vencimiento_habilitado: true, dias_vencimiento_lead: 14, dias_alerta_previa: 3 }
const lead = (id, extra) => ({ id, nombre: `Lead ${id}`, estado: 'activo', asesor_id: 'yo', fecha_ingreso: hace(30), ...extra })

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(AHORA)
})
afterEach(() => vi.useRealTimers())

describe('urgencia de Mis leads (plazo 14 días, aviso 3)', () => {
  test('cada lead va a su grupo', () => {
    const g = agruparLeads(
      [
        lead(1, { ultimo_contacto: hace(12) }), // a 2 días del plazo → por vencer
        lead(2, { ultimo_contacto: hace(5) }), // esta semana
        lead(3, { ultimo_contacto: null, fecha_ingreso: hace(2) }), // nunca contactado
        lead(4, { ultimo_contacto: hace(1) }), // al día
        lead(5, { ultimo_contacto: hace(1), asesor_id: 'otro' }), // de otra persona: no aparece
        lead(6, { estado: 'ganado' }), // cerrado: no aparece (RNF14)
      ],
      config,
      'yo',
    )
    expect(g.porVencer.map((l) => l.id)).toEqual([1])
    expect(g.estaSemana.map((l) => l.id)).toEqual([2])
    expect(g.sinContactar.map((l) => l.id)).toEqual([3])
    expect(g.alDia.map((l) => l.id)).toEqual([4])
  })

  test('sin vencimiento configurado nadie está por vencer', () => {
    const g = agruparLeads([lead(1, { ultimo_contacto: hace(40) })], { vencimiento_habilitado: false }, 'yo')
    expect(g.porVencer).toHaveLength(0)
    expect(g.estaSemana).toHaveLength(1)
  })
})

describe('alertas de hoy', () => {
  test('vencen hoy, por vencer y recordatorios sin atender', () => {
    const a = calcularAlertas(
      [
        lead(1, { ultimo_contacto: hace(15) }), // pasó el plazo
        lead(2, { ultimo_contacto: hace(11) }), // dentro del aviso
        lead(3, { ultimo_contacto: hace(1), recordatorio: hace(0.5) }), // recordatorio de hoy sin contacto después
        lead(4, { ultimo_contacto: hace(0.1), recordatorio: hace(0.5) }), // atendido: contacto después del recordatorio
      ],
      config,
      'yo',
      AHORA,
    )
    expect(a.vencenHoy.map((l) => l.id)).toEqual([1])
    expect(a.porVencer.map((l) => l.id)).toEqual([2])
    expect(a.recordatorios.map((l) => l.id)).toEqual([3])
  })
})

describe('contadores del menú', () => {
  test('salen de la lista de trabajo, los recordatorios y los totales del servidor', () => {
    const c = calcularContadores({
      leads: [
        lead(1, { ultimo_contacto: hace(12) }),
        lead(2, { estado: 'vencido' }),
        lead(3, { asesor_id: null, ultimo_contacto: hace(1) }),
      ],
      recordatorios: [{ hecho: false }, { hecho: true }],
      charlas: { proximas: 2 },
      totales: { ganados: 7, perdidos: 3 },
      config,
      userId: 'yo',
      rol: 'lider',
    })
    expect(c).toMatchObject({ leads: 1, archivo: 1, exitosos: 7, perdidos: 3, charlas: 2, sinAsignar: 1, agenda: 1 })
  })
})
