import { describe, expect, test } from 'vitest'
import { aCSV, armarFilas, claveTelefono, detectarColumnas, normalizar, revisarFilas } from '../importar'

describe('reconocer las columnas de la planilla', () => {
  test('normaliza acentos, mayúsculas y símbolos', () => {
    expect(normalizar('  Teléfono / WhatsApp ')).toBe('telefono whatsapp')
  })

  test('encuentra cada campo por nombres comunes', () => {
    const m = detectarColumnas(['Nombre y apellido', 'Celular', 'E-mail', 'Fuente', 'Observaciones', 'DNI'])
    expect(m).toEqual({ nombre: 0, apellido: null, telefono: 1, email: 2, origen: 3, consulta: 4 })
  })

  test('nombre y apellido en columnas separadas', () => {
    const m = detectarColumnas(['Apellido', 'Nombre', 'Tel'])
    expect(m.nombre).toBe(1)
    expect(m.apellido).toBe(0)
    expect(m.telefono).toBe(2)
  })
})

describe('armar y revisar las filas', () => {
  const datos = [
    [], // fila vacía arriba de los títulos
    ['Nombre', 'Apellido', 'Teléfono', 'Email', 'Origen'],
    ['Ana', 'Pérez', 1123456789, 'ANA@Mail.com', ''],
    ['Beto', '', '+54 9 11 2345-6789', '', 'Feria'],
    ['', '', '1155550000', '', ''],
    ['Caro', '', '', '', ''],
    ['Dani', '', '', 'dani@', ''],
    ['Eva', '', '11 5555 1111', '', ''],
    ['', '', '', '', ''],
  ]
  const mapeo = detectarColumnas(datos[1])
  const filas = armarFilas(datos, mapeo, { origenFijo: 'Planilla vieja' })

  test('arma los contactos con el número de fila del Excel y saltea las vacías', () => {
    expect(filas).toHaveLength(6)
    expect(filas[0]).toEqual({
      fila: 3,
      nombre: 'Ana Pérez',
      telefono: '1123456789',
      email: 'ana@mail.com',
      origen: 'Planilla vieja',
      consulta: '',
    })
    expect(filas[1].origen).toBe('Feria')
  })

  test('el teléfono se compara por los últimos 10 dígitos', () => {
    expect(claveTelefono('+54 9 11 2345-6789')).toBe('1123456789')
    expect(claveTelefono('011 2345 6789')).toBe('1123456789')
    expect(claveTelefono('')).toBe(null)
  })

  test('marca errores y repetidos (en el archivo y contra los contactos del equipo)', () => {
    const r = revisarFilas(filas, [{ telefono: '11-5555-1111' }])
    expect(r.map((f) => [f.fila, f.estado, f.motivo])).toEqual([
      [3, 'ok', ''],
      [4, 'repetido', 'Ya hay un contacto con ese teléfono'],
      [5, 'error', 'Falta el nombre'],
      [6, 'error', 'Falta el teléfono o el email'],
      [7, 'error', 'El email no es válido'],
      [8, 'repetido', 'Ya hay un contacto con ese teléfono'],
    ])
  })

  test('el CSV usa punto y coma, comillas cuando hacen falta y BOM para los acentos', () => {
    expect(aCSV(['A', 'B'], [['uno; dos', 'dijo "hola"']])).toBe('﻿A;B\r\n"uno; dos";"dijo ""hola"""')
  })
})
