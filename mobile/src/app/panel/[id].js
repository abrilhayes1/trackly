// Un asesor en el Panel: sus números (se tocan y filtran la lista) y sus leads, para reasignarlos
import { useEffect, useState } from 'react'
import { ScrollView, View } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { useTema } from '../../lib/tema'
import { useSesion } from '../../lib/sesion'
import { apiFetch } from '../../lib/api'
import { gruposPorLead, resumenAsesor } from '../../lib/panel'
import Texto from '../../components/Texto'
import Presionable from '../../components/Presionable'
import Encabezado from '../../components/Encabezado'
import Avatar from '../../components/Avatar'
import FilaLead from '../../components/FilaLead'
import Indicador from '../../components/Indicador'
import Reasignar from '../../components/Reasignar'
import { Aviso } from '../../components/Formulario'

const FILTROS = {
  asignados: { titulo: 'Asignados', cumple: (l) => l.estado === 'activo' },
  contactados: { titulo: 'Contactados', cumple: (l) => l.estado === 'activo' && !!l.ultimo_contacto },
  porVencer: { titulo: 'Por vencer', cumple: (l, g) => l.estado === 'activo' && g.get(l.id)?.clave === 'porVencer' },
  vencidos: { titulo: 'Vencidos', cumple: (l) => l.estado === 'vencido' },
}

export default function Asesor() {
  const { c } = useTema()
  const { id } = useLocalSearchParams()
  const { leads, config, recargar } = useSesion()
  const [miembros, setMiembros] = useState([])
  const [filtro, setFiltro] = useState(null)
  const [reasignando, setReasignando] = useState(null)
  const [aviso, setAviso] = useState(null)

  useEffect(() => {
    apiFetch('/api/config/equipo')
      .then((e) => setMiembros(e.miembros))
      .catch(() => {})
  }, [])

  const m = miembros.find((x) => x.id === id)
  const grupoDe = gruposPorLead(leads, config, miembros)
  const r = resumenAsesor(leads, grupoDe, id)
  const suyos = leads
    .filter(
      (l) => l.asesor_id === id && (l.estado === 'activo' || l.estado === 'vencido') && (!filtro || FILTROS[filtro].cumple(l, grupoDe)),
    )
    .sort((a, b) => (grupoDe.get(b.id)?.dias ?? 0) - (grupoDe.get(a.id)?.dias ?? 0))
  const colores = { asignados: c.texto, contactados: c.urgenteAzul, porVencer: c.urgenteAmbar, vencidos: c.urgenteRojo }
  const punto = (l) =>
    ({ porVencer: c.puntoRojo, sinContactar: c.puntoAzul, sinProximoPaso: c.violetaBorde, estaSemana: c.puntoAmbar, alDia: c.verdeBorde })[
      grupoDe.get(l.id)?.clave
    ] || c.texto3

  return (
    <View style={{ flex: 1, backgroundColor: c.fondo2 }}>
      <Encabezado titulo="" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <Avatar nombre={m?.nombre} foto={m?.avatar_url} tamano={52} />
          <View>
            <Texto peso="negrita" tamano={20}>
              {m?.nombre}
            </Texto>
            <Texto tamano={13} color={c.texto2}>
              {m?.rol === 'lider' ? 'Líder de equipo' : 'Asesor comercial'}
            </Texto>
          </View>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {Object.keys(FILTROS).map((k) => (
            <Indicador
              key={k}
              titulo={FILTROS[k].titulo}
              valor={r[k]}
              color={colores[k]}
              activo={filtro === k}
              onPress={() => setFiltro(filtro === k ? null : k)}
            />
          ))}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 20, marginBottom: 10 }}>
          <Texto peso="semi" tamano={13} color={c.texto2} style={{ letterSpacing: 0.6, textTransform: 'uppercase' }}>
            Leads de {m?.nombre?.split(' ')[0]}
            {filtro ? ` · ${FILTROS[filtro].titulo}` : ''}
          </Texto>
          {filtro && (
            <Presionable onPress={() => setFiltro(null)}>
              <Texto peso="media" tamano={13} color={c.acento}>
                Ver todos
              </Texto>
            </Presionable>
          )}
        </View>
        <Aviso texto={aviso} tipo="ok" style={{ marginTop: 0, marginBottom: 10 }} />
        {suyos.length === 0 && (
          <Texto tamano={14} color={c.texto3} style={{ textAlign: 'center', marginTop: 16 }}>
            No hay leads para mostrar.
          </Texto>
        )}
        {suyos.map((l) => (
          <View key={l.id}>
            <FilaLead lead={{ ...l, dias: grupoDe.get(l.id)?.dias }} punto={punto(l)} />
            {l.estado === 'activo' && (
              <Presionable onPress={() => setReasignando(l)} style={{ alignSelf: 'flex-end', marginTop: -4, marginBottom: 8 }}>
                <Texto peso="media" tamano={13} color={c.acento}>
                  Reasignar
                </Texto>
              </Presionable>
            )}
          </View>
        ))}
      </ScrollView>
      <Reasignar
        lead={reasignando}
        miembros={miembros}
        onCerrar={() => setReasignando(null)}
        onListo={(texto) => {
          setAviso(texto)
          recargar()
        }}
      />
    </View>
  )
}
