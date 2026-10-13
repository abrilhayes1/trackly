import { createContext, useContext } from 'react'

// Configuración del equipo disponible en toda la app (la carga App.jsx desde /api/config)
export const ConfigEquipoContext = createContext({ config: null, recargar: () => {} })

export function useConfigEquipo() {
  return useContext(ConfigEquipoContext)
}

function minuscula(texto) {
  return texto.charAt(0).toLowerCase() + texto.slice(1)
}

// Cómo llama el equipo a sus contactos (RF06): { uno: 'lead', varios: 'leads', Uno: 'Lead', Varios: 'Leads' }
export function useTerminos() {
  const { config } = useConfigEquipo()
  const Uno = config?.termino_contacto || 'Lead'
  const Varios = config?.termino_contacto_plural || 'Leads'
  return { Uno, Varios, uno: minuscula(Uno), varios: minuscula(Varios) }
}

// Plural sugerido para un nombre que escribe el líder (lo puede corregir a mano)
export function pluralizar(palabra) {
  const p = (palabra || '').trim()
  if (!p) return ''
  if (/[aeiouáéíóú]$/i.test(p)) return p + 's'
  if (/z$/i.test(p)) return p.slice(0, -1) + 'ces'
  if (/[sx]$/i.test(p)) return p
  return p + 'es'
}

export const RUBROS = [
  { valor: 'educacion', icono: '🎓', label: 'Educación', sub: 'Institutos, universidades, cursos' },
  { valor: 'salud', icono: '🏥', label: 'Salud', sub: 'Clínicas, consultorios, bienestar' },
  { valor: 'servicios', icono: '💼', label: 'Servicios', sub: 'Consultoría, agencias, B2C' },
  { valor: 'tecnologia', icono: '💻', label: 'Tecnología', sub: 'Software, SaaS, startups' },
  { valor: 'otro', icono: '✦', label: 'Otro', sub: 'Mi rubro no está en la lista' },
]

export const CONTACTOS = [
  { uno: 'Lead', varios: 'Leads', sub: 'El más común en ventas' },
  { uno: 'Prospecto', varios: 'Prospectos', sub: 'Alternativa formal' },
  { uno: 'Paciente', varios: 'Pacientes', sub: 'Para salud y bienestar' },
  { uno: 'Candidato', varios: 'Candidatos', sub: 'Para RRHH y selección' },
  { uno: 'Consulta', varios: 'Consultas', sub: 'Para servicios generales' },
]

export const EVENTOS = [
  { nombre: 'Charla informativa', sub: 'Educación' },
  { nombre: 'Webinar', sub: 'Online' },
  { nombre: 'Demo', sub: 'Tecnología / SaaS' },
  { nombre: 'Consulta grupal', sub: 'Salud' },
]

export const PLAZOS = [7, 14, 21, 30]

// categorías de origen sugeridas según el rubro (el líder las puede sacar o agregar otras)
export const ORIGENES_SUGERIDOS = {
  educacion: ['Marketing digital', 'Referido', 'Web', 'Redes sociales', 'Evento presencial'],
  salud: ['Derivación médica', 'Web', 'Redes sociales', 'Referido', 'Obra social'],
  servicios: ['LinkedIn', 'Web', 'Referido', 'Email', 'Evento'],
  tecnologia: ['Inbound', 'Referido', 'Trial', 'Demo', 'LinkedIn'],
  otro: ['Web', 'Redes sociales', 'Referido'],
}

export const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function etiquetaRubro(valor) {
  return RUBROS.find((r) => r.valor === valor)?.label || 'Sin definir'
}

// Revisa los números del vencimiento; devuelve el mensaje de error o null si está todo bien
export function errorVencimiento({ vencimientoHabilitado, diasVencimiento, diasAlertaPrevia, diasArchivo }) {
  if (!vencimientoHabilitado) return null
  if (!Number.isInteger(diasVencimiento) || diasVencimiento < 1 || diasVencimiento > 365) {
    return 'El plazo de vencimiento tiene que ser de 1 a 365 días.'
  }
  if (!Number.isInteger(diasAlertaPrevia) || diasAlertaPrevia < 0 || diasAlertaPrevia >= diasVencimiento) {
    return 'El aviso previo tiene que ser menor que el plazo de vencimiento.'
  }
  if (!Number.isInteger(diasArchivo) || diasArchivo < 1 || diasArchivo > 365) {
    return 'Los días hasta pasar a Archivo tienen que ser de 1 a 365.'
  }
  return null
}
