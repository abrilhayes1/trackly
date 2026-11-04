// Recordatorio de la agenda (como en la Agenda de la web): con quién, día, hora y una nota
import { useState } from 'react'
import { View } from 'react-native'
import { useSesion } from '../lib/sesion'
import { apiFetch } from '../lib/api'
import { fechaLocal } from '../lib/compartido'
import Hoja from './Hoja'
import ElegirFechaHora, { HORA_VALIDA } from './ElegirFechaHora'
import { Aviso, Boton, Campo, Etiqueta } from './Formulario'

export default function NuevoRecordatorio({ visible, onCerrar }) {
  const { recargar } = useSesion()
  const [contacto, setContacto] = useState('')
  const [nota, setNota] = useState('')
  const [fecha, setFecha] = useState(fechaLocal())
  const [hora, setHora] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  async function guardar(cerrar) {
    setError(null)
    if (!contacto.trim()) return setError('Indicá con quién es.')
    if (!HORA_VALIDA.test(hora)) return setError('Elegí la hora (por ejemplo 17:30).')
    setGuardando(true)
    try {
      await apiFetch('/api/recordatorios', {
        method: 'POST',
        body: JSON.stringify({ contacto: contacto.trim(), nota: nota.trim(), fecha, hora: hora.padStart(5, '0') }),
      })
      await recargar()
      setContacto('')
      setNota('')
      setHora('')
      cerrar()
    } catch (e) {
      setError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Hoja
      visible={visible}
      onCerrar={onCerrar}
      titulo="Recordatorio nuevo"
      pie={(cerrar) => (
        <Boton texto={guardando ? 'Guardando...' : 'Guardar recordatorio'} disabled={guardando} onPress={() => guardar(cerrar)} />
      )}
    >
      <Etiqueta>Con quién *</Etiqueta>
      <Campo value={contacto} onChangeText={setContacto} placeholder="Nombre, teléfono o usuario" autoFocus maxLength={120} />
      <Etiqueta style={{ marginTop: 14 }}>Nota</Etiqueta>
      <Campo value={nota} onChangeText={setNota} placeholder="Ej: llamar después de las 18" maxLength={200} />
      <View style={{ marginTop: 14 }}>
        <ElegirFechaHora fecha={fecha} hora={hora} onFecha={setFecha} onHora={setHora} />
      </View>
      <Aviso texto={error} />
    </Hoja>
  )
}
