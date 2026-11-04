// Elegir día (los próximos 14, en chips) y hora (HH:MM). Igual en Android, iPhone y la versión web.
import { ScrollView, View } from 'react-native'
import { useTema } from '../lib/tema'
import { fechaLocal } from '../lib/compartido'
import { Campo, Chip, Etiqueta } from './Formulario'

const DIAS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']

export const HORA_VALIDA = /^([01]?\d|2[0-3]):[0-5]\d$/

export function etiquetaDia(i, d) {
  if (i === 0) return 'Hoy'
  if (i === 1) return 'Mañana'
  return `${DIAS[d.getDay()]} ${d.getDate()}`
}

// fecha: "AAAA-MM-DD"; hora: "HH:MM"
export default function ElegirFechaHora({ fecha, hora, onFecha, onHora }) {
  const { c } = useTema()
  const hoy = new Date()
  const dias = Array.from({ length: 14 }, (_, i) => new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + i))
  return (
    <View>
      <Etiqueta>Día</Etiqueta>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -20 }}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
      >
        {dias.map((d, i) => (
          <Chip key={i} texto={etiquetaDia(i, d)} elegido={fecha === fechaLocal(d)} onPress={() => onFecha(fechaLocal(d))} />
        ))}
      </ScrollView>
      <Etiqueta style={{ marginTop: 16 }}>Hora</Etiqueta>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
        <Campo
          value={hora}
          onChangeText={onHora}
          placeholder="17:30"
          keyboardType="numbers-and-punctuation"
          maxLength={5}
          style={{ width: 110, textAlign: 'center' }}
        />
        {['09:00', '12:00', '17:00'].map((h) => (
          <Chip key={h} texto={h} elegido={hora === h} onPress={() => onHora(h)} />
        ))}
      </View>
      {!!hora && !HORA_VALIDA.test(hora) && <Etiqueta style={{ color: c.rojoTexto, marginTop: 6 }}>Escribí la hora así: 17:30</Etiqueta>}
    </View>
  )
}
