// Miembros del equipo y licencias (RF53). Un miembro puede estar activo, desactivado por el líder
// (sus leads siguen a su nombre hasta que se reasignan) o ser "histórico": la persona se fue a otro
// equipo y su perfil quedó acá para el historial.

// antes de correr 19_licencias.sql los perfiles no traen "activo": se toman como activos
export const estaActivo = (m) => m?.activo !== false

export const miembrosActivos = (miembros = []) => miembros.filter(estaActivo)

// nombre para listas y filtros: a quien ya no está se lo marca
export function nombreMiembro(m) {
  if (!m) return ''
  return estaActivo(m) ? m.nombre : `${m.nombre} (desactivado)`
}

// licencias ocupadas: miembros activos + invitaciones pendientes
export function licenciasUsadas(miembros = [], invitaciones = []) {
  return miembrosActivos(miembros).length + invitaciones.length
}

// leads activos o vencidos que siguen a nombre de alguien desactivado
export function leadsDeDesactivados(leads = [], miembros = []) {
  const inactivos = new Set(miembros.filter((m) => !estaActivo(m)).map((m) => m.id))
  return leads.filter((l) => (l.estado === 'activo' || l.estado === 'vencido') && inactivos.has(l.asesor_id))
}

// miembros que tiene sentido mostrar en el panel: los activos y los desactivados que todavía tienen leads
export function miembrosParaPanel(miembros = [], leads = []) {
  const conLeads = new Set(leadsDeDesactivados(leads, miembros).map((l) => l.asesor_id))
  return miembros.filter((m) => estaActivo(m) || conLeads.has(m.id))
}

// para estadísticas y reportes: los activos y quienes ya no están pero tienen datos en el período
// (sus resultados siguen contando), con el nombre marcado
export function miembrosConDatos(miembros = [], leads = []) {
  const conLeads = new Set(leads.map((l) => l.asesor_id))
  return miembros.filter((m) => estaActivo(m) || conLeads.has(m.id)).map((m) => ({ ...m, nombre: nombreMiembro(m) }))
}
