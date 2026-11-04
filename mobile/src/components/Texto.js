// Texto con la letra de la app (Inter) y los colores del tema
import { Text } from 'react-native'
import { LETRA, useTema } from '../lib/tema'

export default function Texto({ peso = 'normal', tamano = 14, color, style, ...props }) {
  const { c } = useTema()
  return <Text {...props} style={[{ fontFamily: LETRA[peso], fontSize: tamano, color: color || c.texto }, style]} />
}
