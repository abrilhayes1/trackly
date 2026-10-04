export const MODALIDADES = [
  { valor: 'presencial', etiqueta: 'Presencial' },
  { valor: 'virtual', etiqueta: 'Virtual' },
  { valor: 'hibrida', etiqueta: 'Híbrida' },
]

export const DESCUENTOS = [0, 20, 30, 50, 70]

export function etiquetaDescuento(descuento) {
  return descuento === 0 ? 'Sin descuento' : `${descuento}%`
}

export function etiquetaModalidad(valor) {
  return MODALIDADES.find((m) => m.valor === valor)?.etiqueta ?? valor
}

// 15000 -> "15.000" ; 15000.5 -> "15.000,50"
export function formatearImporte(numero) {
  const [entera, decimales] = Number(numero).toFixed(2).split('.')
  const conPuntos = entera.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return decimales === '00' ? conPuntos : `${conPuntos},${decimales}`
}
