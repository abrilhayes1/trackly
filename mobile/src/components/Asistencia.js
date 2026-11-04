// Asistió / No asistió de un invitado a un evento (tocar de nuevo lo deja sin marcar)
import { useState } from 'react'
import { View } from 'react-native'
import { useTema } from '../lib/tema'
import { apiFetch } from '../lib/api'
import { Chip } from './Formulario'

export default function Asistencia({ inv, puede, onCambio }) {
  const { c } = useTema()
  const [ocupado, setOcupado] = useState(false)
  async function marcar(valor) {
    setOcupado(true)
    try {
      await apiFetch(`/api/charlas/invitados/${inv.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ asistio: inv.asistio === valor ? null : valor }),
      })
      onCambio()
    } finally {
      setOcupado(false)
    }
  }
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      <Chip
        texto="Asistió"
        elegido={inv.asistio === true}
        disabled={!puede || ocupado}
        colores={[c.verdeFondo, c.verdeTexto, c.verdeBorde]}
        onPress={() => marcar(true)}
      />
      <Chip
        texto="No asistió"
        elegido={inv.asistio === false}
        disabled={!puede || ocupado}
        colores={[c.rojoFondo, c.rojoTexto, c.rojoBorde]}
        onPress={() => marcar(false)}
      />
    </View>
  )
}
