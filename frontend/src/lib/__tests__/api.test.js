import { describe, expect, test, vi, afterEach } from 'vitest'

vi.mock('../supabaseClient', () => ({ supabase: { auth: { getSession: async () => ({ data: { session: null } }) } } }))
const { apiFetch } = await import('../api')

const responder = (status, texto) => vi.stubGlobal('fetch', async () => new Response(texto, { status }))

describe('apiFetch', () => {
  afterEach(() => vi.unstubAllGlobals())

  test('un null en JSON es una respuesta válida (contacto sin cierre)', async () => {
    responder(200, 'null')
    expect(await apiFetch('/api/cierres/1')).toBeNull()
  })
  test('una respuesta que no es JSON da un error claro', async () => {
    responder(200, '<html>caído</html>')
    await expect(apiFetch('/x')).rejects.toThrow('El servidor respondió algo inesperado')
  })
  test('los errores del servidor llegan con su mensaje', async () => {
    responder(409, JSON.stringify({ error: 'Ya hay un contacto con ese teléfono: Ana' }))
    await expect(apiFetch('/x')).rejects.toThrow('Ya hay un contacto con ese teléfono: Ana')
    responder(503, '<html></html>')
    await expect(apiFetch('/x')).rejects.toThrow('El servidor no está disponible')
  })
})
