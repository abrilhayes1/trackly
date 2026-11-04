// Perfil: quién sos, en qué equipo y cerrar sesión. (Las preferencias y la contraseña se suman
// en la próxima etapa.)
import { ScrollView, View } from 'react-native'
import { useTema } from '../lib/tema'
import { useSesion } from '../lib/sesion'
import Texto from '../components/Texto'
import Presionable from '../components/Presionable'
import Avatar from '../components/Avatar'
import Encabezado from '../components/Encabezado'

export default function Perfil() {
  const { c } = useTema()
  const { perfil, sesion, cerrarSesion } = useSesion()
  const fila = (titulo, valor) => (
    <View style={{ paddingVertical: 12, borderBottomColor: c.borde, borderBottomWidth: 1 }}>
      <Texto tamano={12} color={c.texto3}>
        {titulo}
      </Texto>
      <Texto tamano={15} style={{ marginTop: 2 }}>
        {valor}
      </Texto>
    </View>
  )
  return (
    <View style={{ flex: 1, backgroundColor: c.fondo2 }}>
      <Encabezado titulo="Mi perfil" />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, paddingTop: 8 }}>
        <View style={{ backgroundColor: c.fondo, borderColor: c.borde, borderWidth: 1, borderRadius: 16, padding: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 6 }}>
            <Avatar nombre={perfil?.nombre} foto={perfil?.avatar_url} tamano={56} />
            <View style={{ flex: 1 }}>
              <Texto peso="semi" tamano={18}>
                {perfil?.nombre}
              </Texto>
              <Texto tamano={13} color={c.texto2}>
                {perfil?.rol === 'lider' ? 'Líder de equipo' : 'Asesor comercial'}
              </Texto>
            </View>
          </View>
          {fila('Equipo', perfil?.tenants?.nombre || '—')}
          {fila('Email', sesion?.user?.email)}
        </View>
        <Presionable
          onPress={cerrarSesion}
          style={{
            marginTop: 20,
            height: 50,
            borderRadius: 12,
            borderColor: c.borde2,
            borderWidth: 1,
            backgroundColor: c.fondo,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Texto peso="semi" tamano={15} color={c.urgenteRojo}>
            Cerrar sesión
          </Texto>
        </Presionable>
      </ScrollView>
    </View>
  )
}
