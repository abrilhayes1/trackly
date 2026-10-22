import { contarDias } from './urgencia'

const diasDesde = (fecha, ahora, habiles) => Math.max(0, contarDias(fecha, ahora, habiles))

function haceDias(dias) {
  if (dias === 0) return 'hoy'
  return dias === 1 ? 'hace 1 día' : `hace ${dias} días`
}

// Vencidos: cuándo vencieron y, si el equipo archiva, cuántos días les quedan para reclamarlos.
// Archivados: cuándo pasaron a Archivo.
export function textoArchivo(lead, diasArchivo, ahora = new Date(), habiles = false) {
  if (lead.estado === 'archivo') {
    return lead.archivado_at ? `Archivado ${haceDias(diasDesde(lead.archivado_at, ahora))}` : 'Archivado'
  }
  if (!lead.vencido_at) return 'Vencido'
  const dias = diasDesde(lead.vencido_at, ahora, habiles)
  const texto = `Venció ${haceDias(dias)}`
  if (!diasArchivo) return texto
  const quedan = Math.max(0, diasArchivo - dias)
  if (quedan === 0) return `${texto} · pasa a Archivo esta noche`
  const unidad = habiles ? (quedan === 1 ? 'día hábil' : 'días hábiles') : quedan === 1 ? 'día' : 'días'
  return `${texto} · ${quedan === 1 ? 'queda' : 'quedan'} ${quedan} ${unidad} para reclamarlo`
}

const fecha = (l) => new Date(l.archivado_at || l.vencido_at || l.updated_at || 0).getTime()

// Vencidos: primero los que están por pasar a Archivo (son los más urgentes de reclamar).
// Archivados: primero los más recientes.
export function ordenarArchivo(pestana) {
  return pestana === 'vencido' ? (a, b) => fecha(a) - fecha(b) : (a, b) => fecha(b) - fecha(a)
}

export function claveInteres(lead) {
  return lead.interes || 'sin'
}
