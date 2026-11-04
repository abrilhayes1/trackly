// Mi perfil: foto y nombre (los ve todo el equipo), mis números, contraseña, preferencias del
// celular (botones del próximo contacto, hora de los recordatorios, tema) y cerrar sesión.
import { useEffect, useState } from 'react'
import { ScrollView, View } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'
import { useTema } from '../lib/tema'
import { useSesion } from '../lib/sesion'
import { supabase } from '../lib/supabase'
import { apiFetch } from '../lib/api'
import { confirmar } from '../lib/confirmar'
import { etiquetaProximo } from '../lib/compartido'
import Texto from '../components/Texto'
import Presionable from '../components/Presionable'
import Avatar from '../components/Avatar'
import Encabezado from '../components/Encabezado'
import Indicador from '../components/Indicador'
import { HORA_VALIDA } from '../components/ElegirFechaHora'
import { Aviso, Boton, Campo, Chip, Etiqueta } from '../components/Formulario'

const OPCIONES_DIAS = [1, 2, 3, 5, 7, 14, 30]

function Tarjeta({ titulo, children }) {
  const { c } = useTema()
  return (
    <View style={{ backgroundColor: c.fondo, borderColor: c.borde, borderWidth: 1, borderRadius: 16, padding: 16, marginTop: 12 }}>
      {titulo && (
        <Texto peso="semi" tamano={16} style={{ marginBottom: 12 }}>
          {titulo}
        </Texto>
      )}
      {children}
    </View>
  )
}

export default function Perfil() {
  const { c } = useTema()
  const { perfil, sesion, leads, userId, cerrarSesion, recargar, preferencias, cambiarPreferencias } = useSesion()
  const [nombre, setNombre] = useState(perfil?.nombre || '')
  const [totales, setTotales] = useState(null)
  const [clave, setClave] = useState('')
  const [clave2, setClave2] = useState('')
  const [hora, setHora] = useState(preferencias.horaRecordatorios || '')
  const [aviso, setAviso] = useState(null) // { donde, tipo, texto }
  const [ocupado, setOcupado] = useState(null)
  const conEmail = (sesion?.user?.app_metadata?.providers || []).includes('email')

  useEffect(() => {
    apiFetch('/api/leads/totales')
      .then(setTotales)
      .catch(() => {})
  }, [])

  const mostrar = (donde, tipo, texto) => setAviso({ donde, tipo, texto })
  const avisoDe = (donde) => aviso?.donde === donde && <Aviso texto={aviso.texto} tipo={aviso.tipo} />

  async function cambiarFoto() {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permiso.granted) return mostrar('foto', 'error', 'Necesitamos permiso para ver tus fotos.')
    const elegida = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 1 })
    if (elegida.canceled) return
    setOcupado('foto')
    try {
      // achicada a 512 px para que suba rápido (el servidor acepta hasta 1 MB)
      const imagen = await ImageManipulator.manipulate(elegida.assets[0].uri).resize({ width: 512 }).renderAsync()
      const guardada = await imagen.saveAsync({ compress: 0.8, format: SaveFormat.JPEG })
      const archivo = await (await fetch(guardada.uri)).blob()
      await apiFetch('/api/me/foto', { method: 'PUT', body: archivo, headers: { 'Content-Type': 'image/jpeg' } })
      await recargar()
      mostrar('foto', 'ok', 'Listo, cambió tu foto.')
    } catch (e) {
      mostrar('foto', 'error', e.message)
    } finally {
      setOcupado(null)
    }
  }

  async function quitarFoto() {
    if (!(await confirmar('¿Quitar tu foto?', 'Se van a ver tus iniciales.', 'Quitar'))) return
    setOcupado('foto')
    try {
      await apiFetch('/api/me/foto', { method: 'DELETE' })
      await recargar()
    } catch (e) {
      mostrar('foto', 'error', e.message)
    } finally {
      setOcupado(null)
    }
  }

  async function guardarNombre() {
    setOcupado('nombre')
    try {
      await apiFetch('/api/me', { method: 'PATCH', body: JSON.stringify({ nombre: nombre.trim() }) })
      await recargar()
      mostrar('nombre', 'ok', 'Listo, cambió tu nombre.')
    } catch (e) {
      mostrar('nombre', 'error', e.message)
    } finally {
      setOcupado(null)
    }
  }

  async function guardarClave() {
    if (clave.length < 6) return mostrar('clave', 'error', 'La contraseña tiene que tener al menos 6 caracteres.')
    if (clave !== clave2) return mostrar('clave', 'error', 'Las dos contraseñas no coinciden.')
    setOcupado('clave')
    const { error } = await supabase.auth.updateUser({ password: clave })
    setOcupado(null)
    if (error) return mostrar('clave', 'error', error.message)
    setClave('')
    setClave2('')
    mostrar('clave', 'ok', 'Listo, tu contraseña cambió.')
  }

  // botones del próximo contacto: entre 1 y 4, en orden
  function alternarDia(d) {
    const actuales = preferencias.proximosDias
    const nuevos = actuales.includes(d) ? actuales.filter((x) => x !== d) : [...actuales, d].sort((a, b) => a - b)
    if (nuevos.length === 0 || nuevos.length > 4) return
    cambiarPreferencias({ proximosDias: nuevos })
  }

  const mios = leads.filter((l) => l.asesor_id === userId && l.estado === 'activo')
  const contactados = mios.filter((l) => l.ultimo_contacto).length
  const cerrados = totales ? totales.ganados + totales.perdidos : 0

  return (
    <View style={{ flex: 1, backgroundColor: c.fondo2 }}>
      <Encabezado titulo="Mi perfil" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
        <Tarjeta>
          <View style={{ alignItems: 'center' }}>
            <Avatar nombre={perfil?.nombre} foto={perfil?.avatar_url} tamano={88} />
            <Texto peso="semi" tamano={19} style={{ marginTop: 10 }}>
              {perfil?.nombre}
            </Texto>
            <Texto tamano={13} color={c.texto2}>
              {perfil?.rol === 'lider' ? 'Líder de equipo' : 'Asesor comercial'} · {perfil?.tenants?.nombre}
            </Texto>
            <Texto tamano={13} color={c.texto3}>
              {sesion?.user?.email}
            </Texto>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <Chip texto={ocupado === 'foto' ? 'Subiendo...' : 'Cambiar foto'} disabled={!!ocupado} onPress={cambiarFoto} />
              {!!perfil?.avatar_url && <Chip texto="Quitar foto" disabled={!!ocupado} onPress={quitarFoto} />}
            </View>
          </View>
          {avisoDe('foto')}
          <Etiqueta style={{ marginTop: 16 }}>Nombre</Etiqueta>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Campo value={nombre} onChangeText={setNombre} style={{ flex: 1 }} maxLength={80} />
            <Boton
              texto="Guardar"
              tipo="secundario"
              disabled={!!ocupado || nombre.trim() === perfil?.nombre || nombre.trim().length < 2}
              onPress={guardarNombre}
              style={{ paddingHorizontal: 16 }}
            />
          </View>
          {avisoDe('nombre')}
        </Tarjeta>

        <Tarjeta titulo="Mis números">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Indicador titulo="Activos" valor={mios.length} />
            <Indicador
              titulo="Contactados"
              valor={mios.length ? `${Math.round((contactados / mios.length) * 100)}%` : '—'}
              color={c.urgenteAzul}
            />
            <Indicador titulo="Ganados" valor={totales ? totales.ganados : '…'} color={c.verdeTexto} />
            <Indicador titulo="Conversión" valor={cerrados ? `${Math.round((totales.ganados / cerrados) * 100)}%` : '—'} />
          </View>
        </Tarjeta>

        <Tarjeta titulo="Preferencias">
          <Etiqueta>Botones para programar el próximo contacto (de 1 a 4)</Etiqueta>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {OPCIONES_DIAS.map((d) => (
              <Chip key={d} texto={etiquetaProximo(d)} elegido={preferencias.proximosDias.includes(d)} onPress={() => alternarDia(d)} />
            ))}
          </View>
          <Etiqueta style={{ marginTop: 16 }}>Los recordatorios quedan</Etiqueta>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <Chip
              texto="A la misma hora"
              elegido={!preferencias.horaRecordatorios}
              onPress={() => cambiarPreferencias({ horaRecordatorios: null })}
            />
            <Chip
              texto="A una hora fija"
              elegido={!!preferencias.horaRecordatorios}
              onPress={() => {
                const h = HORA_VALIDA.test(hora) ? hora : '09:00'
                setHora(h)
                cambiarPreferencias({ horaRecordatorios: h })
              }}
            />
            {!!preferencias.horaRecordatorios && (
              <Campo
                value={hora}
                onChangeText={(v) => {
                  setHora(v)
                  if (HORA_VALIDA.test(v)) cambiarPreferencias({ horaRecordatorios: v.padStart(5, '0') })
                }}
                maxLength={5}
                keyboardType="numbers-and-punctuation"
                style={{ width: 90, textAlign: 'center' }}
              />
            )}
          </View>
          <Etiqueta style={{ marginTop: 16 }}>Tema</Etiqueta>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[
              ['sistema', 'Como el celular'],
              ['claro', 'Claro'],
              ['oscuro', 'Oscuro'],
            ].map(([v, t]) => (
              <Chip key={v} texto={t} elegido={preferencias.tema === v} onPress={() => cambiarPreferencias({ tema: v })} />
            ))}
          </View>
        </Tarjeta>

        <Tarjeta titulo="Seguridad">
          {conEmail ? (
            <>
              <Etiqueta>Contraseña nueva</Etiqueta>
              <Campo value={clave} onChangeText={setClave} secureTextEntry autoCapitalize="none" />
              <Etiqueta style={{ marginTop: 12 }}>Repetila</Etiqueta>
              <Campo value={clave2} onChangeText={setClave2} secureTextEntry autoCapitalize="none" />
              <Boton
                texto={ocupado === 'clave' ? 'Guardando...' : 'Cambiar contraseña'}
                tipo="secundario"
                disabled={!!ocupado || !clave}
                onPress={guardarClave}
                style={{ marginTop: 12 }}
              />
              {avisoDe('clave')}
            </>
          ) : (
            <Texto tamano={14} color={c.texto2}>
              Ingresás con tu cuenta de Google, así que la contraseña se maneja desde Google.
            </Texto>
          )}
        </Tarjeta>

        <Presionable
          onPress={cerrarSesion}
          style={{
            marginTop: 20,
            height: 50,
            borderRadius: 12,
            borderColor: c.borde2,
            borderWidth: 1,
            backgroundColor: c.fondo,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Texto peso="semi" tamano={15} color={c.urgenteRojo}>
            Cerrar sesión
          </Texto>
        </Presionable>
      </ScrollView>
    </View>
  )
}
