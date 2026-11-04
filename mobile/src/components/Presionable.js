// Todo lo que se toca se achica un poco al apretarlo (0,97) y vuelve rápido: confirma que la app
// registró el toque. Animación corta y con ease-out, en el hilo nativo.
import { useRef } from 'react'
import { Animated, Easing, Pressable } from 'react-native'

const PressableAnimado = Animated.createAnimatedComponent(Pressable)

export default function Presionable({ style, children, escala = 0.97, disabled, ...props }) {
  const valor = useRef(new Animated.Value(1)).current
  const animar = (a) =>
    Animated.timing(valor, { toValue: a, duration: a === 1 ? 160 : 100, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start()
  return (
    <PressableAnimado
      {...props}
      disabled={disabled}
      onPressIn={(e) => {
        animar(escala)
        props.onPressIn?.(e)
      }}
      onPressOut={(e) => {
        animar(1)
        props.onPressOut?.(e)
      }}
      style={[style, { transform: [{ scale: valor }] }, disabled && { opacity: 0.5 }]}
    >
      {children}
    </PressableAnimado>
  )
}
