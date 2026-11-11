// Sesión y datos del equipo, compartidos por todas las pantallas: el perfil (/api/me), la
// configuración del equipo, la lista de trabajo (activos y vencidos) y la agenda de hoy.
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { apiFetch } from './api'
import { fechaLocal } from './compartido'
import { PREFERENCIAS_INICIALES, guardarPreferencias, leerPreferencias } from './preferencias'

const SesionContext = createContext(null)
export const useSesion = () => useContext(SesionContext)

export function SesionProvider({ children }) {
  const [sesion, setSesion] = useState(undefined) // undefined = todavía leyendo la guardada
  const [perfil, setPerfil] = useState(null)
  // { equipo } si el líder lo desactivó
  const [desactivado, setDesactivado] = useState(null)
  const [config, setConfig] = useState(null)
  const [leads, setLeads] = useState([])
  const [agenda, setAgenda] = useState([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)
  // leads abiertos desde el buscador que no están en la lista de trabajo (por ejemplo, ya cerrados)
  const [otros, setOtros] = useState({})
  const [preferencias, setPreferencias] = useState(PREFERENCIAS_INICIALES)

  useEffect(() => {
    leerPreferencias().then(setPreferencias)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSesion(data.session ?? null))
    const { data } = supabase.auth.onAuthStateChange((_evento, nueva) => setSesion(nueva ?? null))
    return () => data.subscription.unsubscribe()
  }, [])

  const recargar = useCallback(async () => {
    setCargando(true)
    try {
      const pedidos = await Promise.allSettled([
        apiFetch('/api/me'),
        apiFetch('/api/config'),
        apiFetch('/api/leads?estado=activo,vencido'),
        apiFetch(`/api/recordatorios?fecha=${fechaLocal()}`),
      ])
      const yo = pedidos[0].status === 'fulfilled' ? pedidos[0].value : null
      // el líder lo desactivó: no hay equipo que mostrar (los otros pedidos no importan)
      if (yo?.desactivado) {
        setDesactivado(yo)
        setPerfil(null)
        setConfig(null)
        setLeads([])
        setAgenda([])
        setError(null)
        return
      }
      const fallido = pedidos.find((p) => p.status === 'rejected')
      if (fallido) throw fallido.reason
      const [, conf, lista, recordatorios] = pedidos.map((p) => p.value)
      setDesactivado(null)
      setPerfil(yo)
      setConfig(conf)
      setLeads(lista)
      setAgenda(recordatorios)
      setError(null)
    } catch (e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }, [])

  const userId = sesion?.user?.id
  useEffect(() => {
    if (!userId) {
      setPerfil(null)
      setDesactivado(null)
      setLeads([])
      return
    }
    recargar()
  }, [userId, recargar])

  const valor = {
    sesion,
    userId,
    perfil,
    desactivado,
    config,
    leads,
    agenda,
    cargando,
    error,
    recargar,
    // cambia un lead en la lista sin volver a pedir todo (después de editarlo)
    actualizarLead: (id, cambios) => {
      setLeads((actuales) => actuales.map((l) => (l.id === id ? { ...l, ...cambios } : l)))
      setOtros((actuales) => (actuales[id] ? { ...actuales, [id]: { ...actuales[id], ...cambios } } : actuales))
    },
    buscarLead: (id) => leads.find((l) => l.id === id) || otros[id],
    recordarLead: (lead) => setOtros((actuales) => ({ ...actuales, [lead.id]: lead })),
    cerrarSesion: () => supabase.auth.signOut(),
    preferencias,
    cambiarPreferencias: (cambios) => {
      const nuevas = { ...preferencias, ...cambios }
      setPreferencias(nuevas)
      guardarPreferencias(nuevas)
    },
    agregarLead: (lead) => setLeads((actuales) => [lead, ...actuales]),
  }
  return <SesionContext.Provider value={valor}>{children}</SesionContext.Provider>
}
