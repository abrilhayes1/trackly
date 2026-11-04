// Alertas de hoy (RF42): los leads que vencen hoy (con Llamar y WhatsApp a mano), los que están
// por vencer y los recordatorios pendientes. Los de la agenda se marcan como hechos con el ✓; los de
// un lead se dan por hechos al registrar el contacto, así que el ✓ abre su tarjeta.
import { useState } from 'react'
import { RefreshControl, ScrollView, View } from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTema } from '../../lib/tema'
import { useSesion } from '../../lib/sesion'
import { apiFetch } from '../../lib/api'
import { estadoRecordatorio, hhmm } from '../../lib/compartido'
import { lodeHoy } from '../../lib/hoy'
import Texto from '../../components/Texto'
import Presionable from '../../components/Presionable'
import Icono from '../../components/Icono'
import FilaLead from '../../components/FilaLead'
import BotonesContacto from '../../components/BotonesContacto'
import { PillInteres } from '../../components/Pill'

function Titulo({ texto, cantidad, fondo, color }) {
  const { c } = useTema()
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 24, marginBottom: 10 }}>
      <Texto peso="semi" tamano={13} color={c.texto2} style={{ letterSpacing: 0.6, textTransform: 'uppercase' }}>
        {texto}
      </Texto>
      <View style={{ backgroundColor: fondo, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 1 }}>
        <Texto peso="semi" tamano={12} color={color}>
          {cantidad}
        </Texto>
      </View>
    </View>
  )
}

export default function Alertas() {
  const { c } = useTema()
  const arriba = useSafeAreaInsets().top
  const { leads, agenda, config, userId, cargando, recargar, recordarLead } = useSesion()
  const [marcando, setMarcando] = useState(null)
  const [error, setError] = useState(null)
  const { vencenHoy, porVencer, recordatorios } = lodeHoy({ leads, agenda, config, userId })

  const abrir = (lead) => {
    recordarLead(lead)
    router.push(`/lead/${lead.id}`)
  }

  async function hecho(r) {
    if (r.lead) return abrir(r.lead)
    setMarcando(r.id)
    setError(null)
    try {
      await apiFetch(`/api/recordatorios/${r.id}`, { method: 'PATCH', body: JSON.stringify({ hecho: true }) })
      await recargar()
    } catch (e) {
      setError(e.message)
    } finally {
      setMarcando(null)
    }
  }

  const resumen = [
    vencenHoy.length && `${vencenHoy.length} ${vencenHoy.length === 1 ? 'lead vence' : 'leads vencen'} hoy`,
    recordatorios.length && `${recordatorios.length} ${recordatorios.length === 1 ? 'recordatorio' : 'recordatorios'}`,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.fondo2 }}
      contentContainerStyle={{ padding: 20, paddingTop: arriba + 16, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={cargando} onRefresh={recargar} tintColor={c.acento} colors={[c.acento]} />}
    >
      <Texto peso="negrita" tamano={26} style={{ letterSpacing: -0.5 }}>
        Alertas de hoy
      </Texto>
      <Texto tamano={14} color={c.texto2} style={{ marginTop: 4 }}>
        {resumen || 'Nada urgente por hoy'}
      </Texto>

      {error && (
        <View
          style={{ backgroundColor: c.rojoFondo, borderColor: c.rojoBorde, borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 16 }}
        >
          <Texto tamano={13} color={c.rojoTexto}>
            {error}
          </Texto>
        </View>
      )}

      {vencenHoy.length > 0 && (
        <>
          <Titulo texto="Vencen hoy" cantidad={vencenHoy.length} fondo={c.rojoFondo} color={c.urgenteRojo} />
          {vencenHoy.map((l) => (
            <Presionable
              key={l.id}
              escala={0.99}
              onPress={() => abrir(l)}
              style={{
                backgroundColor: c.fondo,
                borderColor: c.rojoBorde,
                borderWidth: 1,
                borderRadius: 14,
                padding: 14,
                marginBottom: 10,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 12 }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Texto peso="semi" tamano={16} numberOfLines={1}>
                    {l.nombre}
                  </Texto>
                  <Texto tamano={13} color={c.texto2} numberOfLines={1} style={{ marginTop: 2 }}>
                    {[l.telefono, l.origen].filter(Boolean).join(' · ') || l.email}
                  </Texto>
                </View>
                <PillInteres interes={l.interes} />
              </View>
              <BotonesContacto lead={l} />
            </Presionable>
          ))}
        </>
      )}

      {porVencer.length > 0 && (
        <>
          <Titulo texto="Por vencer" cantidad={porVencer.length} fondo={c.ambarFondo} color={c.urgenteAmbar} />
          {porVencer.map((l) => (
            <FilaLead key={l.id} lead={l} punto={c.puntoAmbar} colorDias={c.urgenteAmbar} />
          ))}
        </>
      )}

      {recordatorios.length > 0 && (
        <>
          <Titulo texto="Recordatorios" cantidad={recordatorios.length} fondo={c.ambarFondo} color={c.urgenteAmbar} />
          {recordatorios.map((r) => {
            const estado = estadoRecordatorio(r)
            const color = estado === 'urgente' || estado === 'atrasado' ? c.urgenteRojo : estado === 'pronto' ? c.urgenteAmbar : c.texto
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
                }}
              >
                <Texto peso="negrita" tamano={16} color={color} style={{ width: 62 }}>
                  {estado === 'atrasado' ? 'Atras.' : hhmm(r.hora) || '—'}
                </Texto>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Texto peso="semi" tamano={15} numberOfLines={1}>
                    {r.contacto}
                  </Texto>
                  {!!r.nota && (
                    <Texto tamano={13} color={c.texto2} numberOfLines={1} style={{ marginTop: 2 }}>
                      {r.nota}
                    </Texto>
                  )}
                </View>
                <Presionable
                  onPress={() => hecho(r)}
                  disabled={marcando === r.id}
                  accessibilityLabel={r.lead ? `Abrir a ${r.contacto}` : 'Marcar como hecho'}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    borderColor: c.borde2,
                    borderWidth: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icono nombre="check" tamano={18} color={c.texto2} />
                </Presionable>
              </View>
            )
          })}
        </>
      )}
    </ScrollView>
  )
}
