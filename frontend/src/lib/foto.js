// Achica la foto en el navegador antes de subirla: la recorta cuadrada (al centro) y la deja en
// LADO x LADO px como JPG. Una foto de 5 MB del celular queda en unos 20 a 40 KB.
const LADO = 256
const MAX_ORIGINAL = 15 * 1024 * 1024

export async function achicarFoto(archivo) {
  if (!archivo?.type?.startsWith('image/')) throw new Error('Elegí una imagen (JPG, PNG o WEBP)')
  if (archivo.size > MAX_ORIGINAL) throw new Error('La imagen es demasiado grande (máximo 15 MB)')

  let imagen
  try {
    imagen = await createImageBitmap(archivo)
  } catch {
    throw new Error('No se pudo leer la imagen. Probá con un JPG o PNG.')
  }

  const lado = Math.min(imagen.width, imagen.height)
  const lienzo = document.createElement('canvas')
  lienzo.width = LADO
  lienzo.height = LADO
  const ctx = lienzo.getContext('2d')
  // fondo blanco por si la imagen tiene partes transparentes (el JPG no las soporta)
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, LADO, LADO)
  ctx.drawImage(imagen, (imagen.width - lado) / 2, (imagen.height - lado) / 2, lado, lado, 0, 0, LADO, LADO)
  imagen.close?.()

  const blob = await new Promise((listo) => lienzo.toBlob(listo, 'image/jpeg', 0.85))
  if (!blob) throw new Error('No se pudo preparar la imagen')
  return blob
}
