// Plantillas de mensajes: las tuyas y las del equipo. Cada uno crea las suyas; el líder además
// comparte con el equipo y edita o borra las compartidas (igual que en Mi perfil de la web).
import { useEffect, useState } from 'react'
import { ScrollView, View } from 'react-native'
import { useTema } from '../lib/tema'
import { useSesion } from '../lib/sesion'
import { apiFetch } from '../lib/api'
import { confirmar } from '../lib/confirmar'
import { CANALES, VARIABLES, completar } from '../lib/compartido'
import Texto from '../components/Texto'
import Presionable from '../components/Presionable'
import Encabezado from '../components/Encabezado'
import Hoja from '../components/Hoja'
import Icono from '../components/Icono'
import Pill from '../components/Pill'
import { Aviso, Boton, Campo, Chip, Etiqueta } from '../components/Formulario'

const VACIA = { nombre: '', canal: 'ambos', asunto: '', texto: '', compartida: false }
const EJEMPLO = Object.fromEntries(VARIABLES.map((v) => [v.clave, v.ejemplo]))

export default function Plantillas() {
  const { c } = useTema()
  const { perfil, userId } = useSesion()
  const esLider = perfil?.rol === 'lider'
  const [plantillas, setPlantillas] = useState(null)
  const [editando, setEditando] = useState(null) // null | plantilla (sin id = nueva)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    apiFetch('/api/plantillas')
      .then(setPlantillas)
      .catch((e) => setError(e.message))
  }, [])

  const puedeEditar = (p) => p.creado_por === userId || (esLider && p.compartida)
  const cambiar = (x) => setEditando((actual) => ({ ...actual, ...x }))

  async function guardar(cerrar) {
    setError(null)
    if (!editando.nombre.trim()) return setError('Ponele un nombre a la plantilla.')
    if (!editando.texto.trim()) return setError('Escribí el texto del mensaje.')
    setGuardando(true)
    try {
      const { nombre, canal, asunto, texto, compartida } = editando
      const cuerpo = JSON.stringify({ nombre, canal, asunto, texto, compartida })
      const guardada = editando.id
        ? await apiFetch(`/api/plantillas/${editando.id}`, { method: 'PUT', body: cuerpo })
        : await apiFetch('/api/plantillas', { method: 'POST', body: cuerpo })
      setPlantillas((actuales) => [...(actuales || []).filter((x) => x.id !== guardada.id), guardada])
      cerrar()
    } catch (e) {
      setError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  async function borrar(p) {
    if (!(await confirmar(`¿Borrar "${p.nombre}"?`, null, 'Borrar'))) return
    try {
      await apiFetch(`/api/plantillas/${p.id}`, { method: 'DELETE' })
      setPlantillas((actuales) => actuales.filter((x) => x.id !== p.id))
    } catch (e) {
      setError(e.message)
    }
  }

  const ordenadas = [...(plantillas || [])].sort((a, b) => Number(b.compartida) - Number(a.compartida) || a.nombre.localeCompare(b.nombre))

  return (
    <View style={{ flex: 1, backgroundColor: c.fondo2 }}>
      <Encabezado
        titulo="Plantillas de mensajes"
        accion={
          <Presionable
            onPress={() => {
              setError(null)
              setEditando({ ...VACIA })
            }}
            accessibilityLabel="Plantilla nueva"
            style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
          >
            <Icono nombre="mas" tamano={22} color={c.acento} grosor={2.4} />
          </Presionable>
        }
      />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}>
        {!editando && <Aviso texto={error} />}
        {plantillas?.length === 0 && (
          <Texto tamano={14} color={c.texto3} style={{ textAlign: 'center', marginTop: 32 }}>
            Todavía no hay plantillas. Tocá + para crear la primera.
          </Texto>
        )}
        {ordenadas.map((p) => (
          <Presionable
            key={p.id}
            escala={0.98}
            disabled={!puedeEditar(p)}
            onPress={() => {
              setError(null)
              setEditando({ ...p, asunto: p.asunto || '' })
            }}
            style={{ backgroundColor: c.fondo, borderColor: c.borde, borderWidth: 1, borderRadius: 14, padding: 14, marginTop: 8 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Texto peso="semi" tamano={15}>
                {p.nombre}
              </Texto>
              <Pill texto={CANALES.find((x) => x.valor === p.canal)?.etiqueta} fondo={c.fondo3} color={c.texto2} borde={c.fondo3} />
              {p.compartida && <Pill texto="Del equipo" fondo={c.violetaFondo} color={c.violetaTexto} borde={c.violetaFondo} />}
            </View>
            <Texto tamano={13} color={c.texto2} numberOfLines={2} style={{ marginTop: 6 }}>
              {p.texto}
            </Texto>
          </Presionable>
        ))}
      </ScrollView>

      <Hoja
        visible={!!editando}
        onCerrar={() => setEditando(null)}
        titulo={editando?.id ? 'Editar plantilla' : 'Plantilla nueva'}
        pie={(cerrar) => (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {editando?.id && (
              <Boton
                texto="Borrar"
                tipo="secundario"
                style={{ flex: 1 }}
                onPress={async () => {
                  const p = editando
                  cerrar()
                  borrar(p)
                }}
              />
            )}
            <Boton
              texto={guardando ? 'Guardando...' : 'Guardar'}
              disabled={guardando}
              onPress={() => guardar(cerrar)}
              style={{ flex: 1 }}
            />
          </View>
        )}
      >
        {editando && (
          <>
            <Etiqueta>Nombre</Etiqueta>
            <Campo value={editando.nombre} onChangeText={(v) => cambiar({ nombre: v })} placeholder="Ej: Primer contacto" maxLength={60} />
            <Etiqueta style={{ marginTop: 14 }}>Para</Etiqueta>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {CANALES.map((x) => (
                <Chip key={x.valor} texto={x.etiqueta} elegido={editando.canal === x.valor} onPress={() => cambiar({ canal: x.valor })} />
              ))}
            </View>
            {editando.canal !== 'whatsapp' && (
              <>
                <Etiqueta style={{ marginTop: 14 }}>Asunto del email</Etiqueta>
                <Campo
                  value={editando.asunto}
                  onChangeText={(v) => cambiar({ asunto: v })}
                  placeholder="Ej: Info sobre tu consulta"
                  maxLength={150}
                />
              </>
            )}
            <Etiqueta style={{ marginTop: 14 }}>Mensaje</Etiqueta>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {VARIABLES.map((v) => (
                <Chip key={v.clave} texto={`{${v.clave}}`} onPress={() => cambiar({ texto: `${editando.texto}{${v.clave}}` })} />
              ))}
            </View>
            <Campo
              multiline
              value={editando.texto}
              onChangeText={(v) => cambiar({ texto: v })}
              placeholder="Hola {nombre}, soy {mi_nombre} de {equipo}..."
              maxLength={2000}
            />
            {!!editando.texto.trim() && (
              <Texto tamano={13} color={c.texto2} style={{ marginTop: 8 }}>
                <Texto tamano={13} color={c.texto3}>
                  Así se ve:{' '}
                </Texto>
                {completar(editando.texto, EJEMPLO)}
              </Texto>
            )}
            {esLider && (
              <View style={{ flexDirection: 'row', marginTop: 14 }}>
                <Chip
                  texto="Compartir con todo el equipo"
                  elegido={editando.compartida}
                  onPress={() => cambiar({ compartida: !editando.compartida })}
                />
              </View>
            )}
            <Aviso texto={error} />
          </>
        )}
      </Hoja>
    </View>
  )
}
