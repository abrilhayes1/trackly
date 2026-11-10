// Logo de Trackly: en modo claro las letras van en azul oscuro y en modo oscuro en violeta (con el
// ícono un poco más luminoso). Están las dos imágenes y index.css muestra la que corresponde al tema.
export default function Logo({ alto = 'h-7', className = '' }) {
  return (
    <span className={`inline-flex ${className}`}>
      <img src="/logos/trackly-logo.png" alt="Trackly" className={`logo-modo-claro ${alto} w-auto`} />
      <img src="/logos/trackly-logo-oscuro.png" alt="Trackly" className={`logo-modo-oscuro ${alto} w-auto`} />
    </span>
  )
}
