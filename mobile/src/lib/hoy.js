// Lo de hoy, con las mismas reglas que la web: los leads que vencen o están por vencer y los
// recordatorios pendientes (los de la agenda y los programados en cada lead), en orden de hora.
import { calcularAlertas, fechaLocal, ordenarRecordatorios, recordatoriosDeLeads } from './compartido'

export function lodeHoy({ leads, agenda, config, userId }) {
  const hoy = fechaLocal()
  const alertas = calcularAlertas(leads, config, userId)
  const recordatorios = [
    ...agenda.filter((r) => !r.hecho && r.fecha <= hoy),
    ...recordatoriosDeLeads(leads, userId).filter((r) => !r.hecho && r.fecha <= hoy),
  ].sort(ordenarRecordatorios)
  return {
    vencenHoy: alertas.vencenHoy,
    porVencer: alertas.porVencer,
    recordatorios,
    total: alertas.vencenHoy.length + alertas.porVencer.length + recordatorios.length,
  }
}
