// Raíz de la app: letra Inter, tema claro u oscuro (sigue al celular), sesión y navegación.
// Sin sesión solo se puede ver el login; con sesión, las pestañas y la tarjeta de cada lead.
import { useEffect } from 'react'
import { useColorScheme, View, ActivityIndicator } from 'react-native'
import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { StatusBar } from 'expo-status-bar'
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { CLARO, OSCURO, TemaContext } from '../lib/tema'
import { SesionProvider, useSesion } from '../lib/sesion'

SplashScreen.preventAutoHideAsync()

function Navegacion() {
  const { sesion } = useSesion()
  const tema = useColorScheme() === 'dark' ? OSCURO : CLARO
  const listo = sesion !== undefined

  useEffect(() => {
    if (listo) SplashScreen.hideAsync()
  }, [listo])

  if (!listo) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: tema.fondo2 }}>
        <ActivityIndicator color={tema.acento} />
      </View>
    )
  }
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: tema.fondo2 } }}>
      <Stack.Protected guard={!sesion}>
        <Stack.Screen name="login" />
      </Stack.Protected>
      <Stack.Protected guard={!!sesion}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="lead/[id]" />
        <Stack.Screen name="perfil" />
        <Stack.Screen name="archivo" />
        <Stack.Screen name="cerrados/[tipo]" />
      </Stack.Protected>
    </Stack>
  )
}

export default function Raiz() {
  const oscuro = useColorScheme() === 'dark'
  const [letras] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold })
  if (!letras) return null
  return (
    <SafeAreaProvider>
      <TemaContext.Provider value={{ c: oscuro ? OSCURO : CLARO, oscuro }}>
        <SesionProvider>
          <StatusBar style={oscuro ? 'light' : 'dark'} />
          <Navegacion />
        </SesionProvider>
      </TemaContext.Provider>
    </SafeAreaProvider>
  )
}
