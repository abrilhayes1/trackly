import { createContext, useContext } from 'react'

// Lista de trabajo compartida por toda la app: los leads activos y vencidos que ve el usuario.
// La carga App.jsx una vez y la vuelve a pedir solo cuando algo cambia (o si quedó vieja), así
// cada pantalla no descarga todo de nuevo. Los ganados y perdidos no vienen acá: Estadísticas y
// Reportes los piden aparte cuando se abren.
export const LeadsEquipoContext = createContext({ leads: [], listo: false, error: null })

export function useLeadsEquipo() {
  return useContext(LeadsEquipoContext)
}

// pasado este tiempo, al cambiar de pantalla se vuelve a pedir la lista (para ver lo que hizo el resto del equipo)
export const VIGENCIA_LISTA_MS = 60 * 1000
