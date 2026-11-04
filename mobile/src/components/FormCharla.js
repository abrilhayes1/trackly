// Crear o editar un evento (solo el líder): nombre, categoría, día y hora, y enlace de la reunión
import { useEffect, useState } from 'react'
import { View } from 'react-native'
import { useSesion } from '../lib/sesion'
import { apiFetch } from '../lib/api'
import { fechaLocal } from '../lib/compartido'
import Hoja from './Hoja'
import ElegirFechaHora, { HORA_VALIDA } from './ElegirFechaHora'
import { Aviso, Boton, Campo, Chip, Etiqueta } from './Formulario'

const dos = (n) => String(n).padStart(2, '0')

export default function FormCharla({ visible, inicial, onCerrar, onGuardado, termino }) {
  const { config } = useSesion()
  const categorias = config?.categorias_origen || []
  const [f, setF] = useState({ nombre: '', categoria: '', link: '', dia: fechaLocal(), hora: '19:00' })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)
  const cambiar = (x) => setF((actual) => ({ ...actual, ...x }))

  useEffect(() => {
    if (!visible) return
    const d = inicial?.fecha ? new Date(inicial.fecha) : null
    setF({
      nombre: inicial?.nombre || '',
      categoria: inicial?.carrera || '',
      link: inicial?.meet_link || '',
      dia: d ? fechaLocal(d) : fechaLocal(),
      hora: d ? `${dos(d.getHours())}:${dos(d.getMinutes())}` : '19:00',
    })
    setError(null)
  }, [visible, inicial])

  async function guardar(cerrar) {
    if (!f.nombre.trim()) return setError('Ingresá el nombre.')
    if (!HORA_VALIDA.test(f.hora)) return setError('Indicá la hora (por ejemplo 19:00).')
    setGuardando(true)
    setError(null)
    try {
      const [a, m, d] = f.dia.split('-').map(Number)
      const [h, mi] = f.hora.split(':').map(Number)
      const cuerpo = JSON.stringify({
        nombre: f.nombre,
        fecha: new Date(a, m - 1, d, h, mi).toISOString(),
        categoria: f.categoria,
        link: f.link,
      })
      const guardada = inicial?.id
        ? await apiFetch(`/api/charlas/${inicial.id}`, { method: 'PUT', body: cuerpo })
        : await apiFetch('/api/charlas', { method: 'POST', body: cuerpo })
      onGuardado(guardada)
      cerrar()
    } catch (e) {
      setError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Hoja
      visible={visible}
      onCerrar={onCerrar}
      titulo={inicial?.id ? `Editar ${termino.toLowerCase()}` : `${termino} nueva`}
      pie={(cerrar) => <Boton texto={guardando ? 'Guardando...' : 'Guardar'} disabled={guardando} onPress={() => guardar(cerrar)} />}
    >
      <Etiqueta>Nombre *</Etiqueta>
      <Campo value={f.nombre} onChangeText={(v) => cambiar({ nombre: v })} placeholder="Ej: Charla de Diseño Gráfico" />
      {categorias.length > 0 && (
        <>
          <Etiqueta style={{ marginTop: 14 }}>Categoría</Etiqueta>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {categorias.map((cat) => (
              <Chip
                key={cat}
                texto={cat}
                elegido={f.categoria === cat}
                onPress={() => cambiar({ categoria: f.categoria === cat ? '' : cat })}
              />
            ))}
          </View>
        </>
      )}
      <View style={{ marginTop: 14 }}>
        <ElegirFechaHora
          fecha={f.dia}
          hora={f.hora}
          onFecha={(dia) => cambiar({ dia })}
          onHora={(hora) => cambiar({ hora })}
          cantidad={60}
        />
      </View>
      <Etiqueta style={{ marginTop: 14 }}>Enlace de la reunión (opcional)</Etiqueta>
      <Campo
        value={f.link}
        onChangeText={(v) => cambiar({ link: v })}
        placeholder="https://meet.google.com/..."
        autoCapitalize="none"
        keyboardType="url"
      />
      <Aviso texto={error} />
    </Hoja>
  )
}
