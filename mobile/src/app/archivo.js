// Archivo: los vencidos (cualquier asesor los puede reclamar) y los archivados (se reactivan).
// Al tocar uno se abre su tarjeta, que tiene el botón "Reclamar" o "Reactivar".
import { useCallback, useEffect, useState } from 'react'
import { RefreshControl, ScrollView, View } from 'react-native'
import { useTema } from '../lib/tema'
import { apiFetch } from '../lib/api'
import Texto from '../components/Texto'
import FilaLead from '../components/FilaLead'
import Encabezado from '../components/Encabezado'
import { Aviso } from '../components/Formulario'

export default function Archivo() {
  const { c } = useTema()
  const [leads, setLeads] = useState(null)
  const [error, setError] = useState(null)
  const [cargando, setCargando] = useState(false)

  const cargar = useCallback(() => {
    setCargando(true)
    apiFetch('/api/leads?estado=vencido,archivo')
      .then((l) => {
        setLeads(l)
        setError(null)
      })
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false))
  }, [])
  useEffect(cargar, [cargar])

  const vencidos = (leads || []).filter((l) => l.estado === 'vencido')
  const archivados = (leads || []).filter((l) => l.estado === 'archivo')
  const seccion = (titulo, lista, punto, vacio) => (
    <View style={{ marginTop: 20 }}>
      <Texto peso="semi" tamano={13} color={c.texto2} style={{ letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 10 }}>
        {titulo} · {lista.length}
      </Texto>
      {lista.length === 0 && (
        <Texto tamano={14} color={c.texto3}>
          {vacio}
        </Texto>
      )}
      {lista.map((l) => (
        <FilaLead key={l.id} lead={{ ...l, consulta: l.asesor?.nombre ? `Era de ${l.asesor.nombre}` : l.consulta }} punto={punto} />
      ))}
    </View>
  )

  return (
    <View style={{ flex: 1, backgroundColor: c.fondo2 }}>
      <Encabezado titulo="Archivo" />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={cargando} onRefresh={cargar} tintColor={c.acento} colors={[c.acento]} />}
      >
        <Aviso texto={error} />
        {leads && (
          <>
            {seccion('Vencidos', vencidos, c.texto3, 'No hay vencidos: todo el equipo está al día.')}
            {seccion('Archivados', archivados, c.borde3, 'No hay archivados.')}
          </>
        )}
      </ScrollView>
    </View>
  )
}
