const MS_DIA = 1000 * 60 * 60 * 24

// hace cuántos días venció (0 = hoy). null si no se puede saber (no es un lead vencido, o el equipo no tiene plazo)
export function diasVencido(lead, plazo, ahora = new Date()) {
  if (lead.estado !== 'vencido' || !plazo) return null
  const dias = Math.floor((ahora.getTime() - new Date(lead.ultimo_contacto || lead.fecha_ingreso).getTime()) / MS_DIA)
  return Math.max(0, dias - plazo)
}

export function textoVencimiento(lead, plazo, ahora = new Date()) {
  if (lead.estado === 'archivo') return 'Archivado'
  const dias = diasVencido(lead, plazo, ahora)
  if (dias === null) return 'Vencido'
  if (dias === 0) return 'Venció hoy'
  return dias === 1 ? 'Venció hace 1 día' : `Venció hace ${dias} días`
}

// los que vencieron hace menos tiempo primero; los que no se pueden calcular, al final
export function ordenarArchivo(plazo, ahora = new Date()) {
  return (a, b) => (diasVencido(a, plazo, ahora) ?? 99999) - (diasVencido(b, plazo, ahora) ?? 99999)
}

export function claveInteres(lead) {
  return lead.interes || 'sin'
}
