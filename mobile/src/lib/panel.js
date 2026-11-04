// Cálculos del Panel del equipo, con las mismas reglas que la web (pages/PanelLider.jsx)
import { agruparLeads } from './compartido'

// el grupo de urgencia de cada lead activo, según su asesor ({ clave, dias })
export function gruposPorLead(leads, config, miembros) {
  const mapa = new Map()
  ;[...miembros.map((m) => m.id), null].forEach((id) => {
    const grupos = agruparLeads(leads, config, id)
    Object.entries(grupos).forEach(([clave, lista]) => lista.forEach((l) => mapa.set(l.id, { clave, dias: l.dias })))
  })
  return mapa
}

// RF40: asignados, contactados, por vencer y vencidos de una persona
export function resumenAsesor(leads, grupoDe, id) {
  const suyos = leads.filter((l) => l.estado === 'activo' && l.asesor_id === id)
  return {
    asignados: suyos.length,
    contactados: suyos.filter((l) => l.ultimo_contacto).length,
    porVencer: suyos.filter((l) => grupoDe.get(l.id)?.clave === 'porVencer').length,
    vencidos: leads.filter((l) => l.estado === 'vencido' && l.asesor_id === id).length,
  }
}
