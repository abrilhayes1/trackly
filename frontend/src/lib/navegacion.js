// Direcciones de la app (#/agenda, #/leads/lead/<id>): la pantalla y el contacto abierto quedan en la
// barra del navegador. Así funcionan Atrás y Adelante, recargar no te devuelve al inicio y se puede
// compartir el enlace a un contacto.

export const VISTAS = ['leads', 'alertas', 'agenda', 'charlas', 'archivo', 'exitosos', 'perdidos', 'stats', 'panel', 'config', 'perfil']

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// lo que viene de Supabase al volver de Google o del email de recuperación (no hay que pisarlo)
export const esRespuestaDeSupabase = (hash = '') => /access_token=|refresh_token=|error=|error_description=/.test(hash)

// "#/agenda/lead/<id>" -> { vista: 'agenda', leadId: '<id>' }; lo que no se reconoce queda en null
export function leerDireccion(hash = '') {
  if (esRespuestaDeSupabase(hash)) return { vista: null, leadId: null }
  const [vista, tipo, id] = hash.replace(/^#\/?/, '').split('/')
  if (!VISTAS.includes(vista)) return { vista: null, leadId: null }
  const leadId = tipo === 'lead' && UUID.test(id || '') ? id.toLowerCase() : null
  return { vista, leadId }
}

export const armarDireccion = (vista, leadId = null) => `#/${vista}${leadId ? `/lead/${leadId}` : ''}`
