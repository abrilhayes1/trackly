// Íconos de línea (mismo trazo que los de la web)
import Svg, { Circle, Path, Rect } from 'react-native-svg'

const TRAZOS = {
  buscar: (
    <>
      <Circle cx="11" cy="11" r="7" />
      <Path d="M20 20l-3.5-3.5" />
    </>
  ),
  leads: (
    <>
      <Rect x="3" y="3" width="7" height="7" rx="1.5" />
      <Rect x="14" y="3" width="7" height="7" rx="1.5" />
      <Rect x="3" y="14" width="7" height="7" rx="1.5" />
      <Rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  campana: (
    <>
      <Path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9" />
      <Path d="M10.3 21a1.94 1.94 0 003.4 0" />
    </>
  ),
  persona: (
    <>
      <Circle cx="12" cy="8" r="4" />
      <Path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
    </>
  ),
  telefono: (
    <Path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1.9.4 1.8.7 2.7a2 2 0 01-.5 2.1L8 9.8a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.4c.9.3 1.8.6 2.7.7a2 2 0 011.7 2z" />
  ),
  whatsapp: <Path d="M3 21l1.7-5A8.5 8.5 0 1112 20.5a8.4 8.4 0 01-4-1z" />,
  email: (
    <>
      <Rect x="3" y="5" width="18" height="14" rx="2" />
      <Path d="M3 7l9 6 9-6" />
    </>
  ),
  atras: <Path d="M15 18l-6-6 6-6" />,
  estrella: <Path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z" />,
  check: <Path d="M5 12.5l4.5 4.5L19 7.5" />,
  mas: <Path d="M12 5v14M5 12h14" />,
  ojo: (
    <>
      <Path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <Circle cx="12" cy="12" r="3" />
    </>
  ),
  ojoTachado: (
    <>
      <Path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <Circle cx="12" cy="12" r="3" />
      <Path d="M3 3l18 18" />
    </>
  ),
  tendencia: <Path d="M3 17l6-6 4 4 8-8M15 7h6v6" />,
  cerrar: <Path d="M6 6l12 12M18 6L6 18" />,
  calendario: (
    <>
      <Rect x="3" y="4.5" width="18" height="16.5" rx="2" />
      <Path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
    </>
  ),
  menu: <Path d="M4 7h16M4 12h16M4 17h16" />,
  archivo: (
    <>
      <Rect x="3" y="4" width="18" height="5" rx="1" />
      <Path d="M5 9v10a1 1 0 001 1h12a1 1 0 001-1V9M10 13h4" />
    </>
  ),
  ganado: (
    <>
      <Circle cx="12" cy="12" r="9" />
      <Path d="M8 12.5l2.8 2.8L16.5 9.5" />
    </>
  ),
  perdido: (
    <>
      <Circle cx="12" cy="12" r="9" />
      <Path d="M9 9l6 6M15 9l-6 6" />
    </>
  ),
  charla: (
    <>
      <Path d="M21 12a8 8 0 01-11.6 7.1L4 20.5l1.4-4.6A8 8 0 1121 12z" />
    </>
  ),
  equipo: (
    <>
      <Circle cx="9" cy="8" r="3.5" />
      <Path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
      <Path d="M16 4.6a3.5 3.5 0 010 6.8M18 14.3c2.1.7 3.5 2.8 3.5 5.7" />
    </>
  ),
  ajustes: (
    <>
      <Circle cx="12" cy="12" r="3" />
      <Path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" />
    </>
  ),
  derecha: <Path d="M9 6l6 6-6 6" />,
}

export default function Icono({ nombre, tamano = 20, color, relleno = 'none', grosor = 2 }) {
  return (
    <Svg
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill={relleno}
      stroke={color}
      strokeWidth={grosor}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {TRAZOS[nombre]}
    </Svg>
  )
}
