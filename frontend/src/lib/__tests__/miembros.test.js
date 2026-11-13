import { describe, expect, it } from 'vitest'
import {
  estaActivo,
  leadsDeDesactivados,
  licenciasUsadas,
  miembrosActivos,
  miembrosConDatos,
  miembrosParaPanel,
  nombreMiembro,
  esDe,
  duenoDe,
  TODO_EL_EQUIPO,
} from '../miembros'
import { agruparLeads } from '../urgencia'
import { recordatoriosDeLeads } from '../agenda'

const ana = { id: 'a', nombre: 'Ana', activo: true }
const beto = { id: 'b', nombre: 'Beto', activo: false }
const caro = { id: 'c', nombre: 'Caro', activo: false, historico: true }
const viejo = { id: 'v', nombre: 'Sin columna' } // perfil de antes de 19_licencias.sql

describe('miembros y licencias', () => {
  it('toma como activo a quien no trae la columna', () => {
    expect(estaActivo(viejo)).toBe(true)
    expect(miembrosActivos([ana, beto, caro, viejo]).map((m) => m.id)).toEqual(['a', 'v'])
  })

  it('marca el nombre de quien está desactivado', () => {
    expect(nombreMiembro(ana)).toBe('Ana')
    expect(nombreMiembro(beto)).toBe('Beto (desactivado)')
  })

  it('cuenta como licencia a los activos y a las invitaciones pendientes', () => {
    expect(licenciasUsadas([ana, beto, caro], [{ id: 'i1' }, { id: 'i2' }])).toBe(3)
  })

  it('encuentra los leads que quedaron a nombre de alguien desactivado', () => {
    const leads = [
      { id: 1, asesor_id: 'a', estado: 'activo' },
      { id: 2, asesor_id: 'b', estado: 'activo' },
      { id: 3, asesor_id: 'b', estado: 'vencido' },
      { id: 4, asesor_id: 'b', estado: 'ganado' },
      { id: 5, asesor_id: 'c', estado: 'activo' },
      { id: 6, asesor_id: null, estado: 'activo' },
    ]
    expect(leadsDeDesactivados(leads, [ana, beto, caro]).map((l) => l.id)).toEqual([2, 3, 5])
  })

  it('en el panel muestra a los activos y a los desactivados que todavía tienen leads', () => {
    const leads = [{ id: 1, asesor_id: 'b', estado: 'activo' }]
    expect(miembrosParaPanel([ana, beto, caro], leads).map((m) => m.id)).toEqual(['a', 'b'])
  })

  it('en estadísticas incluye a quien ya no está si tiene datos, con el nombre marcado', () => {
    const leads = [{ asesor_id: 'c', estado: 'ganado' }]
    expect(miembrosConDatos([ana, beto, caro], leads).map((m) => m.nombre)).toEqual(['Ana', 'Caro (desactivado)'])
  })
})

describe('ver todo el equipo (líder)', () => {
  const leads = [
    { id: 1, asesor_id: 'a', estado: 'activo', fecha_ingreso: new Date().toISOString(), recordatorio: new Date().toISOString() },
    { id: 2, asesor_id: 'b', estado: 'activo', fecha_ingreso: new Date().toISOString(), recordatorio: new Date().toISOString() },
    { id: 3, asesor_id: null, estado: 'activo', fecha_ingreso: new Date().toISOString() },
  ]
  const config = { vencimiento_habilitado: false }
  const ids = (grupos) =>
    Object.values(grupos)
      .flat()
      .map((l) => l.id)
      .sort()

  it('esDe acepta a una persona o a todo el equipo', () => {
    expect(esDe(leads[0], 'a')).toBe(true)
    expect(esDe(leads[1], 'a')).toBe(false)
    expect(esDe(leads[2], TODO_EL_EQUIPO)).toBe(true)
  })

  it('Mis leads con todo el equipo incluye los de todos y los sin asignar', () => {
    expect(ids(agruparLeads(leads, config, 'a'))).toEqual([1])
    expect(ids(agruparLeads(leads, config, TODO_EL_EQUIPO))).toEqual([1, 2, 3])
  })

  it('la agenda con todo el equipo junta los recordatorios de todos', () => {
    expect(recordatoriosDeLeads(leads, 'b').map((r) => r.lead.id)).toEqual([2])
    expect(recordatoriosDeLeads(leads, TODO_EL_EQUIPO).map((r) => r.lead.id)).toEqual([1, 2])
  })

  it('duenoDe dice de quién es o si no tiene asesor', () => {
    expect(duenoDe({ asesor_id: 'a', asesor: { nombre: 'Ana' } })).toBe('Ana')
    expect(duenoDe({ asesor_id: null })).toBe('Sin asignar')
  })
})
