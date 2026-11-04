// Mis leads (RF42): los contadores del día, los recordatorios de hoy y los leads por urgencia,
// con los mismos grupos que la web. La lupa busca en todo el equipo (nombre, teléfono o email).
import { useEffect, useState } from 'react'
import { ActivityIndicator, RefreshControl, ScrollView, TextInput, View } from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LETRA, useTema } from '../../lib/tema'
import { useSesion } from '../../lib/sesion'
import { apiFetch } from '../../lib/api'
import { agruparLeads, estadoRecordatorio, hhmm } from '../../lib/compartido'
import { lodeHoy } from '../../lib/hoy'
import { fechaLarga } from '../../lib/fechas'
import Texto from '../../components/Texto'
import Presionable from '../../components/Presionable'
import Icono from '../../components/Icono'
import FilaLead from '../../components/FilaLead'
import NuevoLead from '../../components/NuevoLead'

const POR_SECCION = 7

export default function MisLeads() {
  const { c } = useTema()
  const arriba = useSafeAreaInsets().top
  const { perfil, leads, agenda, config, userId, cargando, error, recargar, recordarLead } = useSesion()
  const [buscando, setBuscando] = useState(false)
  const [q, setQ] = useState('')
  const [resultados, setResultados] = useState(null)
  const [abiertas, setAbiertas] = useState({})
  const [nuevo, setNuevo] = useState(false)

  // el buscador espera a que dejes de escribir y busca en el servidor (todo el equipo, cualquier estado)
  useEffect(() => {
    const texto = q.trim()
    if (texto.length < 2) return setResultados(null)
    const espera = setTimeout(() => {
      apiFetch(`/api/leads/buscar?q=${encodeURIComponent(texto)}`)
        .then(setResultados)
        .catch(() => setResultados([]))
    }, 300)
    return () => clearTimeout(espera)
  }, [q])

  const grupos = agruparLeads(leads, config, userId)
  const { recordatorios } = lodeHoy({ leads, agenda, config, userId })
  const SECCIONES = [
    { clave: 'porVencer', titulo: 'Por vencer', punto: c.puntoRojo, fondo: c.rojoFondo, texto: c.urgenteRojo },
    { clave: 'sinContactar', titulo: 'Sin contactar', punto: c.puntoAzul, fondo: c.avatarFondo, texto: c.urgenteAzul },
    { clave: 'sinProximoPaso', titulo: 'Sin próximo paso', punto: c.violetaBorde, fondo: c.violetaFondo, texto: c.violetaTexto },
    { clave: 'estaSemana', titulo: 'Esta semana', punto: c.puntoAmbar, fondo: c.ambarFondo, texto: c.urgenteAmbar },
    { clave: 'alDia', titulo: 'Al día', punto: c.verdeBorde, fondo: c.verdeFondo, texto: c.verdeTexto },
  ]
  const nombre = perfil?.nombre?.split(' ')[0]
  const sinNada = Object.values(grupos).every((g) => g.length === 0)

  return (
    <View style={{ flex: 1, backgroundColor: c.fondo2 }}>
      <ScrollView
        style={{ flex: 1, backgroundColor: c.fondo2 }}
        contentContainerStyle={{ padding: 20, paddingTop: arriba + 16, paddingBottom: 96 }}
        refreshControl={<RefreshControl refreshing={cargando && !!perfil} onRefresh={recargar} tintColor={c.acento} colors={[c.acento]} />}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <View>
            <Texto tamano={13} color={c.texto2}>
              {fechaLarga()}
            </Texto>
            <Texto peso="negrita" tamano={26} style={{ marginTop: 2, letterSpacing: -0.5 }}>
              {nombre ? `Hola, ${nombre}` : 'Mis leads'}
            </Texto>
          </View>
          <Presionable
            onPress={() => {
              setBuscando(!buscando)
              setQ('')
            }}
            accessibilityLabel={buscando ? 'Cerrar búsqueda' : 'Buscar'}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: c.fondo,
              borderColor: c.borde,
              borderWidth: 1,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icono nombre={buscando ? 'cerrar' : 'buscar'} color={c.texto} tamano={19} />
          </Presionable>
        </View>

        {buscando && (
          <View style={{ marginTop: 16 }}>
            <TextInput
              autoFocus
              value={q}
              onChangeText={setQ}
              placeholder="Buscar por nombre, teléfono o email"
              placeholderTextColor={c.texto3}
              autoCapitalize="none"
              autoCorrect={false}
              style={{
                fontFamily: LETRA.normal,
                fontSize: 15,
                color: c.texto,
                backgroundColor: c.fondo,
                borderColor: c.borde2,
                borderWidth: 1,
                borderRadius: 12,
                paddingHorizontal: 14,
                height: 46,
                marginBottom: 12,
              }}
            />
            {resultados?.length === 0 && (
              <Texto tamano={13} color={c.texto3} style={{ textAlign: 'center', paddingVertical: 16 }}>
                No encontramos a nadie con eso.
              </Texto>
            )}
            {resultados?.map((l) => (
              <FilaLead key={l.id} lead={l} />
            ))}
          </View>
        )}

        {!buscando && (
          <>
            {error && (
              <View
                style={{
                  backgroundColor: c.rojoFondo,
                  borderColor: c.rojoBorde,
                  borderWidth: 1,
                  borderRadius: 12,
                  padding: 12,
                  marginTop: 16,
                }}
              >
                <Texto tamano={13} color={c.rojoTexto}>
                  {error}
                </Texto>
                <Presionable onPress={recargar} style={{ marginTop: 6 }}>
                  <Texto peso="semi" tamano={13} color={c.rojoTexto}>
                    Reintentar
                  </Texto>
                </Presionable>
              </View>
            )}
            {cargando && !perfil && <ActivityIndicator color={c.acento} style={{ marginTop: 40 }} />}
            {/* cuenta sin equipo: el equipo se crea (o se acepta la invitación) desde la web */}
            {!cargando && !error && perfil === null && (
              <Texto tamano={15} color={c.texto2} style={{ textAlign: 'center', marginTop: 40, lineHeight: 22 }}>
                Tu cuenta todavía no tiene equipo. Crealo desde la web (trackly-six-delta.vercel.app) o pedile al líder que te invite con
                este email.
              </Texto>
            )}

            {perfil && (
              <>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 18 }}>
                  {[
                    ['Por vencer', grupos.porVencer.length, c.urgenteRojo],
                    ['Esta semana', grupos.estaSemana.length, c.urgenteAmbar],
                    ['Sin contactar', grupos.sinContactar.length, c.urgenteAzul],
                  ].map(([titulo, n, color]) => (
                    <View
                      key={titulo}
                      style={{ flex: 1, backgroundColor: c.fondo, borderColor: c.borde, borderWidth: 1, borderRadius: 14, padding: 12 }}
                    >
                      <Texto tamano={12} color={c.texto2} numberOfLines={1}>
                        {titulo}
                      </Texto>
                      <Texto peso="negrita" tamano={24} color={color} style={{ marginTop: 4 }}>
                        {n}
                      </Texto>
                    </View>
                  ))}
                </View>

                {recordatorios.length > 0 && (
                  <>
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: 24,
                        marginBottom: 10,
                      }}
                    >
                      <Texto peso="semi" tamano={16}>
                        Recordatorios de hoy
                      </Texto>
                      <Presionable onPress={() => router.navigate('/alertas')} hitSlop={8}>
                        <Texto peso="media" tamano={14} color={c.acento}>
                          Ver todos
                        </Texto>
                      </Presionable>
                    </View>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={{ marginHorizontal: -20 }}
                      contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
                    >
                      {recordatorios.map((r) => {
                        const estado = estadoRecordatorio(r)
                        const rojo = estado === 'urgente' || estado === 'atrasado'
                        return (
                          <Presionable
                            key={r.id}
                            onPress={() => {
                              if (!r.lead) return router.navigate('/alertas')
                              recordarLead(r.lead)
                              router.push(`/lead/${r.lead.id}`)
                            }}
                            style={{
                              width: 160,
                              backgroundColor: c.fondo,
                              borderColor: rojo ? c.rojoBorde : c.borde,
                              borderWidth: 1,
                              borderRadius: 14,
                              padding: 12,
                            }}
                          >
                            <Texto peso="negrita" tamano={17} color={rojo ? c.urgenteRojo : estado === 'pronto' ? c.urgenteAmbar : c.texto}>
                              {estado === 'atrasado' ? 'Atrasado' : hhmm(r.hora) || 'Sin hora'}
                            </Texto>
                            <Texto peso="semi" tamano={14} numberOfLines={1} style={{ marginTop: 4 }}>
                              {r.contacto}
                            </Texto>
                            <Texto tamano={12} color={c.texto2} numberOfLines={1} style={{ marginTop: 1 }}>
                              {r.nota || ' '}
                            </Texto>
                          </Presionable>
                        )
                      })}
                    </ScrollView>
                  </>
                )}

                {sinNada && !cargando && (
                  <Texto tamano={14} color={c.texto3} style={{ textAlign: 'center', marginTop: 40 }}>
                    No tenés leads asignados.
                  </Texto>
                )}

                {SECCIONES.filter((s) => grupos[s.clave].length > 0).map((s) => {
                  const lista = grupos[s.clave]
                  const visibles = abiertas[s.clave] ? lista : lista.slice(0, POR_SECCION)
                  return (
                    <View key={s.clave} style={{ marginTop: 24 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <Texto peso="semi" tamano={13} color={c.texto2} style={{ letterSpacing: 0.6, textTransform: 'uppercase' }}>
                          {s.titulo}
                        </Texto>
                        <View style={{ backgroundColor: s.fondo, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 1 }}>
                          <Texto peso="semi" tamano={12} color={s.texto}>
                            {lista.length}
                          </Texto>
                        </View>
                      </View>
                      {visibles.map((l) => (
                        <FilaLead key={l.id} lead={l} punto={s.punto} colorDias={s.texto} />
                      ))}
                      {lista.length > POR_SECCION && (
                        <Presionable
                          onPress={() => setAbiertas({ ...abiertas, [s.clave]: !abiertas[s.clave] })}
                          style={{ paddingVertical: 6 }}
                        >
                          <Texto peso="media" tamano={14} color={c.acento}>
                            {abiertas[s.clave] ? 'Ver menos' : `Ver los ${lista.length}`}
                          </Texto>
                        </Presionable>
                      )}
                    </View>
                  )
                })}
              </>
            )}
          </>
        )}
      </ScrollView>
      {/* lead nuevo: el mismo botón flotante que en la web */}
      <Presionable
        onPress={() => setNuevo(true)}
        accessibilityLabel="Lead nuevo"
        style={{
          position: 'absolute',
          right: 20,
          bottom: 20,
          width: 58,
          height: 58,
          borderRadius: 29,
          backgroundColor: c.acento,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOpacity: 0.18,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
          elevation: 6,
        }}
      >
        <Icono nombre="mas" color="#fff" tamano={26} grosor={2.4} />
      </Presionable>
      <NuevoLead visible={nuevo} onCerrar={() => setNuevo(false)} />
    </View>
  )
}
