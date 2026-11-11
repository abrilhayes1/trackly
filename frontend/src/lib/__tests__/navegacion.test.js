import { describe, expect, it } from 'vitest'
import { armarDireccion, esRespuestaDeSupabase, leerDireccion } from '../navegacion'

const ID = '3f2b8c1e-9d4a-4b6e-8f10-2a3b4c5d6e7f'

describe('direcciones de la app', () => {
  it('lee la pantalla y el contacto abierto', () => {
    expect(leerDireccion('#/agenda')).toEqual({ vista: 'agenda', leadId: null })
    expect(leerDireccion(`#/leads/lead/${ID}`)).toEqual({ vista: 'leads', leadId: ID })
    expect(leerDireccion(`#/panel/lead/${ID.toUpperCase()}`)).toEqual({ vista: 'panel', leadId: ID })
  })

  it('ignora lo que no reconoce', () => {
    expect(leerDireccion('')).toEqual({ vista: null, leadId: null })
    expect(leerDireccion('#/cualquiera')).toEqual({ vista: null, leadId: null })
    expect(leerDireccion('#funciones')).toEqual({ vista: null, leadId: null })
    expect(leerDireccion('#/leads/lead/no-es-un-id')).toEqual({ vista: 'leads', leadId: null })
  })

  it('no toca lo que manda Supabase al volver de Google o del email', () => {
    expect(esRespuestaDeSupabase('#access_token=abc&refresh_token=x')).toBe(true)
    expect(leerDireccion('#error=access_denied&error_description=x')).toEqual({ vista: null, leadId: null })
  })

  it('arma la dirección y se puede volver a leer', () => {
    expect(armarDireccion('stats')).toBe('#/stats')
    expect(leerDireccion(armarDireccion('archivo', ID))).toEqual({ vista: 'archivo', leadId: ID })
  })
})
