// Un lead en una lista: punto de color según su grupo, nombre, consulta, días e interés
import { View } from 'react-native'
import { router } from 'expo-router'
import { useTema } from '../lib/tema'
import { useSesion } from '../lib/sesion'
import Texto from './Texto'
import Presionable from './Presionable'
import { PillInteres } from './Pill'

export default function FilaLead({ lead, punto, colorDias }) {
  const { c } = useTema()
  const { recordarLead } = useSesion()
  const dias = lead.corridos === 0 ? 'hoy' : lead.dias !== undefined ? `${lead.dias}d` : null
  return (
    <Presionable
      escala={0.98}
      onPress={() => {
        recordarLead(lead)
        router.push(`/lead/${lead.id}`)
      }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: c.fondo,
        borderColor: c.borde,
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginBottom: 8,
      }}
    >
      {punto && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: punto }} />}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Texto peso="semi" tamano={15} numberOfLines={1}>
          {lead.nombre}
        </Texto>
        <Texto tamano={13} color={c.texto2} numberOfLines={1} style={{ marginTop: 2 }}>
          {lead.consulta || lead.origen || 'Sin consulta registrada'}
        </Texto>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 6, maxWidth: 130 }}>
        {dias && (
          <Texto peso="semi" tamano={13} color={colorDias || c.texto2}>
            {dias}
          </Texto>
        )}
        <PillInteres interes={lead.interes} />
      </View>
    </Presionable>
  )
}
