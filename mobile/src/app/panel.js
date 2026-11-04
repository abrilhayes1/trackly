// Panel del equipo (RF38 a RF40 · solo el líder): los números del equipo (se tocan y filtran), los
// asesores con su resumen, los leads del equipo y los que llegaron sin asesor, para asignarlos.
import { useEffect, useState } from 'react'
import { RefreshControl, ScrollView, View } from 'react-native'
import { router } from 'expo-router'
import { useTema } from '../lib/tema'
import { useSesion } from '../lib/sesion'
import { apiFetch } from '../lib/api'
import { gruposPorLead, resumenAsesor } from '../lib/panel'
import Texto from '../components/Texto'
import Presionable from '../components/Presionable'
import Encabezado from '../components/Encabezado'
import Avatar from '../components/Avatar'
import Icono from '../components/Icono'
import FilaLead from '../components/FilaLead'
import Indicador from '../components/Indicador'
import Reasignar from '../components/Reasignar'
import { Aviso, Chip } from '../components/Formulario'

export default function Panel() {
  const { c } = useTema()
  const { leads, config, cargando, recargar } = useSesion()
  const [miembros, setMiembros] = useState([])
  const [pestana, setPestana] = useState('asesores')
  const [filtro, setFiltro] = useState(null) // null | 'activos' | 'vencidos'
  const [reasignando, setReasignando] = useState(null)
  const [aviso, setAviso] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    apiFetch('/api/config/equipo')
      .then((e) => setMiembros(e.miembros))
      .catch((e) => setError(e.message))
  }, [])

  const grupoDe = gruposPorLead(leads, config, miembros)
  const activos = leads.filter((l) => l.estado === 'activo')
  const sinAsignar = activos.filter((l) => !l.asesor_id)
  const vencidos = leads.filter((l) => l.estado === 'vencido')
  const delEquipo = leads.filter((l) =>
    filtro === 'activos' ? l.estado === 'activo' : filtro === 'vencidos' ? l.estado === 'vencido' : true,
  )
  const irA = (p, f = null) => {
    setPestana(p)
    setFiltro(f)
    setAviso(null)
  }
  const nombreDe = (id) => miembros.find((m) => m.id === id)?.nombre

  return (
    <View style={{ flex: 1, backgroundColor: c.fondo2 }}>
      <Encabezado titulo="Panel del equipo" />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={cargando} onRefresh={recargar} tintColor={c.acento} colors={[c.acento]} />}
      >
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Indicador titulo="Miembros" valor={miembros.length} activo={pestana === 'asesores'} onPress={() => irA('asesores')} />
          <Indicador
            titulo="Leads activos"
            valor={activos.length}
            activo={pestana === 'leads' && filtro === 'activos'}
            onPress={() => irA('leads', 'activos')}
          />
          <Indicador
            titulo="Sin asignar"
            valor={sinAsignar.length}
            color={c.urgenteAzul}
            activo={pestana === 'sinAsignar'}
            onPress={() => irA('sinAsignar')}
          />
          <Indicador
            titulo="Vencidos sin gestión"
            valor={vencidos.length}
            color={c.urgenteRojo}
            activo={pestana === 'leads' && filtro === 'vencidos'}
            onPress={() => irA('leads', 'vencidos')}
          />
        </View>

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 18 }}>
          <Chip texto="Asesores" elegido={pestana === 'asesores'} onPress={() => irA('asesores')} />
          <Chip texto="Del equipo" elegido={pestana === 'leads'} onPress={() => irA('leads')} />
          <Chip texto={`Sin asignar · ${sinAsignar.length}`} elegido={pestana === 'sinAsignar'} onPress={() => irA('sinAsignar')} />
        </View>

        <Aviso texto={error} />
        <Aviso texto={aviso} tipo="ok" />

        {pestana === 'asesores' &&
          miembros.map((m) => {
            const r = resumenAsesor(leads, grupoDe, m.id)
            return (
              <Presionable
                key={m.id}
                escala={0.98}
                onPress={() => router.push(`/panel/${m.id}`)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  backgroundColor: c.fondo,
                  borderColor: c.borde,
                  borderWidth: 1,
                  borderRadius: 14,
                  padding: 14,
                  marginTop: 10,
                }}
              >
                <Avatar nombre={m.nombre} foto={m.avatar_url} tamano={40} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Texto peso="semi" tamano={15} numberOfLines={1}>
                    {m.nombre}
                  </Texto>
                  <Texto tamano={12} color={c.texto2} style={{ marginTop: 2 }}>
                    {r.asignados} asignados · {r.contactados} contact. ·{' '}
                    <Texto tamano={12} color={r.porVencer ? c.urgenteRojo : c.texto2}>
                      {r.porVencer} por vencer
                    </Texto>{' '}
                    ·{' '}
                    <Texto tamano={12} color={r.vencidos ? c.urgenteRojo : c.texto2}>
                      {r.vencidos} vencidos
                    </Texto>
                  </Texto>
                </View>
                <Icono nombre="derecha" tamano={18} color={c.texto3} />
              </Presionable>
            )
          })}

        {pestana === 'leads' && (
          <View style={{ marginTop: 10 }}>
            {filtro && (
              <Presionable onPress={() => setFiltro(null)} style={{ marginBottom: 8 }}>
                <Texto peso="media" tamano={14} color={c.acento}>
                  {filtro === 'activos' ? 'Solo activos' : 'Solo vencidos'} · Ver todos
                </Texto>
              </Presionable>
            )}
            {delEquipo.map((l) => (
              <View key={l.id}>
                <FilaLead
                  lead={{ ...l, consulta: l.asesor_id ? nombreDe(l.asesor_id) || 'Otro asesor' : 'Sin asignar' }}
                  punto={l.estado === 'vencido' ? c.texto3 : undefined}
                />
                {l.estado === 'activo' && (
                  <Presionable onPress={() => setReasignando(l)} style={{ alignSelf: 'flex-end', marginTop: -4, marginBottom: 8 }}>
                    <Texto peso="media" tamano={13} color={c.acento}>
                      {l.asesor_id ? 'Reasignar' : 'Asignar'}
                    </Texto>
                  </Presionable>
                )}
              </View>
            ))}
          </View>
        )}

        {pestana === 'sinAsignar' && (
          <View style={{ marginTop: 10 }}>
            {sinAsignar.length === 0 && (
              <Texto tamano={14} color={c.texto3} style={{ textAlign: 'center', marginTop: 24 }}>
                No hay leads sin asignar.
              </Texto>
            )}
            {sinAsignar.map((l) => (
              <View key={l.id}>
                <FilaLead lead={l} punto={c.puntoAzul} />
                <Presionable onPress={() => setReasignando(l)} style={{ alignSelf: 'flex-end', marginTop: -4, marginBottom: 8 }}>
                  <Texto peso="semi" tamano={13} color={c.acento}>
                    Asignar
                  </Texto>
                </Presionable>
              </View>
            ))}
          </View>
        )}
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
