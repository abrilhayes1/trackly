// Contadores del menú lateral: cuántos pendientes hay en cada sección (documentación, 2.2).
// Usan las mismas reglas que cada pantalla, así el número del menú coincide con lo que se ve adentro.
import { agruparLeads } from './urgencia'
import { calcularAlertas } from './alertas'

export function calcularContadores({ leads, recordatorios, config, userId, rol }) {
  const esLider = rol === 'lider'
  const alertas = calcularAlertas(leads, config, userId)
  // los cierres: el asesor cuenta los suyos; el líder, los de todo el equipo (como en sus pantallas)
  const propios = (l) => esLider || l.asesor_id === userId

  return {
    leads: agruparLeads(leads, config, userId).porVencer.length,
    alertas: alertas.vencenHoy.length + alertas.porVencer.length + alertas.recordatorios.length,
    agenda: recordatorios.filter((r) => !r.hecho).length,
    archivo: leads.filter((l) => l.estado === 'vencido').length,
    exitosos: leads.filter((l) => l.estado === 'ganado' && propios(l)).length,
    perdidos: leads.filter((l) => l.estado === 'perdido' && propios(l)).length,
    // panel del líder: leads activos que todavía no tienen asesor
    sinAsignar: esLider ? leads.filter((l) => l.estado === 'activo' && !l.asesor_id).length : 0,
  }
}
