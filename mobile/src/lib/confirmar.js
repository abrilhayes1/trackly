import { Alert, Platform } from 'react-native'

// pregunta antes de algo que no se deshace fácil ("¿Quitar este email?"); devuelve true si acepta
export function confirmar(titulo, mensaje, textoSi = 'Sí') {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(mensaje ? `${titulo}\n\n${mensaje}` : titulo))
  return new Promise((resolver) =>
    Alert.alert(titulo, mensaje, [
      { text: 'Cancelar', style: 'cancel', onPress: () => resolver(false) },
      { text: textoSi, onPress: () => resolver(true) },
    ]),
  )
}
