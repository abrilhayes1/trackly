// Casos exitosos y Cerrados perdidos: los cierres del más nuevo al más viejo, de a 30. El asesor ve
// los suyos; el líder, los de todo el equipo y puede filtrar por persona.
import { useCallback, useEffect, useState } from 'react'
import { ScrollView, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useTema } from '../../lib/tema'
import { useSesion } from '../../lib/sesion'
import { apiFetch } from '../../lib/api'
import { detalleCierre } from '../../lib/compartido'
import { cuando } from '../../lib/fechas'
import Texto from '../../components/Texto'
import Presionable from '../../components/Presionable'
import Encabezado from '../../components/Encabezado'
import Avatar from '../../components/Avatar'
import { Aviso, Boton, Chip } from '../../components/Formulario'

const POR_PAGINA = 30

export default function Cerrados() {
  const { c } = useTema()
  const { tipo } = useLocalSearchParams()
  const { perfil, config, recordarLead } = useSesion()
  const esLider = perfil?.rol === 'lider'
  const ganado = tipo === 'ganado'
  const [cierres, setCierres] = useState(null)
  const [hayMas, setHayMas] = useState(false)
  const [miembros, setMiembros] = useState([])
  const [asesor, setAsesor] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)

  const url = useCallback(
    (desde) => `/api/cierres?tipo=${tipo}&limite=${POR_PAGINA}&desde=${desde}${asesor ? `&asesor=${asesor}` : ''}`,
    [tipo, asesor],
  )

  useEffect(() => {
    setCierres(null)
    apiFetch(url(0))
      .then((d) => {
        setCierres(d.cierres)
        setHayMas(d.hayMas)
        setError(null)
      })
      .catch((e) => setError(e.message))
  }, [url])

  useEffect(() => {
    if (!esLider) return
    apiFetch('/api/config/equipo')
      .then((e) => setMiembros(e.miembros))
      .catch(() => {})
  }, [esLider])

  async function masCierres() {
    setCargando(true)
    try {
      const d = await apiFetch(url(cierres.length))
      setCierres([...cierres, ...d.cierres])
      setHayMas(d.hayMas)
    } catch (e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.fondo2 }}>
      <Encabezado titulo={ganado ? 'Casos exitosos' : 'Cerrados perdidos'} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}>
        {esLider && miembros.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginHorizontal: -20, marginBottom: 8 }}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
          >
            <Chip texto="Todo el equipo" elegido={!asesor} onPress={() => setAsesor('')} />
            {miembros.map((m) => (
              <Chip key={m.id} texto={m.nombre.split(' ')[0]} elegido={asesor === m.id} onPress={() => setAsesor(m.id)} />
            ))}
          </ScrollView>
        )}
        <Aviso texto={error} />
        {cierres?.length === 0 && (
          <Texto tamano={14} color={c.texto3} style={{ textAlign: 'center', marginTop: 32 }}>
            {ganado ? 'Todavía no hay casos exitosos.' : 'Todavía no hay cierres perdidos.'}
          </Texto>
        )}
        {cierres?.map((x) => (
          <Presionable
            key={x.id}
            escala={0.98}
            disabled={!x.lead}
            onPress={() => {
              recordarLead(x.lead)
              router.push(`/lead/${x.lead.id}`)
            }}
            style={{
              backgroundColor: c.fondo,
              borderColor: c.borde,
              borderLeftColor: ganado ? c.verdeBorde : c.rojoBorde,
              borderWidth: 1,
              borderLeftWidth: 3,
              borderRadius: 14,
              padding: 14,
              marginTop: 8,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Avatar nombre={x.lead?.nombre} tamano={30} />
              <Texto peso="semi" tamano={15} style={{ flex: 1 }} numberOfLines={1}>
                {x.lead?.nombre || 'Contacto no disponible'}
              </Texto>
              <Texto tamano={12} color={c.texto3}>
                {cuando(x.updated_at)}
              </Texto>
            </View>
            {esLider && x.lead?.asesor?.nombre && (
              <Texto tamano={12} color={c.texto2} style={{ marginTop: 6 }}>
                De {x.lead.asesor.nombre}
              </Texto>
            )}
            <Texto tamano={14} color={c.texto2} style={{ marginTop: 6 }}>
              {ganado
                ? detalleCierre(config?.campos_cierre, x.datos)
                    .map((d) => d.texto)
                    .join(' · ') || 'Ganado'
                : x.motivo || 'Sin motivo'}
            </Texto>
          </Presionable>
        ))}
        {hayMas && (
          <Boton
            texto={cargando ? 'Cargando...' : 'Ver más'}
            tipo="secundario"
            disabled={cargando}
            onPress={masCierres}
            style={{ marginTop: 12 }}
          />
        )}
      </ScrollView>
    </View>
  )
}
