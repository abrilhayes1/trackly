import { View } from 'react-native'
import Texto from './Texto'
import { colorInteres, useTema } from '../lib/tema'
// las mismas etiquetas que la web
import { etiquetaInteres } from '../lib/compartido'

// etiqueta redondeada, como las de la web
export default function Pill({ texto, fondo, color, borde }) {
  return (
    <View
      style={{ backgroundColor: fondo, borderColor: borde, borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}
    >
      <Texto tamano={11} peso="media" color={color} numberOfLines={1}>
        {texto}
      </Texto>
    </View>
  )
}

export function PillInteres({ interes }) {
  const { c } = useTema()
  const [fondo, color, borde] = colorInteres(c, interes)
  return <Pill texto={etiquetaInteres[interes] || 'Sin categoría'} fondo={fondo} color={color} borde={borde} />
}
