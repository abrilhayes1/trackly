// Agenda: la semana arriba (con flechas para moverse) y los recordatorios del día elegido, los de la
// agenda y los programados en cada lead. Los de la agenda se marcan como hechos; los de un lead abren
// su tarjeta (se dan por hechos al registrar el contacto).
import { useCallback, useEffect, useState } from 'react'
import { RefreshControl, ScrollView, View } from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTema } from '../../lib/tema'
import { useSesion } from '../../lib/sesion'
import { apiFetch } from '../../lib/api'
import { diasDespues, estadoRecordatorio, fechaLocal, hhmm, ordenarRecordatorios, recordatoriosDeLeads } from '../../lib/compartido'
import Texto from '../../components/Texto'
import Presionable from '../../components/Presionable'
import Icono from '../../components/Icono'
import NuevoRecordatorio from '../../components/NuevoRecordatorio'
import { Aviso } from '../../components/Formulario'

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

const aFecha = (f) => {
  const [a, m, d] = f.split('-').map(Number)
  return new Date(a, m - 1, d)
}
// lunes de la semana de una fecha
const lunes = (f) => diasDespues(f, -((aFecha(f).getDay() + 6) % 7))

export default function Agenda() {
  const { c } = useTema()
  const arriba = useSafeAreaInsets().top
  const { leads, userId, recordarLead } = useSesion()
  const hoy = fechaLocal()
  const [dia, setDia] = useState(hoy)
  const [agenda, setAgenda] = useState([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)
  const [nuevo, setNuevo] = useState(false)
  const [marcando, setMarcando] = useState(null)
  const inicio = lunes(dia)
  const semana = Array.from({ length: 7 }, (_, i) => diasDespues(inicio, i))

  const cargar = useCallback(() => {
    setCargando(true)
    apiFetch(`/api/recordatorios?fecha=${inicio}&hasta=${diasDespues(inicio, 6)}`)
      .then((r) => {
        setAgenda(r)
        setError(null)
      })
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false))
  }, [inicio])
  useEffect(cargar, [cargar])

  const todos = [...agenda, ...recordatoriosDeLeads(leads, userId)]
  // hoy también muestra los atrasados que siguen pendientes
  const delDia = todos.filter((r) => r.fecha === dia || (dia === hoy && r.fecha < hoy && !r.hecho)).sort(ordenarRecordatorios)
  const cuantos = (f) => todos.filter((r) => r.fecha === f && !r.hecho).length

  async function marcar(r) {
    if (r.lead) {
      recordarLead(r.lead)
      return router.push(`/lead/${r.lead.id}`)
    }
    setMarcando(r.id)
    try {
      await apiFetch(`/api/recordatorios/${r.id}`, { method: 'PATCH', body: JSON.stringify({ hecho: !r.hecho }) })
      cargar()
    } catch (e) {
      setError(e.message)
    } finally {
      setMarcando(null)
    }
  }

  const fechaDia = aFecha(dia)
  return (
    <View style={{ flex: 1, backgroundColor: c.fondo2 }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingTop: arriba + 16, paddingBottom: 96 }}
        refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargar} tintColor={c.acento} colors={[c.acento]} />}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Texto peso="negrita" tamano={26} style={{ letterSpacing: -0.5 }}>
            Agenda
          </Texto>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {dia !== hoy && (
              <Presionable
                onPress={() => setDia(hoy)}
                style={{
                  paddingHorizontal: 12,
                  height: 40,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: c.borde2,
                  justifyContent: 'center',
                  backgroundColor: c.fondo,
                }}
              >
                <Texto peso="media" tamano={14}>
                  Hoy
                </Texto>
              </Presionable>
            )}
            {[
              ['atras', -7, 'Semana anterior'],
              ['derecha', 7, 'Semana siguiente'],
            ].map(([icono, n, etiqueta]) => (
              <Presionable
                key={icono}
                onPress={() => setDia(diasDespues(dia, n))}
                accessibilityLabel={etiqueta}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: c.borde2,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: c.fondo,
                }}
              >
                <Icono nombre={icono} tamano={18} color={c.texto} />
              </Presionable>
            ))}
          </View>
        </View>
        <Texto tamano={14} color={c.texto2} style={{ marginTop: 4 }}>
          {MESES[fechaDia.getMonth()].replace(/^./, (x) => x.toUpperCase())} {fechaDia.getFullYear()}
        </Texto>

        <View style={{ flexDirection: 'row', gap: 6, marginTop: 16 }}>
          {semana.map((f) => {
            const elegido = f === dia
            const n = cuantos(f)
            return (
              <Presionable
                key={f}
                onPress={() => setDia(f)}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  paddingVertical: 10,
                  borderRadius: 14,
                  backgroundColor: elegido ? c.acento : c.fondo,
                  borderWidth: 1,
                  borderColor: elegido ? c.acento : f === hoy ? c.violetaBorde : c.borde,
                }}
              >
                <Texto tamano={12} color={elegido ? '#fff' : c.texto2}>
                  {DIAS[aFecha(f).getDay()]}
                </Texto>
                <Texto peso="semi" tamano={17} color={elegido ? '#fff' : c.texto} style={{ marginTop: 2 }}>
                  {aFecha(f).getDate()}
                </Texto>
                <View
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: 3,
                    marginTop: 4,
                    backgroundColor: n ? (elegido ? '#fff' : c.acento) : 'transparent',
                  }}
                />
              </Presionable>
            )
          })}
        </View>

        <Aviso texto={error} />
        {delDia.length === 0 && !cargando && (
          <Texto tamano={14} color={c.texto3} style={{ textAlign: 'center', marginTop: 40 }}>
            Sin recordatorios para este día.
          </Texto>
        )}
        <View style={{ marginTop: 16 }}>
          {delDia.map((r) => {
            const estado = estadoRecordatorio(r)
            const color = r.hecho
              ? c.texto3
              : estado === 'urgente' || estado === 'atrasado'
                ? c.urgenteRojo
                : estado === 'pronto'
                  ? c.urgenteAmbar
                  : c.texto
            return (
              <View
                key={r.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                  backgroundColor: c.fondo,
                  borderColor: c.borde,
                  borderWidth: 1,
                  borderRadius: 14,
                  paddingLeft: 14,
                  paddingRight: 10,
                  paddingVertical: 12,
                  marginBottom: 8,
                  opacity: r.hecho ? 0.6 : 1,
                }}
              >
                <Texto peso="negrita" tamano={16} color={color} style={{ width: 62 }}>
                  {estado === 'atrasado' ? 'Atras.' : hhmm(r.hora) || '—'}
                </Texto>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Texto peso="semi" tamano={15} numberOfLines={1} style={{ textDecorationLine: r.hecho ? 'line-through' : 'none' }}>
                    {r.contacto}
                  </Texto>
                  {!!r.nota && (
                    <Texto tamano={13} color={c.texto2} numberOfLines={1} style={{ marginTop: 2 }}>
                      {r.nota}
                    </Texto>
                  )}
                </View>
                <Presionable
                  onPress={() => marcar(r)}
                  disabled={marcando === r.id}
                  accessibilityLabel={r.lead ? `Abrir a ${r.contacto}` : r.hecho ? 'Volver a pendiente' : 'Marcar como hecho'}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    borderColor: r.hecho ? c.verdeBorde : c.borde2,
                    backgroundColor: r.hecho ? c.verdeFondo : 'transparent',
                    borderWidth: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icono nombre={r.lead ? 'derecha' : 'check'} tamano={18} color={r.hecho ? c.verdeTexto : c.texto2} />
                </Presionable>
              </View>
            )
          })}
        </View>
      </ScrollView>
      <Presionable
        onPress={() => setNuevo(true)}
        accessibilityLabel="Recordatorio nuevo"
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
      <NuevoRecordatorio visible={nuevo} onCerrar={() => setNuevo(false)} fechaInicial={dia} onGuardado={cargar} />
    </View>
  )
}
