import { describe, expect, test } from 'vitest'
import { completar, enlaceGmail, enlaceWhatsApp, nombreParaSaludo, primerNombre, valoresDe } from '../plantillas'
import { contarDias, etiquetaProximo, fechaProximoContacto } from '../urgencia'

describe('plantillas de mensajes', () => {
  test('primer nombre y nombre para saludar, con o sin coma', () => {
    expect(primerNombre('Gómez, Lucía Inés')).toBe('Lucía')
    expect(primerNombre('Martín Paz')).toBe('Martín')
    expect(nombreParaSaludo('Gómez, Lucía')).toBe('Lucía Gómez')
    expect(nombreParaSaludo('Martín Paz')).toBe('Martín Paz')
  })

  test('completa las variables y deja las desconocidas', () => {
    const v = valoresDe({ nombre: 'Ferreyra, Lucas' }, { miNombre: 'Abril Hayes', equipo: 'Escuela Sur' })
    expect(completar('Hola {nombre}, soy {mi_nombre} de {equipo}. {otra}', v)).toBe('Hola Lucas, soy Abril de Escuela Sur. {otra}')
  })

  test('arma los enlaces de WhatsApp y Gmail con el texto', () => {
    expect(enlaceWhatsApp('5491123456789', 'Hola Lucas!')).toBe('https://wa.me/5491123456789?text=Hola%20Lucas!')
    expect(enlaceWhatsApp('5491123456789', '')).toBe('https://wa.me/5491123456789')
    expect(enlaceGmail('a@b.com', { asunto: 'Info', texto: 'Hola' })).toBe(
      'https://mail.google.com/mail/?view=cm&to=a%40b.com&su=Info&body=Hola',
    )
  })
})

describe('días hábiles (igual que dias_transcurridos en la base)', () => {
  // sábado 17/10/2026 15:00
  const desde = new Date(2026, 9, 17, 15, 0)
  const casos = [
    [new Date(2026, 9, 18, 0, 5), 0, 0],
    [new Date(2026, 9, 20, 0, 5), 2, 1],
    [new Date(2026, 9, 21, 0, 5), 3, 2],
    [new Date(2026, 9, 24, 12, 0), 6, 5],
    [new Date(2026, 9, 27, 0, 5), 9, 6],
  ]
  test.each(casos)('hasta %s: %i corridos y %i hábiles', (hasta, corridos, habiles) => {
    expect(contarDias(desde, hasta, false)).toBe(corridos)
    expect(contarDias(desde, hasta, true)).toBe(habiles)
  })

  test('muchas semanas: 5 hábiles por semana', () => {
    expect(contarDias(new Date(2026, 0, 4, 10), new Date(2026, 2, 1, 10), true)).toBe(40) // domingo a domingo, 8 semanas
  })
})

describe('próximo contacto', () => {
  test('etiquetas de los botones', () => {
    expect([1, 2, 7, 14, 30].map(etiquetaProximo)).toEqual(['Mañana', 'En 2 días', 'En 1 semana', 'En 2 semanas', 'En 1 mes'])
  })
  test('con hora fija', () => {
    expect(new Date(fechaProximoContacto(2, new Date(2026, 9, 21, 22, 40), '10:00'))).toEqual(new Date(2026, 9, 23, 10, 0))
  })
})
