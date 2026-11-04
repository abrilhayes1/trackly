import { Image, View } from 'react-native'
import { useTema } from '../lib/tema'
import { iniciales } from '../lib/compartido'
import Texto from './Texto'

// foto de la persona o sus iniciales, como en la web
export default function Avatar({ nombre, foto, tamano = 44 }) {
  const { c } = useTema()
  if (foto) return <Image source={{ uri: foto }} style={{ width: tamano, height: tamano, borderRadius: tamano / 2 }} />
  return (
    <View
      style={{
        width: tamano,
        height: tamano,
        borderRadius: tamano / 2,
        backgroundColor: c.avatarFondo,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Texto peso="semi" tamano={tamano * 0.36} color={c.avatarTexto}>
        {iniciales(nombre || '')}
      </Texto>
    </View>
  )
}
