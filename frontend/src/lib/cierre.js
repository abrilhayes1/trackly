// Campos de cierre ganado configurables por el equipo (RF06).
// Cada campo: { id, nombre, tipo: 'texto' | 'numero' | 'lista', obligatorio, opciones? }

export const TIPOS_CAMPO = [
  { valor: 'texto', etiqueta: 'Texto' },
  { valor: 'numero', etiqueta: 'Número' },
  { valor: 'lista', etiqueta: 'Lista de opciones' },
]

// 15000 -> "15.000" ; 15000.5 -> "15.000,5"
export function formatearNumero(numero) {
  return Number(numero).toLocaleString('es-AR', { maximumFractionDigits: 2 })
}

function texto(campo, valor) {
  return campo?.tipo === 'numero' ? formatearNumero(valor) : String(valor)
}

// Los valores de un cierre, en el orden de los campos del equipo: [{ id, nombre, tipo, texto }].
// Si después el líder borró un campo, su valor se sigue mostrando (sin nombre).
export function detalleCierre(campos, datos) {
  const lista = []
  const usados = new Set()
  ;(campos || []).forEach((c) => {
    usados.add(c.id)
    const valor = datos?.[c.id]
    if (valor === undefined || valor === null || valor === '') return
    lista.push({ id: c.id, nombre: c.nombre, tipo: c.tipo, texto: texto(c, valor) })
  })
  Object.entries(datos || {}).forEach(([id, valor]) => {
    if (!usados.has(id) && valor !== null && valor !== '') lista.push({ id, nombre: null, tipo: null, texto: String(valor) })
  })
  return lista
}

// identificador para un campo nuevo (lo que se guarda en cada cierre)
export function nuevoIdCampo() {
  return 'c' + Math.random().toString(36).slice(2, 8)
}

// motivo de pérdida para agrupar: sin espacios de más y con mayúscula inicial ("precio" = "Precio")
export function etiquetaMotivo(motivo) {
  const m = String(motivo || '')
    .trim()
    .replace(/\s+/g, ' ')
  return m ? m.charAt(0).toUpperCase() + m.slice(1) : 'Sin motivo'
}
