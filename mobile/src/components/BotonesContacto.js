// Llamar y WhatsApp (y Email en la tarjeta): abren la app del celular con el número del lead
import { Linking, View } from 'react-native'
import { useTema } from '../lib/tema'
import { enlaceWhatsApp, numeroWhatsApp } from '../lib/compartido'
import Texto from './Texto'
import Presionable from './Presionable'
import Icono from './Icono'

export default function BotonesContacto({ lead, conEmail = false, alto = 44 }) {
  const { c, oscuro } = useTema()
  const wa = numeroWhatsApp(lead.telefono)
  const boton = { flex: 1, height: alto, borderRadius: 12, alignItems: 'center', justifyContent: 'center', gap: 4 }
  const enColumna = conEmail
  const contenido = (icono, texto, color) => (
    <View style={{ flexDirection: enColumna ? 'column' : 'row', alignItems: 'center', gap: enColumna ? 4 : 8 }}>
      <Icono nombre={icono} tamano={18} color={color} />
      <Texto peso="semi" tamano={14} color={color}>
        {texto}
      </Texto>
    </View>
  )
  const llamarFondo = oscuro ? c.texto : '#1f1f1d'
  const llamarTexto = oscuro ? c.fondo : '#ffffff'
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <Presionable
        disabled={!lead.telefono}
        onPress={() => Linking.openURL(`tel:${lead.telefono.replace(/[^\d+]/g, '')}`)}
        style={[boton, { backgroundColor: llamarFondo }]}
      >
        {contenido('telefono', 'Llamar', llamarTexto)}
      </Presionable>
      <Presionable
        disabled={!wa}
        onPress={() => Linking.openURL(enlaceWhatsApp(wa, ''))}
        style={[boton, { backgroundColor: c.verdeFondo, borderColor: c.verdeBorde, borderWidth: 1 }]}
      >
        {contenido('whatsapp', 'WhatsApp', c.verdeTexto)}
      </Presionable>
      {conEmail && (
        <Presionable
          disabled={!lead.email}
          onPress={() => Linking.openURL(`mailto:${lead.email}`)}
          style={[boton, { backgroundColor: c.fondo, borderColor: c.borde2, borderWidth: 1 }]}
        >
          {contenido('email', 'Email', c.texto)}
        </Presionable>
      )}
    </View>
  )
}
