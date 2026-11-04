// "Más": tu perfil y el resto de la app (todo menos Estadísticas, que queda en la web). Lo del
// líder (Panel del equipo y Configuración) solo aparece para el líder; Charlas, si el equipo las usa.
import { ScrollView, View } from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTema } from '../../lib/tema'
import { useSesion } from '../../lib/sesion'
import { nombreEventos } from '../../lib/compartido'
import Texto from '../../components/Texto'
import Presionable from '../../components/Presionable'
import Icono from '../../components/Icono'
import Avatar from '../../components/Avatar'

function Fila({ icono, titulo, sub, cantidad, ruta, ultima }) {
  const { c } = useTema()
  return (
    <Presionable
      escala={0.99}
      onPress={() => router.push(ruta)}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderBottomColor: c.borde,
        borderBottomWidth: ultima ? 0 : 1,
      }}
    >
      <Icono nombre={icono} tamano={21} color={c.acento} />
      <View style={{ flex: 1 }}>
        <Texto peso="media" tamano={16}>
          {titulo}
        </Texto>
        {sub && (
          <Texto tamano={12} color={c.texto3} style={{ marginTop: 1 }}>
            {sub}
          </Texto>
        )}
      </View>
      {cantidad > 0 && (
        <View style={{ backgroundColor: c.fondo3, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
          <Texto peso="semi" tamano={12} color={c.texto2}>
            {cantidad}
          </Texto>
        </View>
      )}
      <Icono nombre="derecha" tamano={18} color={c.texto3} />
    </Presionable>
  )
}

function Grupo({ titulo, children }) {
  const { c } = useTema()
  return (
    <View style={{ marginTop: 24 }}>
      <Texto peso="semi" tamano={13} color={c.texto2} style={{ letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 8 }}>
        {titulo}
      </Texto>
      <View style={{ backgroundColor: c.fondo, borderColor: c.borde, borderWidth: 1, borderRadius: 16, overflow: 'hidden' }}>
        {children}
      </View>
    </View>
  )
}

export default function Mas() {
  const { c } = useTema()
  const arriba = useSafeAreaInsets().top
  const { perfil, leads, config } = useSesion()
  const esLider = perfil?.rol === 'lider'
  const vencidos = leads.filter((l) => l.estado === 'vencido').length
  const sinAsignar = esLider ? leads.filter((l) => l.estado === 'activo' && !l.asesor_id).length : 0
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.fondo2 }}
      contentContainerStyle={{ padding: 20, paddingTop: arriba + 16, paddingBottom: 32 }}
    >
      <Texto peso="negrita" tamano={26} style={{ letterSpacing: -0.5 }}>
        Más
      </Texto>
      <Presionable
        escala={0.98}
        onPress={() => router.push('/perfil')}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
          backgroundColor: c.fondo,
          borderColor: c.borde,
          borderWidth: 1,
          borderRadius: 16,
          padding: 16,
          marginTop: 18,
        }}
      >
        <Avatar nombre={perfil?.nombre} foto={perfil?.avatar_url} tamano={52} />
        <View style={{ flex: 1 }}>
          <Texto peso="semi" tamano={17}>
            {perfil?.nombre}
          </Texto>
          <Texto tamano={13} color={c.texto2}>
            {esLider ? 'Líder de equipo' : 'Asesor comercial'} · {perfil?.tenants?.nombre}
          </Texto>
        </View>
        <Icono nombre="derecha" tamano={18} color={c.texto3} />
      </Presionable>

      <Grupo titulo="Vistas">
        <Fila icono="archivo" titulo="Archivo" sub="Vencidos y archivados para reclamar" cantidad={vencidos} ruta="/archivo" />
        <Fila icono="ganado" titulo="Casos exitosos" ruta="/cerrados/ganado" />
        <Fila icono="perdido" titulo="Cerrados perdidos" ruta="/cerrados/perdido" ultima={!config?.eventos_habilitado} />
        {config?.eventos_habilitado && <Fila icono="charla" titulo={nombreEventos(config?.termino_evento)} ruta="/charlas" ultima />}
      </Grupo>

      {esLider && (
        <Grupo titulo="Equipo">
          <Fila
            icono="equipo"
            titulo="Panel del equipo"
            sub="Asesores, leads del equipo y sin asignar"
            cantidad={sinAsignar}
            ruta="/panel"
          />
          <Fila icono="ajustes" titulo="Configuración" ruta="/configuracion" ultima />
        </Grupo>
      )}

      <Grupo titulo="Mensajes">
        <Fila icono="email" titulo="Plantillas de mensajes" sub="Textos para WhatsApp y email" ruta="/plantillas" ultima />
      </Grupo>

      <Texto tamano={12} color={c.texto3} style={{ textAlign: 'center', marginTop: 24 }}>
        Las estadísticas y los reportes están en la web.
      </Texto>
    </ScrollView>
  )
}
