// Configuración del equipo (solo el líder): lo mismo que en la web. Nombre y rubro, cómo se llaman
// los contactos, vencimiento, categorías de origen, eventos, campos del cierre ganado, motivos de
// pérdida, email diario, y los miembros e invitaciones.
import { useEffect, useState } from 'react'
import { ScrollView, Switch, View } from 'react-native'
import { useTema } from '../lib/tema'
import { useSesion } from '../lib/sesion'
import { apiFetch } from '../lib/api'
import { confirmar } from '../lib/confirmar'
import { CONTACTOS, EMAIL_VALIDO, PLAZOS, RUBROS, TIPOS_CAMPO, errorVencimiento, nuevoIdCampo } from '../lib/compartido'
import Texto from '../components/Texto'
import Presionable from '../components/Presionable'
import Encabezado from '../components/Encabezado'
import Avatar from '../components/Avatar'
import Icono from '../components/Icono'
import ListaEditable from '../components/ListaEditable'
import { Aviso, Boton, Campo, Chip, Etiqueta } from '../components/Formulario'

function Tarjeta({ titulo, children }) {
  const { c } = useTema()
  return (
    <View style={{ backgroundColor: c.fondo, borderColor: c.borde, borderWidth: 1, borderRadius: 16, padding: 16, marginTop: 12 }}>
      <Texto peso="semi" tamano={16} style={{ marginBottom: 12 }}>
        {titulo}
      </Texto>
      {children}
    </View>
  )
}

function Interruptor({ texto, valor, onCambio }) {
  const { c } = useTema()
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 }}>
      <Texto tamano={15} style={{ flex: 1 }}>
        {texto}
      </Texto>
      <Switch
        value={valor}
        onValueChange={onCambio}
        trackColor={{ true: c.acento, false: c.borde2 }}
        thumbColor="#fff"
        activeThumbColor="#fff"
      />
    </View>
  )
}

const numero = (v) => (v === '' ? '' : Number.parseInt(v, 10))

function desdeConfig(config, nombreEquipo) {
  return {
    equipoNombre: nombreEquipo || '',
    rubro: config.rubro || '',
    terminoContacto: config.termino_contacto || 'Lead',
    terminoContactoPlural: config.termino_contacto_plural || 'Leads',
    vencimientoHabilitado: !!config.vencimiento_habilitado,
    diasVencimiento: config.dias_vencimiento_lead ?? 14,
    diasAlertaPrevia: config.dias_alerta_previa ?? 3,
    diasArchivo: config.dias_archivo ?? 30,
    categoriasOrigen: config.categorias_origen || [],
    eventosHabilitado: !!config.eventos_habilitado,
    terminoEvento: config.termino_evento || 'Charla informativa',
    emailDiario: config.email_diario !== false,
    camposCierre: (config.campos_cierre || []).map((x) => ({ ...x, opciones: x.opciones || [] })),
    motivosPerdida: config.motivos_perdida || [],
    diasHabiles: !!config.dias_habiles,
  }
}

function errorFormulario(f) {
  if (!f.equipoNombre.trim()) return 'Ingresá el nombre del equipo.'
  if (!f.rubro) return 'Elegí el rubro del equipo.'
  if (!f.terminoContacto.trim() || !f.terminoContactoPlural.trim()) return 'Indicá cómo se llaman tus contactos, en singular y en plural.'
  if (f.eventosHabilitado && !f.terminoEvento.trim()) return 'Indicá cómo se llaman tus eventos.'
  const nombres = f.camposCierre.map((x) => x.nombre.trim().toLowerCase())
  if (nombres.some((n) => !n)) return 'Cada campo del cierre necesita un nombre.'
  if (new Set(nombres).size !== nombres.length) return 'Hay dos campos del cierre con el mismo nombre.'
  const listaVacia = f.camposCierre.find((x) => x.tipo === 'lista' && !x.opciones.length)
  if (listaVacia) return `El campo "${listaVacia.nombre}" es una lista: cargale al menos una opción.`
  return errorVencimiento(f)
}

export default function Configuracion() {
  const { c } = useTema()
  const { config, perfil, recargar } = useSesion()
  const [f, setF] = useState(null)
  const [equipo, setEquipo] = useState(null)
  const [invitar, setInvitar] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [aviso, setAviso] = useState(null)
  const [avisoEquipo, setAvisoEquipo] = useState(null)
  const cambiar = (x) => setF((actual) => ({ ...actual, ...x }))

  useEffect(() => {
    if (config && !f) setF(desdeConfig(config, perfil?.tenants?.nombre))
  }, [config, perfil, f])

  const cargarEquipo = () =>
    apiFetch('/api/config/equipo')
      .then(setEquipo)
      .catch((e) => setAvisoEquipo({ tipo: 'error', texto: e.message }))
  useEffect(() => {
    cargarEquipo()
  }, [])

  if (perfil?.rol !== 'lider') {
    return (
      <View style={{ flex: 1, backgroundColor: c.fondo2 }}>
        <Encabezado titulo="Configuración" />
        <Texto color={c.texto2} style={{ padding: 20 }}>
          Solo el líder del equipo puede ver y cambiar la configuración.
        </Texto>
      </View>
    )
  }
  if (!f) return <View style={{ flex: 1, backgroundColor: c.fondo2 }} />

  async function guardar() {
    const error = errorFormulario(f)
    if (error) return setAviso({ tipo: 'error', texto: error })
    setGuardando(true)
    setAviso(null)
    try {
      const camposCierre = f.camposCierre.map((x) => ({
        id: x.id,
        nombre: x.nombre.trim(),
        tipo: x.tipo,
        obligatorio: !!x.obligatorio,
        ...(x.tipo === 'lista' ? { opciones: x.opciones } : {}),
      }))
      await apiFetch('/api/config', { method: 'PUT', body: JSON.stringify({ ...f, camposCierre }) })
      await recargar()
      setAviso({ tipo: 'ok', texto: 'Listo, se guardaron los cambios.' })
    } catch (e) {
      setAviso({ tipo: 'error', texto: e.message })
    } finally {
      setGuardando(false)
    }
  }

  async function mandarInvitacion() {
    const email = invitar.trim().toLowerCase()
    if (!EMAIL_VALIDO.test(email)) return setAvisoEquipo({ tipo: 'error', texto: 'Ese email no es válido.' })
    try {
      const { agregadas } = await apiFetch('/api/config/invitaciones', { method: 'POST', body: JSON.stringify({ emails: [email] }) })
      setAvisoEquipo({
        tipo: 'ok',
        texto: agregadas
          ? 'Listo: entra solo al equipo cuando cree su cuenta con ese email.'
          : 'Ese email ya estaba invitado o ya es parte del equipo.',
      })
      setInvitar('')
      cargarEquipo()
    } catch (e) {
      setAvisoEquipo({ tipo: 'error', texto: e.message })
    }
  }

  async function cancelarInvitacion(inv) {
    if (!(await confirmar(`¿Cancelar la invitación a ${inv.email}?`, null, 'Cancelar invitación'))) return
    try {
      await apiFetch(`/api/config/invitaciones/${inv.id}`, { method: 'DELETE' })
      cargarEquipo()
    } catch (e) {
      setAvisoEquipo({ tipo: 'error', texto: e.message })
    }
  }

  const campo = (i, x) => setF((actual) => ({ ...actual, camposCierre: actual.camposCierre.map((y, j) => (j === i ? { ...y, ...x } : y)) }))

  return (
    <View style={{ flex: 1, backgroundColor: c.fondo2 }}>
      <Encabezado titulo="Configuración" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        <Tarjeta titulo="Equipo">
          <Etiqueta>Nombre del equipo</Etiqueta>
          <Campo value={f.equipoNombre} onChangeText={(v) => cambiar({ equipoNombre: v })} maxLength={80} />
          <Etiqueta style={{ marginTop: 14 }}>Rubro</Etiqueta>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {RUBROS.map((r) => (
              <Chip
                key={r.valor}
                texto={`${r.icono} ${r.label}`}
                elegido={f.rubro === r.valor}
                onPress={() => cambiar({ rubro: r.valor })}
              />
            ))}
          </View>
          <Etiqueta style={{ marginTop: 14 }}>Cómo se llaman tus contactos</Etiqueta>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
            {CONTACTOS.map((x) => (
              <Chip
                key={x.uno}
                texto={x.uno}
                elegido={f.terminoContacto === x.uno}
                onPress={() => cambiar({ terminoContacto: x.uno, terminoContactoPlural: x.varios })}
              />
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Campo
              value={f.terminoContacto}
              onChangeText={(v) => cambiar({ terminoContacto: v })}
              placeholder="Singular"
              style={{ flex: 1 }}
              maxLength={30}
            />
            <Campo
              value={f.terminoContactoPlural}
              onChangeText={(v) => cambiar({ terminoContactoPlural: v })}
              placeholder="Plural"
              style={{ flex: 1 }}
              maxLength={30}
            />
          </View>
        </Tarjeta>

        <Tarjeta titulo="Vencimiento">
          <Interruptor
            texto="Los contactos vencen si no se los contacta"
            valor={f.vencimientoHabilitado}
            onCambio={(v) => cambiar({ vencimientoHabilitado: v })}
          />
          {f.vencimientoHabilitado && (
            <>
              <Etiqueta style={{ marginTop: 12 }}>Vencen a los (días sin contacto)</Etiqueta>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                {PLAZOS.map((d) => (
                  <Chip key={d} texto={String(d)} elegido={f.diasVencimiento === d} onPress={() => cambiar({ diasVencimiento: d })} />
                ))}
                <Campo
                  value={String(f.diasVencimiento)}
                  onChangeText={(v) => cambiar({ diasVencimiento: numero(v) })}
                  keyboardType="number-pad"
                  style={{ width: 80, textAlign: 'center' }}
                />
              </View>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
                <View style={{ flex: 1 }}>
                  <Etiqueta>Avisar antes (días)</Etiqueta>
                  <Campo
                    value={String(f.diasAlertaPrevia)}
                    onChangeText={(v) => cambiar({ diasAlertaPrevia: numero(v) })}
                    keyboardType="number-pad"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Etiqueta>Pasan a Archivo a los</Etiqueta>
                  <Campo
                    value={String(f.diasArchivo)}
                    onChangeText={(v) => cambiar({ diasArchivo: numero(v) })}
                    keyboardType="number-pad"
                  />
                </View>
              </View>
            </>
          )}
          <View style={{ marginTop: 8 }}>
            <Interruptor
              texto="Contar solo días hábiles (lunes a viernes)"
              valor={f.diasHabiles}
              onCambio={(v) => cambiar({ diasHabiles: v })}
            />
          </View>
        </Tarjeta>

        <Tarjeta titulo="Categorías de origen">
          <ListaEditable
            valores={f.categoriasOrigen}
            onCambio={(v) => cambiar({ categoriasOrigen: v })}
            placeholder="Agregar: Instagram, Web, Referido..."
          />
        </Tarjeta>

        <Tarjeta titulo="Eventos">
          <Interruptor
            texto="El equipo organiza eventos (charlas, webinars...)"
            valor={f.eventosHabilitado}
            onCambio={(v) => cambiar({ eventosHabilitado: v })}
          />
          {f.eventosHabilitado && (
            <>
              <Etiqueta style={{ marginTop: 12 }}>Cómo se llaman</Etiqueta>
              <Campo value={f.terminoEvento} onChangeText={(v) => cambiar({ terminoEvento: v })} maxLength={40} />
            </>
          )}
        </Tarjeta>

        <Tarjeta titulo="Cierre ganado">
          {f.camposCierre.map((x, i) => (
            <View key={x.id} style={{ borderColor: c.borde, borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <Campo value={x.nombre} onChangeText={(v) => campo(i, { nombre: v })} placeholder="Nombre del campo" style={{ flex: 1 }} />
                <Presionable
                  onPress={() => cambiar({ camposCierre: f.camposCierre.filter((_, j) => j !== i) })}
                  accessibilityLabel="Quitar campo"
                  style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Icono nombre="cerrar" tamano={18} color={c.texto3} />
                </Presionable>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                {TIPOS_CAMPO.map((t) => (
                  <Chip key={t.valor} texto={t.etiqueta} elegido={x.tipo === t.valor} onPress={() => campo(i, { tipo: t.valor })} />
                ))}
                <Chip texto="Obligatorio" elegido={!!x.obligatorio} onPress={() => campo(i, { obligatorio: !x.obligatorio })} />
              </View>
              {x.tipo === 'lista' && (
                <View style={{ marginTop: 10 }}>
                  <ListaEditable valores={x.opciones} onCambio={(v) => campo(i, { opciones: v })} placeholder="Agregar opción" />
                </View>
              )}
            </View>
          ))}
          <Presionable
            onPress={() =>
              cambiar({
                camposCierre: [...f.camposCierre, { id: nuevoIdCampo(), nombre: '', tipo: 'texto', obligatorio: false, opciones: [] }],
              })
            }
          >
            <Texto peso="semi" tamano={14} color={c.acento}>
              + Agregar campo
            </Texto>
          </Presionable>
        </Tarjeta>

        <Tarjeta titulo="Cierre perdido">
          <Etiqueta>Motivos que se ofrecen al cerrar como perdido</Etiqueta>
          <ListaEditable
            valores={f.motivosPerdida}
            onCambio={(v) => cambiar({ motivosPerdida: v })}
            placeholder="Agregar motivo"
            maximo={20}
          />
        </Tarjeta>

        <Tarjeta titulo="Email diario">
          <Interruptor texto="Mandar el resumen del día a las 8:00" valor={f.emailDiario} onCambio={(v) => cambiar({ emailDiario: v })} />
        </Tarjeta>

        {aviso && <Aviso texto={aviso.texto} tipo={aviso.tipo} />}
        <Boton texto={guardando ? 'Guardando...' : 'Guardar cambios'} disabled={guardando} onPress={guardar} style={{ marginTop: 14 }} />

        <Tarjeta titulo="Miembros del equipo">
          {equipo?.miembros.map((m) => (
            <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}>
              <Avatar nombre={m.nombre} foto={m.avatar_url} tamano={34} />
              <Texto tamano={15} style={{ flex: 1 }}>
                {m.nombre}
              </Texto>
              <Texto tamano={13} color={c.texto2}>
                {m.rol === 'lider' ? 'Líder' : 'Asesor'}
              </Texto>
            </View>
          ))}
          {equipo?.invitaciones.length > 0 && <Etiqueta style={{ marginTop: 12 }}>Invitaciones pendientes</Etiqueta>}
          {equipo?.invitaciones.map((inv) => (
            <View key={inv.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 }}>
              <Texto tamano={14} style={{ flex: 1 }} numberOfLines={1}>
                {inv.email}
              </Texto>
              <Presionable onPress={() => cancelarInvitacion(inv)}>
                <Texto peso="media" tamano={13} color={c.urgenteRojo}>
                  Cancelar
                </Texto>
              </Presionable>
            </View>
          ))}
          <Etiqueta style={{ marginTop: 12 }}>Invitar por email</Etiqueta>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Campo
              value={invitar}
              onChangeText={setInvitar}
              placeholder="nombre@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              style={{ flex: 1 }}
            />
            <Boton texto="Invitar" onPress={mandarInvitacion} style={{ paddingHorizontal: 18 }} />
          </View>
          {avisoEquipo && <Aviso texto={avisoEquipo.texto} tipo={avisoEquipo.tipo} />}
        </Tarjeta>
      </ScrollView>
    </View>
  )
}
