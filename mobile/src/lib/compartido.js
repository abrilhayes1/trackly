// La misma lógica que la web (frontend/src/lib): así los grupos, las alertas y los mensajes son
// idénticos en la compu y en el celular. Metro la encuentra por metro.config.js.
export { agruparLeads, diasDesde, tieneProximoPaso } from '../../../frontend/src/lib/urgencia'
export { calcularAlertas } from '../../../frontend/src/lib/alertas'
export {
  fechaLocal,
  hhmm,
  estadoRecordatorio,
  recordatoriosDeLeads,
  ordenarRecordatorios,
  diasDespues,
} from '../../../frontend/src/lib/agenda'
export { etiquetaInteres } from '../../../frontend/src/lib/interes'
export { numeroWhatsApp, iniciales } from '../../../frontend/src/lib/formato'
export { enlaceWhatsApp } from '../../../frontend/src/lib/plantillas'
export { etiquetaProximo, fechaProximoContacto } from '../../../frontend/src/lib/urgencia'
export { valoresDe, completar, sirvePara, primerNombre } from '../../../frontend/src/lib/plantillas'
export { detalleCierre, formatearNumero } from '../../../frontend/src/lib/cierre'
export { nombreEventos } from '../../../frontend/src/lib/charlas'
export { VARIABLES, CANALES } from '../../../frontend/src/lib/plantillas'
export { fechaCharla } from '../../../frontend/src/lib/charlas'
