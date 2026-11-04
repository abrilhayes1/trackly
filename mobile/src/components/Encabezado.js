// Encabezado de las pantallas que se abren desde "Más": volver, título y una acción opcional
import { View } from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTema } from '../lib/tema'
import Texto from './Texto'
import Presionable from './Presionable'
import Icono from './Icono'

export default function Encabezado({ titulo, accion }) {
  const { c } = useTema()
  const top = useSafeAreaInsets().top
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: top + 8,
        paddingHorizontal: 12,
        paddingBottom: 8,
        backgroundColor: c.fondo2,
      }}
    >
      <Presionable
        onPress={() => router.back()}
        accessibilityLabel="Volver"
        style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
      >
        <Icono nombre="atras" color={c.texto} tamano={22} />
      </Presionable>
      <Texto peso="semi" tamano={18} style={{ flex: 1 }} numberOfLines={1}>
        {titulo}
      </Texto>
      {accion}
    </View>
  )
}
