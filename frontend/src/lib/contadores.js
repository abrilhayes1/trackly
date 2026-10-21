// Contadores del menú lateral: cuántos pendientes hay en cada sección (documentación, 2.2).
// Usan las mismas reglas que cada pantalla, así el número del menú coincide con lo que se ve adentro.
import { agruparLeads } from './urgencia'
import { calcularAlertas } from './alertas'

// leads: la lista de trabajo (activos y vencidos); totales: { ganados, perdidos } contados en la base
// charlas: { proximas } contadas en la base
export function calcularContadores({ leads, recordatorios, charlas, totales, config, userId, rol }) {
  const esLider = rol === 'lider'
  const alertas = calcularAlertas(leads, config, userId)

  return {
    leads: agruparLeads(leads, config, userId).porVencer.length,
    alertas: alertas.vencenHoy.length + alertas.porVencer.length + alertas.recordatorios.length,
    // los de la agenda pendientes más los de los contactos de hoy o atrasados
    agenda: recordatorios.filter((r) => !r.hecho).length + alertas.recordatorios.length,
    archivo: leads.filter((l) => l.estado === 'vencido').length,
    // los cierres: el asesor cuenta los suyos; el líder, los de todo el equipo (lo resuelve el servidor)
    exitosos: totales?.ganados ?? 0,
    perdidos: totales?.perdidos ?? 0,
    // eventos que todavía no pasaron (con 3 horas de margen, como en la pantalla; lo cuenta el servidor)
    charlas: charlas?.proximas ?? 0,
    // panel del líder: leads activos que todavía no tienen asesor
    sinAsignar: esLider ? leads.filter((l) => l.estado === 'activo' && !l.asesor_id).length : 0,
  }
}
