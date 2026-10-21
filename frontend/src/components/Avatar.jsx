import { useState } from 'react'
import { iniciales } from '../lib/formato'

// Foto de una persona del equipo o, si no tiene (o no carga), sus iniciales.
// tamano: clases de ancho, alto y tamaño de letra (por ejemplo 'w-6 h-6 text-[9px]')
export default function Avatar({ nombre, foto, tamano = 'w-6 h-6 text-[9px]', className = '' }) {
  const [fallo, setFallo] = useState(null)
  const conFoto = !!foto && fallo !== foto

  return conFoto ? (
    <img
      src={foto}
      alt={nombre || ''}
      onError={() => setFallo(foto)}
      referrerPolicy="no-referrer"
      className={`${tamano} rounded-full object-cover shrink-0 bg-avatar-bg ${className}`}
    />
  ) : (
    <span
      className={`${tamano} rounded-full bg-avatar-bg text-avatar-text inline-flex items-center justify-center font-semibold shrink-0 ${className}`}
    >
      {iniciales(nombre) || '?'}
    </span>
  )
}
