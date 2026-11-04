// Los eventos de un lead en su tarjeta: a cuáles fue invitado (con su asistencia) e invitarlo a uno
// próximo. Solo aparece si el equipo usa eventos.
import { useCallback, useEffect, useState } from 'react'
import { View } from 'react-native'
import { useTema } from '../lib/tema'
import { apiFetch } from '../lib/api'
import { fechaCharla } from '../lib/compartido'
import Texto from './Texto'
import Presionable from './Presionable'
import Hoja from './Hoja'
import Asistencia from './Asistencia'
import { Aviso } from './Formulario'

export default function CharlasLead({ lead, puedeEditar, onCambio }) {
  const { c } = useTema()
  const [invitaciones, setInvitaciones] = useState([])
  const [charlas, setCharlas] = useState([])
  const [eligiendo, setEligiendo] = useState(false)
  const [error, setError] = useState(null)

  const cargar = useCallback(() => {
    Promise.all([apiFetch(`/api/charlas/lead/${lead.id}`), apiFetch('/api/charlas')])
      .then(([inv, todas]) => {
        setInvitaciones(inv)
        setCharlas(todas)
      })
      .catch((e) => setError(e.message))
  }, [lead.id])
  useEffect(cargar, [cargar])

  const yaInvitado = new Set(invitaciones.map((i) => i.charla.id))
  const opciones = charlas.filter((x) => new Date(x.fecha).getTime() >= Date.now() - 3 * 3600e3 && !yaInvitado.has(x.id))

  async function invitar(charla, cerrar) {
    setError(null)
    try {
      await apiFetch(`/api/charlas/${charla.id}/invitados`, { method: 'POST', body: JSON.stringify({ leadId: lead.id }) })
      cerrar()
      cargar()
      onCambio()
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <View>
      {invitaciones.length === 0 && (
        <Texto tamano={14} color={c.texto3}>
          Todavía no fue invitado a ningún evento.
        </Texto>
      )}
      {invitaciones.map((inv) => (
        <View key={inv.id} style={{ paddingVertical: 8, borderBottomColor: c.borde, borderBottomWidth: 1 }}>
          <Texto peso="semi" tamano={14}>
            {inv.charla.nombre}
          </Texto>
          <Texto tamano={12} color={c.texto3} style={{ marginTop: 2, marginBottom: 8 }}>
            {fechaCharla(inv.charla.fecha)}
          </Texto>
          <Asistencia
            inv={inv}
            puede={puedeEditar}
            onCambio={() => {
              cargar()
              onCambio()
            }}
          />
        </View>
      ))}
      {puedeEditar && opciones.length > 0 && (
        <Presionable onPress={() => setEligiendo(true)} style={{ marginTop: 10 }}>
          <Texto peso="semi" tamano={14} color={c.acento}>
            + Invitar a un evento
          </Texto>
        </Presionable>
      )}
      <Aviso texto={!eligiendo && error} />
      <Hoja visible={eligiendo} onCerrar={() => setEligiendo(false)} titulo="Invitar a un evento" subtitulo={lead.nombre}>
        {opciones.map((x) => (
          <Presionable
            key={x.id}
            onPress={() => invitar(x, () => setEligiendo(false))}
            style={{ paddingVertical: 12, borderBottomColor: c.borde, borderBottomWidth: 1 }}
          >
            <Texto peso="semi" tamano={15}>
              {x.nombre}
            </Texto>
            <Texto tamano={13} color={c.texto2} style={{ marginTop: 2 }}>
              {fechaCharla(x.fecha)}
              {x.carrera ? ` · ${x.carrera}` : ''}
            </Texto>
          </Presionable>
        ))}
        <Aviso texto={eligiendo && error} />
      </Hoja>
    </View>
  )
}
