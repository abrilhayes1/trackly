// Cargar un lead nuevo (como el "+" de la web): nombre y teléfono obligatorios; el origen se elige
// entre las categorías del equipo o se escribe. Si el teléfono o el email ya los tiene otro
// contacto del equipo, la base lo frena y avisa con quién coincide.
import { useState } from 'react'
import { View } from 'react-native'
import { router } from 'expo-router'
import { useSesion } from '../lib/sesion'
import { apiFetch } from '../lib/api'
import Hoja from './Hoja'
import { Aviso, Boton, Campo, Chip, Etiqueta } from './Formulario'

export default function NuevoLead({ visible, onCerrar }) {
  const { config, agregarLead, recordarLead } = useSesion()
  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [origen, setOrigen] = useState('')
  const [consulta, setConsulta] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)
  const categorias = config?.categorias_origen || []

  async function guardar(cerrar) {
    setError(null)
    if (!nombre.trim()) return setError('Ingresá un nombre.')
    if (!telefono.trim()) return setError('Ingresá un teléfono.')
    setGuardando(true)
    try {
      const lead = await apiFetch('/api/leads', {
        method: 'POST',
        body: JSON.stringify({
          nombre: nombre.trim(),
          telefono: telefono.trim(),
          email: email.trim() || null,
          origen: origen.trim() || null,
          consulta: consulta.trim() || null,
        }),
      })
      agregarLead(lead)
      recordarLead(lead)
      setNombre('')
      setTelefono('')
      setEmail('')
      setOrigen('')
      setConsulta('')
      cerrar()
      router.push(`/lead/${lead.id}`)
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
      titulo="Lead nuevo"
      pie={(cerrar) => <Boton texto={guardando ? 'Guardando...' : 'Guardar lead'} disabled={guardando} onPress={() => guardar(cerrar)} />}
    >
      <Etiqueta>Nombre *</Etiqueta>
      <Campo value={nombre} onChangeText={setNombre} placeholder="Nombre y apellido" autoFocus />
      <Etiqueta style={{ marginTop: 14 }}>Teléfono *</Etiqueta>
      <Campo value={telefono} onChangeText={setTelefono} placeholder="11 4448 7720" keyboardType="phone-pad" />
      <Etiqueta style={{ marginTop: 14 }}>Email</Etiqueta>
      <Campo
        value={email}
        onChangeText={setEmail}
        placeholder="contacto@email.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Etiqueta style={{ marginTop: 14 }}>Origen</Etiqueta>
      {categorias.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
          {categorias.map((cat) => (
            <Chip key={cat} texto={cat} elegido={origen === cat} onPress={() => setOrigen(origen === cat ? '' : cat)} />
          ))}
        </View>
      )}
      <Campo value={origen} onChangeText={setOrigen} placeholder={categorias.length ? 'U otro origen' : 'Ej: Instagram'} />
      <Etiqueta style={{ marginTop: 14 }}>Consulta</Etiqueta>
      <Campo multiline value={consulta} onChangeText={setConsulta} placeholder="Qué preguntó o qué le interesa" />
      <Aviso texto={error} />
    </Hoja>
  )
}
