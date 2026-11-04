// Charlas / eventos (RF29 a RF34): las próximas y las que ya pasaron, con cuántos invitados y
// cuántos asistieron. El líder las crea; todos invitan a sus leads desde el detalle o la tarjeta.
import { useCallback, useEffect, useState } from 'react'
import { RefreshControl, ScrollView, View } from 'react-native'
import { router } from 'expo-router'
import { useTema } from '../lib/tema'
import { useSesion } from '../lib/sesion'
import { apiFetch } from '../lib/api'
import { fechaCharla, nombreEventos } from '../lib/compartido'
import Texto from '../components/Texto'
import Presionable from '../components/Presionable'
import Encabezado from '../components/Encabezado'
import Icono from '../components/Icono'
import FormCharla from '../components/FormCharla'
import { Aviso } from '../components/Formulario'

export default function Charlas() {
  const { c } = useTema()
  const { perfil, config } = useSesion()
  const esLider = perfil?.rol === 'lider'
  const termino = config?.termino_evento || 'Charla informativa'
  const [charlas, setCharlas] = useState(null)
  const [error, setError] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [creando, setCreando] = useState(false)

  const cargar = useCallback(() => {
    setCargando(true)
    apiFetch('/api/charlas')
      .then((x) => {
        setCharlas(x)
        setError(null)
      })
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false))
  }, [])
  useEffect(cargar, [cargar])

  // con 3 horas de margen: una que está ocurriendo sigue entre las próximas (como en la web)
  const corte = Date.now() - 3 * 3600e3
  const proximas = (charlas || []).filter((x) => new Date(x.fecha).getTime() >= corte)
  const pasadas = (charlas || []).filter((x) => new Date(x.fecha).getTime() < corte).reverse()

  const tarjeta = (x, pasada) => (
    <Presionable
      key={x.id}
      escala={0.98}
      onPress={() => router.push(`/charla/${x.id}`)}
      style={{
        backgroundColor: c.fondo,
        borderColor: c.borde,
        borderWidth: 1,
        borderRadius: 14,
        padding: 14,
        marginTop: 8,
        opacity: pasada ? 0.85 : 1,
      }}
    >
      <Texto peso="semi" tamano={16}>
        {x.nombre}
      </Texto>
      <Texto tamano={13} color={pasada ? c.texto3 : c.acento} style={{ marginTop: 3 }}>
        {fechaCharla(x.fecha)}
        {x.carrera ? ` · ${x.carrera}` : ''}
      </Texto>
      <Texto tamano={13} color={c.texto2} style={{ marginTop: 6 }}>
        {x.invitados} {x.invitados === 1 ? 'invitado' : 'invitados'}
        {pasada ? ` · ${x.asistieron} ${x.asistieron === 1 ? 'asistió' : 'asistieron'}` : ''}
      </Texto>
    </Presionable>
  )

  return (
    <View style={{ flex: 1, backgroundColor: c.fondo2 }}>
      <Encabezado
        titulo={nombreEventos(termino)}
        accion={
          esLider && (
            <Presionable
              onPress={() => setCreando(true)}
              accessibilityLabel="Crear"
              style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
            >
              <Icono nombre="mas" tamano={22} color={c.acento} grosor={2.4} />
            </Presionable>
          )
        }
      />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargar} tintColor={c.acento} colors={[c.acento]} />}
      >
        <Aviso texto={error} />
        {charlas?.length === 0 && (
          <Texto tamano={14} color={c.texto3} style={{ textAlign: 'center', marginTop: 32 }}>
            Todavía no hay eventos.{esLider ? ' Tocá + para crear el primero.' : ' Cuando el líder cree uno, aparece acá.'}
          </Texto>
        )}
        {proximas.length > 0 && (
          <Texto peso="semi" tamano={13} color={c.texto2} style={{ letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 12 }}>
            Próximas
          </Texto>
        )}
        {proximas.map((x) => tarjeta(x, false))}
        {pasadas.length > 0 && (
          <Texto peso="semi" tamano={13} color={c.texto2} style={{ letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 24 }}>
            Ya pasaron
          </Texto>
        )}
        {pasadas.map((x) => tarjeta(x, true))}
      </ScrollView>
      <FormCharla
        visible={creando}
        onCerrar={() => setCreando(false)}
        termino={termino}
        onGuardado={(nueva) => {
          cargar()
          router.push(`/charla/${nueva.id}`)
        }}
      />
    </View>
  )
}
