// Hoja que sube desde abajo (Actualizar estado, nota, lead nuevo, recordatorio...). El fondo se
// oscurece con un fundido y la hoja entra con la curva de cajón de iOS (pautas de diseño); se cierra
// tocando afuera, con "Cancelar" o deslizándola hacia abajo (alcanza con un movimiento rápido).
import { useEffect, useRef } from 'react'
import { Animated, Easing, KeyboardAvoidingView, Modal, PanResponder, Platform, Pressable, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTema } from '../lib/tema'
import Texto from './Texto'

const CAJON = Easing.bezier(0.32, 0.72, 0, 1)

export default function Hoja({ visible, onCerrar, titulo, subtitulo, children, pie }) {
  const { c } = useTema()
  const abajo = useSafeAreaInsets().bottom
  const fondo = useRef(new Animated.Value(0)).current
  const y = useRef(new Animated.Value(600)).current

  useEffect(() => {
    if (!visible) return
    y.setValue(600)
    Animated.parallel([
      Animated.timing(fondo, { toValue: 1, duration: 200, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(y, { toValue: 0, duration: 320, easing: CAJON, useNativeDriver: true }),
    ]).start()
  }, [visible, fondo, y])

  const cerrar = () => {
    Animated.parallel([
      Animated.timing(fondo, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(y, { toValue: 600, duration: 180, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]).start(() => onCerrar())
  }

  // arrastrar la manija: hacia abajo sigue el dedo; hacia arriba frena (con roce, no con un tope)
  const arrastre = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 4,
      onPanResponderMove: (_e, g) => y.setValue(g.dy > 0 ? g.dy : g.dy / 6),
      onPanResponderRelease: (_e, g) => {
        if (g.dy > 120 || g.vy > 0.5) cerrar()
        else Animated.spring(y, { toValue: 0, bounciness: 0, speed: 20, useNativeDriver: true }).start()
      },
    }),
  ).current

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={cerrar} statusBarTranslucent>
      <Animated.View style={{ flex: 1, backgroundColor: c.overlay, opacity: fondo }}>
        <Pressable style={{ flex: 1 }} onPress={cerrar} accessibilityLabel="Cerrar" />
      </Animated.View>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '92%' }}
      >
        <Animated.View
          style={{
            backgroundColor: c.fondo,
            borderTopLeftRadius: 22,
            borderTopRightRadius: 22,
            paddingBottom: abajo + 12,
            transform: [{ translateY: y }],
          }}
        >
          <View {...arrastre.panHandlers} style={{ paddingTop: 10, paddingBottom: 6, paddingHorizontal: 20 }}>
            <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: c.borde2, marginBottom: 14 }} />
            {titulo && (
              <Texto peso="negrita" tamano={20} style={{ letterSpacing: -0.3 }}>
                {titulo}
              </Texto>
            )}
            {subtitulo && (
              <Texto tamano={14} color={c.texto2} style={{ marginTop: 3 }}>
                {subtitulo}
              </Texto>
            )}
          </View>
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 8 }}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
          {pie && <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>{pie(cerrar)}</View>}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  )
}
