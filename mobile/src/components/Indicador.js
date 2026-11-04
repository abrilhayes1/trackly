// Número con su etiqueta; si se puede tocar, filtra lo de abajo (queda marcado mientras filtra)
import { View } from 'react-native'
import { useTema } from '../lib/tema'
import Texto from './Texto'
import Presionable from './Presionable'

export default function Indicador({ titulo, valor, color, activo, onPress }) {
  const { c } = useTema()
  const contenido = (
    <>
      <Texto tamano={12} color={c.texto2} numberOfLines={1}>
        {titulo}
      </Texto>
      <Texto peso="negrita" tamano={24} color={color || c.texto} style={{ marginTop: 4 }}>
        {valor}
      </Texto>
    </>
  )
  const estilo = {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: c.fondo,
    borderColor: activo ? c.acento : c.borde,
    borderWidth: activo ? 2 : 1,
    borderRadius: 14,
    padding: 12,
  }
  if (!onPress) return <View style={estilo}>{contenido}</View>
  return (
    <Presionable onPress={onPress} accessibilityState={{ selected: !!activo }} style={estilo}>
      {contenido}
    </Presionable>
  )
}
