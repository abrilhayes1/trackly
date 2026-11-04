// Las tres pestañas de abajo: Mis leads, Alertas (con cuántas hay hoy) y Perfil
import { Tabs } from 'expo-router/js-tabs'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LETRA, useTema } from '../../lib/tema'
import { useSesion } from '../../lib/sesion'
import { lodeHoy } from '../../lib/hoy'
import Icono from '../../components/Icono'

export default function Pestanas() {
  const { c } = useTema()
  const abajo = useSafeAreaInsets().bottom
  const { leads, agenda, config, userId } = useSesion()
  const { total } = lodeHoy({ leads, agenda, config, userId })

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.acento,
        tabBarInactiveTintColor: c.texto2,
        tabBarStyle: { backgroundColor: c.fondo, borderTopColor: c.borde, height: 70 + abajo, paddingTop: 8, paddingBottom: abajo + 12 },
        tabBarLabelStyle: { fontFamily: LETRA.media, fontSize: 12, lineHeight: 16 },
        sceneStyle: { backgroundColor: c.fondo2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Mis leads', tabBarIcon: ({ color }) => <Icono nombre="leads" color={color} tamano={22} /> }}
      />
      <Tabs.Screen
        name="alertas"
        options={{
          title: 'Alertas',
          tabBarIcon: ({ color }) => <Icono nombre="campana" color={color} tamano={22} />,
          tabBarBadge: total > 0 ? total : undefined,
          tabBarBadgeStyle: { backgroundColor: c.puntoRojo, fontFamily: LETRA.semi, fontSize: 11 },
        }}
      />
      <Tabs.Screen
        name="agenda"
        options={{ title: 'Agenda', tabBarIcon: ({ color }) => <Icono nombre="calendario" color={color} tamano={22} /> }}
      />
      <Tabs.Screen name="mas" options={{ title: 'Más', tabBarIcon: ({ color }) => <Icono nombre="menu" color={color} tamano={22} /> }} />
    </Tabs>
  )
}
