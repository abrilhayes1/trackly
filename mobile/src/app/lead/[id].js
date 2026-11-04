// Tarjeta del lead (RF42 / RF44): contactarlo (con plantillas), su consulta y emails, el nivel de
// interés, el seguimiento (último contacto y próximo recordatorio), el cierre y el historial.
// Abajo: "Agregar nota" y "Actualizar estado" (registrar contacto, ganado o perdido); si está
// vencido o archivado, "Reclamar" o "Reactivar".
import { useEffect, useState } from 'react'
import { ScrollView, View } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { colorInteres, useTema } from '../../lib/tema'
import { useSesion } from '../../lib/sesion'
import { apiFetch } from '../../lib/api'
import { confirmar } from '../../lib/confirmar'
import {
  completar,
  detalleCierre,
  diasDesde,
  etiquetaInteres,
  etiquetaProximo,
  fechaLocal,
  fechaProximoContacto,
  nombreEventos,
  sirvePara,
  tieneProximoPaso,
  valoresDe,
} from '../../lib/compartido'
import { cuando, fechaCorta } from '../../lib/fechas'
import Texto from '../../components/Texto'
import Presionable from '../../components/Presionable'
import Icono from '../../components/Icono'
import Avatar from '../../components/Avatar'
import Pill from '../../components/Pill'
import BotonesContacto from '../../components/BotonesContacto'
import Hoja from '../../components/Hoja'
import ActualizarEstado from '../../components/ActualizarEstado'
import CharlasLead from '../../components/CharlasLead'
import ElegirFechaHora, { HORA_VALIDA } from '../../components/ElegirFechaHora'
import { Aviso, Boton, Campo, Chip } from '../../components/Formulario'

const NIVELES = Object.keys(etiquetaInteres)
const ESTADOS = { activo: 'Activo', vencido: 'Vencido', archivo: 'Archivo', ganado: 'Ganado', perdido: 'Perdido' }

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
  const { buscarLead, actualizarLead, perfil, userId, config, preferencias, recargar } = useSesion()
  const lead = buscarLead(id)
  const [historial, setHistorial] = useState(null)
  const [plantillas, setPlantillas] = useState([])
  const [plantillaId, setPlantillaId] = useState(null)
  const [emailDestino, setEmailDestino] = useState(null)
  const [cierre, setCierre] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)
  const [hoja, setHoja] = useState(null) // 'estado' | 'nota' | 'recordatorio' | 'email'
  const [nota, setNota] = useState('')
  const [nuevoEmail, setNuevoEmail] = useState('')
  const [recFecha, setRecFecha] = useState(fechaLocal())
  const [recHora, setRecHora] = useState('')
  const [sinProximoOk, setSinProximoOk] = useState(false)

  const cargarHistorial = () =>
    apiFetch(`/api/leads/${id}/historial`)
      .then(setHistorial)
      .catch(() => setHistorial([]))

  useEffect(() => {
    apiFetch(`/api/leads/${id}/historial`)
      .then(setHistorial)
      .catch(() => setHistorial([]))
    apiFetch('/api/plantillas')
      .then(setPlantillas)
      .catch(() => setPlantillas([]))
  }, [id])

  const estado = lead?.estado
  useEffect(() => {
    if (estado !== 'ganado' && estado !== 'perdido') return setCierre(null)
    apiFetch(`/api/cierres/${id}`)
      .then(setCierre)
      .catch(() => setCierre(null))
  }, [id, estado])

  if (!lead) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.fondo2 }}>
        <Texto color={c.texto2}>No encontramos este lead.</Texto>
      </View>
    )
  }

  // el líder edita cualquiera; el asesor, los suyos mientras estén activos
  const esLider = perfil?.rol === 'lider'
  const puedeEditar = esLider || (lead.asesor_id === userId && lead.estado === 'activo')

  async function guardar(cambios, despues) {
    setGuardando(true)
    setError(null)
    try {
      const { advertencia, ...datos } = await apiFetch(`/api/leads/${lead.id}`, { method: 'PATCH', body: JSON.stringify(cambios) })
      actualizarLead(lead.id, datos)
      if (advertencia) setError(advertencia)
      cargarHistorial()
      despues?.()
      return true
    } catch (e) {
      setError(e.message)
      return false
    } finally {
      setGuardando(false)
    }
  }

  async function agregarNota(cerrar) {
    const texto = nota.trim()
    if (!texto) return
    setGuardando(true)
    setError(null)
    try {
      const nueva = await apiFetch(`/api/leads/${lead.id}/historial`, { method: 'POST', body: JSON.stringify({ texto }) })
      setHistorial((actual) => [nueva, ...(actual || [])])
      setNota('')
      cerrar()
    } catch (e) {
      setError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  // reclamar un vencido o reactivar un archivado: pasa a ser tuyo y vuelve a activo
  async function tomar() {
    const vencido = lead.estado === 'vencido'
    if (vencido && !(await confirmar('¿Reclamar este lead?', 'Pasa a ser tuyo y vuelve a estar activo.', 'Reclamar'))) return
    setGuardando(true)
    setError(null)
    try {
      const datos = await apiFetch(`/api/leads/${lead.id}/${vencido ? 'reclamar' : 'reactivar'}`, { method: 'POST' })
      actualizarLead(lead.id, datos)
      recargar()
      cargarHistorial()
    } catch (e) {
      setError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  const emails = [lead.email, ...(lead.emails_extra || [])].filter(Boolean)
  const destino = emails.includes(emailDestino) ? emailDestino : emails[0]

  async function agregarEmail(cerrar) {
    const email = nuevoEmail.trim().toLowerCase()
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return setError('Ese email no es válido.')
    if (emails.includes(email)) return cerrar()
    const ok = await guardar(lead.email ? { emails_extra: [...(lead.emails_extra || []), email] } : { email })
    if (ok) {
      setNuevoEmail('')
      cerrar()
    }
  }

  async function quitarEmail(email) {
    if (!(await confirmar(`¿Quitar ${email}?`, 'Se saca de este contacto.', 'Quitar'))) return
    const resto = emails.filter((x) => x !== email)
    guardar({ email: resto[0] ?? null, emails_extra: resto.slice(1) })
  }

  async function guardarRecordatorio(cerrar) {
    if (!HORA_VALIDA.test(recHora)) return setError('Elegí la hora (por ejemplo 17:30).')
    const [a, m, d] = recFecha.split('-').map(Number)
    const [h, mi] = recHora.split(':').map(Number)
    if (await guardar({ recordatorio: new Date(a, m - 1, d, h, mi).toISOString() })) cerrar()
  }

  function abrirRecordatorio() {
    if (!puedeEditar) return
    const r = lead.recordatorio ? new Date(lead.recordatorio) : null
    setRecFecha(fechaLocal(r || new Date()))
    setRecHora(
      r ? `${String(r.getHours()).padStart(2, '0')}:${String(r.getMinutes()).padStart(2, '0')}` : preferencias.horaRecordatorios || '',
    )
    setError(null)
    setHoja('recordatorio')
  }

  const habiles = !!config?.dias_habiles
  const dias = diasDesde(lead.ultimo_contacto || lead.fecha_ingreso, habiles)
  const corridos = diasDesde(lead.ultimo_contacto || lead.fecha_ingreso)
  const plazo = config?.vencimiento_habilitado ? config.dias_vencimiento_lead : null
  const urgente = lead.estado === 'activo' && plazo && dias >= plazo - (config.dias_alerta_previa || 0)
  const textoDias = !lead.ultimo_contacto
    ? corridos === 0
      ? 'Ingresó hoy'
      : `${dias} ${dias === 1 ? 'día' : 'días'} sin contactar`
    : corridos === 0
      ? 'Contactado hoy'
      : corridos === 1
        ? 'Contactado ayer'
        : `${dias} ${habiles ? 'días hábiles' : 'días'} sin contacto`
  const plantilla = plantillas.find((p) => p.id === plantillaId)
  const valores = valoresDe(lead, { miNombre: perfil?.nombre, equipo: perfil?.tenants?.nombre })
  const mensaje = plantilla ? { texto: completar(plantilla.texto, valores), asunto: completar(plantilla.asunto || '', valores) } : null
  const sinProximo = puedeEditar && lead.estado === 'activo' && lead.ultimo_contacto && !tieneProximoPaso(lead) && !sinProximoOk
  const [estadoFondo, estadoTexto] = {
    ganado: [c.verdeFondo, c.verdeTexto],
    perdido: [c.rojoFondo, c.rojoTexto],
    vencido: [c.fondo3, c.texto],
    archivo: [c.fondo3, c.texto2],
  }[lead.estado] || [c.avatarFondo, c.urgenteAzul]
  const puedeTomar = lead.estado === 'vencido' || lead.estado === 'archivo'

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

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}>
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
          {lead.estado === 'activo' && (
            <Pill
              texto={textoDias}
              fondo={urgente ? c.rojoFondo : c.fondo3}
              color={urgente ? c.rojoTexto : c.texto2}
              borde={urgente ? c.rojoBorde : c.borde}
            />
          )}
          <Pill texto={ESTADOS[lead.estado] || lead.estado} fondo={estadoFondo} color={estadoTexto} borde={estadoFondo} />
          {lead.asesor_id !== userId && (
            <Pill
              texto={lead.asesor_id ? `De ${lead.asesor?.nombre || 'otro asesor'}` : 'Sin asignar'}
              fondo={c.ambarFondo}
              color={c.ambarTexto}
              borde={c.ambarBorde}
            />
          )}
        </View>

        {plantillas.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginHorizontal: -20, marginTop: 16 }}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
          >
            <Chip texto="Sin plantilla" elegido={!plantillaId} onPress={() => setPlantillaId(null)} />
            {plantillas.map((p) => (
              <Chip
                key={p.id}
                texto={p.nombre}
                elegido={plantillaId === p.id}
                onPress={() => setPlantillaId(plantillaId === p.id ? null : p.id)}
              />
            ))}
          </ScrollView>
        )}
        {mensaje && (
          <View style={{ backgroundColor: c.fondo, borderColor: c.borde, borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 10 }}>
            {!!mensaje.asunto && sirvePara(plantilla, 'email') && (
              <Texto peso="semi" tamano={13} style={{ marginBottom: 4 }}>
                {mensaje.asunto}
              </Texto>
            )}
            <Texto tamano={13} color={c.texto2} style={{ lineHeight: 19 }}>
              {mensaje.texto}
            </Texto>
          </View>
        )}
        {emails.length > 1 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
            {emails.map((e) => (
              <Chip key={e} texto={`Correo a ${e}`} elegido={destino === e} onPress={() => setEmailDestino(e)} />
            ))}
          </View>
        )}
        <View style={{ marginTop: 12 }}>
          <BotonesContacto lead={lead} conEmail alto={68} mensaje={mensaje} email={destino} />
        </View>

        <Bloque titulo="Consulta original">
          <Texto tamano={15} style={{ lineHeight: 22 }}>
            {lead.consulta ? `“${lead.consulta}”` : 'Sin consulta registrada.'}
          </Texto>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
            {!!lead.telefono && <Pill texto={lead.telefono} fondo={c.fondo2} color={c.texto2} borde={c.borde} />}
            {emails.map((e) => (
              <Presionable
                key={e}
                disabled={!puedeEditar}
                onPress={() => quitarEmail(e)}
                accessibilityLabel={`Quitar ${e}`}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: c.borde,
                  backgroundColor: c.fondo2,
                  paddingLeft: 8,
                  paddingRight: puedeEditar ? 6 : 8,
                  paddingVertical: 2,
                }}
              >
                <Texto tamano={11} peso="media" color={c.texto2}>
                  {e}
                </Texto>
                {puedeEditar && <Icono nombre="cerrar" tamano={11} color={c.texto3} />}
              </Presionable>
            ))}
            {puedeEditar && (
              <Presionable
                onPress={() => {
                  setNuevoEmail('')
                  setError(null)
                  setHoja('email')
                }}
                style={{
                  borderRadius: 999,
                  borderWidth: 1,
                  borderStyle: 'dashed',
                  borderColor: c.borde3,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                }}
              >
                <Texto tamano={11} peso="media" color={c.texto2}>
                  + email
                </Texto>
              </Presionable>
            )}
          </View>
        </Bloque>

        <Bloque titulo="Nivel de interés">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {NIVELES.map((nivel) => (
              <Chip
                key={nivel}
                texto={etiquetaInteres[nivel]}
                elegido={lead.interes === nivel}
                colores={colorInteres(c, nivel)}
                disabled={!puedeEditar || guardando}
                onPress={() => lead.interes !== nivel && guardar({ interes: nivel })}
              />
            ))}
          </View>
        </Bloque>

        {!hoja && <Aviso texto={error} />}

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Bloque style={{ flex: 1 }}>
            <Texto tamano={12} color={c.texto2}>
              Último contacto
            </Texto>
            <Texto peso="semi" tamano={16} style={{ marginTop: 4 }}>
              {lead.ultimo_contacto ? fechaCorta(lead.ultimo_contacto) : 'Sin contactar'}
            </Texto>
          </Bloque>
          <Presionable escala={0.98} disabled={!puedeEditar} onPress={abrirRecordatorio} style={{ flex: 1 }}>
            <Bloque>
              <Texto tamano={12} color={c.texto2}>
                Recordatorio
              </Texto>
              <Texto peso="semi" tamano={16} color={lead.recordatorio ? c.acento : c.texto3} style={{ marginTop: 4 }}>
                {lead.recordatorio ? cuando(lead.recordatorio) : puedeEditar ? 'Programar' : 'Sin programar'}
              </Texto>
            </Bloque>
          </Presionable>
        </View>

        {sinProximo && (
          <View
            style={{
              backgroundColor: c.violetaFondo,
              borderColor: c.violetaBorde,
              borderWidth: 1,
              borderRadius: 14,
              padding: 14,
              marginTop: 12,
            }}
          >
            <Texto peso="semi" tamano={14} color={c.violetaTexto} style={{ marginBottom: 10 }}>
              Sin próximo contacto programado
            </Texto>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {preferencias.proximosDias.map((d) => (
                <Chip
                  key={d}
                  texto={etiquetaProximo(d)}
                  disabled={guardando}
                  onPress={() => guardar({ recordatorio: fechaProximoContacto(d, new Date(), preferencias.horaRecordatorios) })}
                />
              ))}
              <Chip texto="Elegir fecha" onPress={abrirRecordatorio} />
              <Presionable onPress={() => setSinProximoOk(true)} style={{ paddingHorizontal: 8, paddingVertical: 8 }}>
                <Texto tamano={14} color={c.texto2}>
                  No hace falta
                </Texto>
              </Presionable>
            </View>
          </View>
        )}

        {config?.eventos_habilitado && (
          <Bloque titulo={nombreEventos(config?.termino_evento)}>
            <CharlasLead lead={lead} puedeEditar={puedeEditar} onCambio={cargarHistorial} />
          </Bloque>
        )}

        {(lead.estado === 'ganado' || lead.estado === 'perdido') && cierre && (
          <Bloque titulo="Cierre">
            {lead.estado === 'perdido' ? (
              <Texto tamano={15}>{cierre.motivo ? `Motivo: ${cierre.motivo}` : 'Sin motivo registrado.'}</Texto>
            ) : (
              detalleCierre(config?.campos_cierre, cierre.datos).map((d) => (
                <View key={d.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                  <Texto tamano={14} color={c.texto2}>
                    {d.nombre || 'Otro dato'}
                  </Texto>
                  <Texto peso="semi" tamano={14}>
                    {d.texto}
                  </Texto>
                </View>
              ))
            )}
          </Bloque>
        )}

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

      {(puedeEditar || puedeTomar) && (
        <View
          style={{
            flexDirection: 'row',
            gap: 10,
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: bottom + 12,
            borderTopColor: c.borde,
            borderTopWidth: 1,
            backgroundColor: c.fondo,
          }}
        >
          {puedeTomar ? (
            <Boton texto={lead.estado === 'vencido' ? 'Reclamar lead' : 'Reactivar lead'} onPress={tomar} disabled={guardando} />
          ) : (
            <>
              <Boton
                texto="Agregar nota"
                tipo="secundario"
                onPress={() => {
                  setError(null)
                  setHoja('nota')
                }}
              />
              {lead.estado === 'activo' && <Boton texto="Actualizar estado" onPress={() => setHoja('estado')} />}
            </>
          )}
        </View>
      )}

      <ActualizarEstado
        lead={lead}
        visible={hoja === 'estado'}
        onCerrar={() => setHoja(null)}
        onListo={(cambios) => {
          actualizarLead(lead.id, cambios)
          cargarHistorial()
          if (cambios.estado) recargar()
        }}
      />

      <Hoja
        visible={hoja === 'nota'}
        onCerrar={() => setHoja(null)}
        titulo="Agregar nota"
        subtitulo={lead.nombre}
        pie={(cerrar) => (
          <Boton
            texto={guardando ? 'Guardando...' : 'Guardar nota'}
            disabled={guardando || !nota.trim()}
            onPress={() => agregarNota(cerrar)}
          />
        )}
      >
        <Campo
          multiline
          value={nota}
          onChangeText={setNota}
          placeholder="Ej: le mandé la info de cuotas, me contesta el viernes"
          autoFocus
        />
        <Aviso texto={error} />
      </Hoja>

      <Hoja
        visible={hoja === 'recordatorio'}
        onCerrar={() => setHoja(null)}
        titulo="Próximo contacto"
        subtitulo={lead.nombre}
        pie={(cerrar) => (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {lead.recordatorio && (
              <Boton texto="Quitar" tipo="secundario" disabled={guardando} onPress={() => guardar({ recordatorio: null }, cerrar)} />
            )}
            <Boton texto={guardando ? 'Guardando...' : 'Guardar'} disabled={guardando} onPress={() => guardarRecordatorio(cerrar)} />
          </View>
        )}
      >
        <ElegirFechaHora fecha={recFecha} hora={recHora} onFecha={setRecFecha} onHora={setRecHora} />
        <Aviso texto={error} />
      </Hoja>

      <Hoja
        visible={hoja === 'email'}
        onCerrar={() => setHoja(null)}
        titulo="Agregar email"
        subtitulo={lead.nombre}
        pie={(cerrar) => (
          <Boton
            texto={guardando ? 'Guardando...' : 'Agregar'}
            disabled={guardando || !nuevoEmail.trim()}
            onPress={() => agregarEmail(cerrar)}
          />
        )}
      >
        <Campo
          value={nuevoEmail}
          onChangeText={setNuevoEmail}
          placeholder="otro@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
        />
        <Aviso texto={error} />
      </Hoja>
    </View>
  )
}
