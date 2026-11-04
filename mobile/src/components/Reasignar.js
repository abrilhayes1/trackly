// Reasignar un lead (o asignar uno sin asesor) a otra persona del equipo (RF39, solo el líder)
import { useState } from 'react'
import { useTema } from '../lib/tema'
import { apiFetch } from '../lib/api'
import Hoja from './Hoja'
import Texto from './Texto'
import Presionable from './Presionable'
import Avatar from './Avatar'
import { Aviso } from './Formulario'

export default function Reasignar({ lead, miembros, onCerrar, onListo }) {
  const { c } = useTema()
  const [error, setError] = useState(null)
  const [ocupado, setOcupado] = useState(null)

  async function elegir(m, cerrar) {
    setOcupado(m.id)
    setError(null)
    try {
      await apiFetch(`/api/leads/${lead.id}/reasignar`, { method: 'POST', body: JSON.stringify({ asesorId: m.id }) })
      onListo(`${lead.nombre} ${lead.asesor_id ? 'pasó a' : 'quedó asignado a'} ${m.nombre}.`)
      cerrar()
    } catch (e) {
      setError(e.message)
    } finally {
      setOcupado(null)
    }
  }

  return (
    <Hoja visible={!!lead} onCerrar={onCerrar} titulo={lead?.asesor_id ? 'Reasignar' : 'Asignar a'} subtitulo={lead?.nombre}>
      {miembros
        .filter((m) => m.id !== lead?.asesor_id)
        .map((m) => (
          <Presionable
            key={m.id}
            disabled={!!ocupado}
            onPress={() => elegir(m, onCerrar)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingVertical: 12,
              borderBottomColor: c.borde,
              borderBottomWidth: 1,
            }}
          >
            <Avatar nombre={m.nombre} foto={m.avatar_url} tamano={34} />
            <Texto tamano={15} style={{ flex: 1 }}>
              {m.nombre}
            </Texto>
            {ocupado === m.id && <Texto color={c.texto3}>...</Texto>}
          </Presionable>
        ))}
      <Aviso texto={error} />
    </Hoja>
  )
}
