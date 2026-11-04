// Tarjeta del lead (RF42 / RF44): contactarlo, su consulta, el nivel de interés, el seguimiento y
// el historial. (Registrar contacto, cerrar y agregar notas se suman en la próxima etapa.)
import { useEffect, useState } from 'react'
import { ScrollView, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colorInteres, useTema } from '../../lib/tema'
import { useSesion } from '../../lib/sesion'
import { apiFetch } from '../../lib/api'
import { diasDesde, etiquetaInteres } from '../../lib/compartido'
import { cuando, fechaCorta } from '../../lib/fechas'
import Texto from '../../components/Texto'
import Presionable from '../../components/Presionable'
import Icono from '../../components/Icono'
import Avatar from '../../components/Avatar'
import Pill from '../../components/Pill'
import BotonesContacto from '../../components/BotonesContacto'

const NIVELES = Object.keys(etiquetaInteres)

function Bloque({ titulo, children, style }) {
  const { c } = useTema()
  return (
    <View style={[{ backgroundColor: c.fondo, borderColor: c.borde, borderWidth: 1, borderRadius: 14, padding: 14, marginTop: 12 }, style]}>
      {titulo && (
        <Texto peso="semi" tamano={12} color={c.texto2} style={{ letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 10 }}>
          {titulo}
        </Texto>
      )}
      {children}
    </View>
  )
}

export default function TarjetaLead() {
  const { c } = useTema()
  const { top, bottom } = useSafeAreaInsets()
  const { id } = useLocalSearchParams()
  const { buscarLead, actualizarLead, perfil, userId, config } = useSesion()
  const lead = buscarLead(id)
  const [historial, setHistorial] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    apiFetch(`/api/leads/${id}/historial`)
      .then(setHistorial)
      .catch(() => setHistorial([]))
  }, [id])

  if (!lead) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.fondo2 }}>
        <Texto color={c.texto2}>No encontramos este lead.</Texto>
      </View>
    )
  }

  // el líder edita cualquiera; el asesor, los suyos mientras estén activos
  const puedeEditar = perfil?.rol === 'lider' || (lead.asesor_id === userId && lead.estado === 'activo')

  async function guardar(cambios) {
    setGuardando(true)
    setError(null)
    try {
      const { advertencia, ...datos } = await apiFetch(`/api/leads/${lead.id}`, { method: 'PATCH', body: JSON.stringify(cambios) })
      actualizarLead(lead.id, datos)
      apiFetch(`/api/leads/${lead.id}/historial`)
        .then(setHistorial)
        .catch(() => {})
    } catch (e) {
      setError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  const habiles = !!config?.dias_habiles
  const dias = diasDesde(lead.ultimo_contacto || lead.fecha_ingreso, habiles)
  const corridos = diasDesde(lead.ultimo_contacto || lead.fecha_ingreso)
  const plazo = config?.vencimiento_habilitado ? config.dias_vencimiento_lead : null
  const urgente = plazo && dias >= plazo - (config.dias_alerta_previa || 0)
  const textoDias = !lead.ultimo_contacto
    ? corridos === 0
      ? 'Ingresó hoy'
      : `${dias} ${dias === 1 ? 'día' : 'días'} sin contactar`
    : corridos === 0
      ? 'Contactado hoy'
      : corridos === 1
        ? 'Contactado ayer'
        : `${dias} días sin contacto`
  const ESTADOS = { activo: 'Activo', vencido: 'Vencido', archivo: 'Archivo', ganado: 'Ganado', perdido: 'Perdido' }
  const emails = [lead.email, ...(lead.emails_extra || [])].filter(Boolean)

  return (
    <View style={{ flex: 1, backgroundColor: c.fondo2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: top + 8, paddingHorizontal: 12, paddingBottom: 8 }}>
        <Presionable
          onPress={() => router.back()}
          accessibilityLabel="Volver"
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icono nombre="atras" color={c.texto} tamano={22} />
        </Presionable>
        <Texto peso="semi" tamano={17} style={{ flex: 1 }}>
          Lead
        </Texto>
        <Presionable
          onPress={() => guardar({ destacado: !lead.destacado })}
          disabled={!puedeEditar || guardando}
          accessibilityLabel={lead.destacado ? 'Quitar de destacados' : 'Marcar como destacado'}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icono
            nombre="estrella"
            tamano={22}
            color={lead.destacado ? c.ambarBorde : c.texto}
            relleno={lead.destacado ? c.ambarBorde : 'none'}
          />
        </Presionable>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: bottom + 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 4 }}>
          <Avatar nombre={lead.nombre} tamano={56} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Texto peso="negrita" tamano={22} numberOfLines={2} style={{ letterSpacing: -0.4 }}>
              {lead.nombre}
            </Texto>
            <Texto tamano={13} color={c.texto2} style={{ marginTop: 2 }}>
              Ingresó el {fechaCorta(lead.fecha_ingreso)}
              {lead.origen ? ` · ${lead.origen}` : ''}
            </Texto>
          </View>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 14 }}>
          <Pill
            texto={textoDias}
            fondo={urgente ? c.rojoFondo : c.fondo3}
            color={urgente ? c.rojoTexto : c.texto2}
            borde={urgente ? c.rojoBorde : c.borde}
          />
          <Pill texto={ESTADOS[lead.estado] || lead.estado} fondo={c.avatarFondo} color={c.urgenteAzul} borde={c.avatarFondo} />
          {lead.asesor_id !== userId && (
            <Pill texto={`De ${lead.asesor?.nombre || 'otro asesor'}`} fondo={c.ambarFondo} color={c.ambarTexto} borde={c.ambarBorde} />
          )}
        </View>

        <View style={{ marginTop: 16 }}>
          <BotonesContacto lead={lead} conEmail alto={68} />
        </View>

        <Bloque titulo="Consulta original">
          <Texto tamano={15} style={{ lineHeight: 22 }}>
            {lead.consulta ? `“${lead.consulta}”` : 'Sin consulta registrada.'}
          </Texto>
          {(lead.telefono || emails.length > 0) && (
            <Texto tamano={13} color={c.texto2} style={{ marginTop: 10 }}>
              {[lead.telefono, ...emails].filter(Boolean).join(' · ')}
            </Texto>
          )}
        </Bloque>

        <Bloque titulo="Nivel de interés">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {NIVELES.map((nivel) => {
              const elegido = lead.interes === nivel
              const [fondo, color, borde] = colorInteres(c, nivel)
              return (
                <Presionable
                  key={nivel}
                  disabled={!puedeEditar || guardando}
                  onPress={() => !elegido && guardar({ interes: nivel })}
                  style={{
                    borderRadius: 999,
                    borderWidth: 1,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    backgroundColor: elegido ? fondo : c.fondo,
                    borderColor: elegido ? borde : c.borde2,
                  }}
                >
                  <Texto peso={elegido ? 'semi' : 'media'} tamano={14} color={elegido ? color : c.texto}>
                    {etiquetaInteres[nivel]}
                  </Texto>
                </Presionable>
              )
            })}
          </View>
        </Bloque>

        {error && (
          <View
            style={{ backgroundColor: c.rojoFondo, borderColor: c.rojoBorde, borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 12 }}
          >
            <Texto tamano={13} color={c.rojoTexto}>
              {error}
            </Texto>
          </View>
        )}

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Bloque style={{ flex: 1 }}>
            <Texto tamano={12} color={c.texto2}>
              Último contacto
            </Texto>
            <Texto peso="semi" tamano={16} style={{ marginTop: 4 }}>
              {lead.ultimo_contacto ? fechaCorta(lead.ultimo_contacto) : 'Sin contactar'}
            </Texto>
          </Bloque>
          <Bloque style={{ flex: 1 }}>
            <Texto tamano={12} color={c.texto2}>
              Recordatorio
            </Texto>
            <Texto peso="semi" tamano={16} color={lead.recordatorio ? c.acento : c.texto3} style={{ marginTop: 4 }}>
              {lead.recordatorio ? cuando(lead.recordatorio) : 'Sin programar'}
            </Texto>
          </Bloque>
        </View>

        <Bloque titulo="Historial">
          {historial === null && <Texto color={c.texto3}>Cargando...</Texto>}
          {historial?.length === 0 && <Texto color={c.texto3}>Todavía no hay movimientos.</Texto>}
          {historial?.map((h, i) => (
            <View
              key={h.id}
              style={{ flexDirection: 'row', gap: 10, paddingVertical: 8, borderTopColor: c.borde, borderTopWidth: i ? 1 : 0 }}
            >
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c.borde3, marginTop: 7 }} />
              <View style={{ flex: 1 }}>
                <Texto tamano={14} style={{ lineHeight: 20 }}>
                  {h.texto}
                </Texto>
                <Texto tamano={12} color={c.texto3} style={{ marginTop: 2 }}>
                  {cuando(h.created_at)}
                  {h.autor?.nombre ? ` · ${h.autor.nombre}` : ''}
                </Texto>
              </View>
            </View>
          ))}
        </Bloque>
      </ScrollView>
    </View>
  )
}
