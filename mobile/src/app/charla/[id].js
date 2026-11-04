// Detalle de un evento: cuándo, dónde, quiénes fueron invitados y si asistieron. Cada uno invita a
// sus leads y marca su asistencia; el líder, a cualquiera, y además edita o borra el evento.
import { useCallback, useEffect, useState } from 'react'
import { Linking, ScrollView, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useTema } from '../../lib/tema'
import { useSesion } from '../../lib/sesion'
import { apiFetch } from '../../lib/api'
import { confirmar } from '../../lib/confirmar'
import { fechaCharla } from '../../lib/compartido'
import Texto from '../../components/Texto'
import Presionable from '../../components/Presionable'
import Encabezado from '../../components/Encabezado'
import Hoja from '../../components/Hoja'
import FormCharla from '../../components/FormCharla'
import Asistencia from '../../components/Asistencia'
import { Aviso, Boton, Campo } from '../../components/Formulario'

export default function Charla() {
  const { c } = useTema()
  const { id } = useLocalSearchParams()
  const { perfil, userId, leads, config, recordarLead } = useSesion()
  const esLider = perfil?.rol === 'lider'
  const termino = config?.termino_evento || 'Charla informativa'
  const [charla, setCharla] = useState(null)
  const [error, setError] = useState(null)
  const [hoja, setHoja] = useState(null) // 'invitar' | 'editar'
  const [busqueda, setBusqueda] = useState('')
  const [invitando, setInvitando] = useState(null)

  const cargar = useCallback(() => {
    apiFetch(`/api/charlas/${id}`)
      .then((x) => {
        setCharla(x)
        setError(null)
      })
      .catch((e) => setError(e.message))
  }, [id])
  useEffect(cargar, [cargar])

  if (!charla) {
    return (
      <View style={{ flex: 1, backgroundColor: c.fondo2 }}>
        <Encabezado titulo="" />
        <Aviso texto={error} style={{ marginHorizontal: 20 }} />
      </View>
    )
  }

  const invitados = charla.invitados || []
  const yaInvitados = new Set(invitados.map((i) => i.lead?.id))
  const texto = busqueda.trim().toLowerCase()
  const invitables = leads
    .filter((l) => l.estado === 'activo' && !yaInvitados.has(l.id) && (esLider || l.asesor_id === userId))
    .filter((l) => !texto || l.nombre.toLowerCase().includes(texto))
  const asistieron = invitados.filter((i) => i.asistio === true).length

  async function invitar(lead) {
    setInvitando(lead.id)
    try {
      await apiFetch(`/api/charlas/${charla.id}/invitados`, { method: 'POST', body: JSON.stringify({ leadId: lead.id }) })
      cargar()
    } catch (e) {
      setError(e.message)
    } finally {
      setInvitando(null)
    }
  }

  async function borrar() {
    if (!(await confirmar(`¿Borrar "${charla.nombre}"?`, 'Se borra también la lista de invitados.', 'Borrar'))) return
    try {
      await apiFetch(`/api/charlas/${charla.id}`, { method: 'DELETE' })
      router.back()
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.fondo2 }}>
      <Encabezado titulo={charla.nombre} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}>
        <View style={{ backgroundColor: c.fondo, borderColor: c.borde, borderWidth: 1, borderRadius: 14, padding: 14 }}>
          <Texto peso="semi" tamano={16} color={c.acento}>
            {fechaCharla(charla.fecha)}
          </Texto>
          {!!charla.carrera && (
            <Texto tamano={14} color={c.texto2} style={{ marginTop: 4 }}>
              {charla.carrera}
            </Texto>
          )}
          {!!charla.meet_link && (
            <Presionable onPress={() => Linking.openURL(charla.meet_link)} style={{ marginTop: 8 }}>
              <Texto peso="media" tamano={14} color={c.urgenteAzul} numberOfLines={1}>
                {charla.meet_link}
              </Texto>
            </Presionable>
          )}
          <Texto tamano={13} color={c.texto2} style={{ marginTop: 8 }}>
            {invitados.length} {invitados.length === 1 ? 'invitado' : 'invitados'} · {asistieron}{' '}
            {asistieron === 1 ? 'asistió' : 'asistieron'}
          </Texto>
          {esLider && (
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <Boton texto="Editar" tipo="secundario" onPress={() => setHoja('editar')} style={{ flex: 1 }} />
              <Boton texto="Borrar" tipo="secundario" onPress={borrar} style={{ flex: 1 }} />
            </View>
          )}
        </View>

        <Aviso texto={error} />
        <Boton texto="Invitar a un lead" onPress={() => setHoja('invitar')} style={{ marginTop: 14 }} />

        {invitados.map((inv) => {
          const puede = esLider || inv.lead?.asesor_id === userId
          return (
            <View
              key={inv.id}
              style={{ backgroundColor: c.fondo, borderColor: c.borde, borderWidth: 1, borderRadius: 14, padding: 14, marginTop: 8 }}
            >
              <Presionable
                disabled={!inv.lead}
                onPress={() => {
                  recordarLead(inv.lead)
                  router.push(`/lead/${inv.lead.id}`)
                }}
              >
                <Texto peso="semi" tamano={15}>
                  {inv.lead?.nombre || 'Contacto no disponible'}
                </Texto>
                <Texto tamano={12} color={c.texto3} style={{ marginTop: 2 }}>
                  Invitado por {inv.invitador?.nombre || 'alguien del equipo'}
                </Texto>
              </Presionable>
              <View style={{ marginTop: 10 }}>
                <Asistencia inv={inv} puede={puede} onCambio={cargar} />
              </View>
            </View>
          )
        })}
      </ScrollView>

      <Hoja visible={hoja === 'invitar'} onCerrar={() => setHoja(null)} titulo="Invitar" subtitulo={charla.nombre}>
        <Campo value={busqueda} onChangeText={setBusqueda} placeholder="Buscar por nombre" />
        {invitables.length === 0 && (
          <Texto tamano={14} color={c.texto3} style={{ marginTop: 14 }}>
            No quedan leads para invitar.
          </Texto>
        )}
        {invitables.slice(0, 40).map((l) => (
          <Presionable
            key={l.id}
            disabled={invitando === l.id}
            onPress={() => invitar(l)}
            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomColor: c.borde, borderBottomWidth: 1 }}
          >
            <Texto tamano={15} style={{ flex: 1 }}>
              {l.nombre}
            </Texto>
            <Texto peso="semi" tamano={14} color={c.acento}>
              {invitando === l.id ? '...' : 'Invitar'}
            </Texto>
          </Presionable>
        ))}
      </Hoja>

      <FormCharla
        visible={hoja === 'editar'}
        inicial={charla}
        termino={termino}
        onCerrar={() => setHoja(null)}
        onGuardado={() => cargar()}
      />
    </View>
  )
}
