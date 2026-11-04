// Preferencias de esta persona en el celular (como las de la web, que se guardan en el navegador)
import AsyncStorage from '@react-native-async-storage/async-storage'

// botones para programar el próximo contacto (días) y si quedan a una hora fija ("HH:MM") o a la misma hora
export const PREFERENCIAS_INICIALES = { proximosDias: [1, 3, 7], horaRecordatorios: null, tema: 'sistema' }

export async function leerPreferencias() {
  try {
    const guardadas = JSON.parse((await AsyncStorage.getItem('trackly-preferencias')) || '{}')
    return { ...PREFERENCIAS_INICIALES, ...guardadas }
  } catch {
    return PREFERENCIAS_INICIALES
  }
}

export async function guardarPreferencias(preferencias) {
  try {
    await AsyncStorage.setItem('trackly-preferencias', JSON.stringify(preferencias))
  } catch {
    // si no se puede guardar, sigue funcionando con lo elegido hasta cerrar la app
  }
}
