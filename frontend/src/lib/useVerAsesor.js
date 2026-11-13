// El líder ve Mis leads, Alertas y Agenda de todo el equipo, de una persona o solo lo suyo (RF30).
// La elección se recuerda en el navegador y vale para las tres pantallas. Un asesor siempre ve lo suyo.
import { useEffect, useState } from 'react'
import { apiFetch } from './api'
import { TODO_EL_EQUIPO, estaActivo } from './miembros'

const CLAVE = 'trackly-ver-asesor'

function leer() {
  try {
    return localStorage.getItem(CLAVE) || TODO_EL_EQUIPO
  } catch {
    return TODO_EL_EQUIPO
  }
}

// los miembros se piden una vez por minuto como mucho, aunque se cambie de pantalla
let enCache = { cuando: 0, pedido: null }
function pedirMiembros() {
  if (!enCache.pedido || Date.now() - enCache.cuando > 60000) {
    enCache = { cuando: Date.now(), pedido: apiFetch('/api/config/equipo').then((e) => e.miembros || []) }
  }
  return enCache.pedido
}

export function useVerAsesor(rol, userId) {
  const esLider = rol === 'lider'
  const [elegido, setElegido] = useState(leer)
  const [miembros, setMiembros] = useState([])

  useEffect(() => {
    if (!esLider) return
    let vigente = true
    pedirMiembros()
      .then((lista) => vigente && setMiembros(lista.filter(estaActivo)))
      .catch(() => {
        enCache = { cuando: 0, pedido: null }
      })
    return () => {
      vigente = false
    }
  }, [esLider])

  function elegir(valor) {
    setElegido(valor)
    try {
      localStorage.setItem(CLAVE, valor)
    } catch {
      // sin almacenamiento, la elección dura hasta recargar
    }
  }

  // si la persona elegida ya no está en el equipo, se ve todo el equipo
  const valido = elegido === TODO_EL_EQUIPO || elegido === userId || miembros.some((m) => m.id === elegido)
  const asesor = !esLider ? userId : valido ? elegido : TODO_EL_EQUIPO
  // mientras no se sepa quién es el usuario, un asesor no ve nada (igual que antes)
  return { esLider, asesor, elegir, miembros, verOtros: esLider && asesor !== userId }
}
