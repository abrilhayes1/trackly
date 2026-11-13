// Datos del prototipo: el mismo equipo de ejemplo que database/seed_equipo_demo.sql (todo inventado).
// Las fechas se calculan desde el momento en que se abre el archivo. Mientras la pestaña está abierta,
// los cambios se guardan en sessionStorage (así cambiar de usuario o recargar no los pierde).
import { fechaLocal } from '../lib/agenda'

const CLAVE = 'trackly-prototipo-datos'

export const IDS = {
  equipo: 'aaaaaaaa-0000-4000-8000-000000000001',
  lider: 'bbbbbbbb-0000-4000-8000-000000000001',
  martin: 'bbbbbbbb-0000-4000-8000-000000000002',
  lucia: 'bbbbbbbb-0000-4000-8000-000000000003',
  diego: 'bbbbbbbb-0000-4000-8000-000000000004',
}

export const USUARIOS = [
  { id: IDS.lider, email: 'lider@demo.trackly', nombre: 'Carolina Méndez', rol: 'lider' },
  { id: IDS.martin, email: 'martin@demo.trackly', nombre: 'Martín Suárez', rol: 'asesor' },
  { id: IDS.lucia, email: 'lucia@demo.trackly', nombre: 'Lucía Fernández', rol: 'asesor' },
  { id: IDS.diego, email: 'diego@demo.trackly', nombre: 'Diego Romero', rol: 'asesor' },
]

const ORIGENES = ['Instagram', 'Web', 'Referido', 'Facebook', 'Feria educativa']
const CARRERAS = [
  'Diseño Gráfico',
  'Analista de Sistemas',
  'Diseño de Interiores',
  'Administración de Empresas',
  'Marketing Digital',
  'Fotografía',
]
const MODALIDADES = ['Presencial', 'Virtual', 'Híbrida']
const DESCUENTOS = ['Sin descuento', '20%', '30%', 'Sin descuento', '50%']
const MOTIVOS = ['Precio', 'Eligió otra opción', 'No respondió', 'Horarios', 'Ya no le interesa']

// quién (0 = sin asignar, 1 líder, 2 Martín, 3 Lucía, 4 Diego), nombre, estado, interés,
// días desde que ingresó, días desde el último contacto, horas hasta el recordatorio, destacado, consulta
const CONTACTOS = [
  [2, 'Valentina Ruiz', 'activo', null, 0.1, null, null, false, 'Quiere saber horarios del turno noche.'],
  [2, 'Tomás Herrera', 'activo', null, 2, null, null, false, 'Pide el plan de estudios de Sistemas.'],
  [2, 'Camila Ortiz', 'activo', 'muy_interesado', 20, 12.5, null, true, 'Consulta por becas para Diseño Gráfico.'],
  [2, 'Facundo Sosa', 'activo', 'interesado', 9, 1, 26, false, 'Va a venir a conocer la sede.'],
  [2, 'Agustina Molina', 'activo', 'duda', 6, 3, -20, false, 'Duda entre virtual y presencial.'],
  [2, 'Joaquín Acosta', 'activo', 'muy_interesado', 4, 0.2, 4, true, 'Quiere inscribirse esta semana.'],
  [2, 'Milagros Vega', 'activo', 'poco_interesado', 15, 2, null, false, 'Lo tiene que hablar con la familia.'],
  [2, 'Nicolás Paz', 'vencido', 'interesado', 40, 18, null, false, 'Había pedido info del curso intensivo.'],
  [2, 'Rocío Castro', 'archivo', 'frio', 90, 70, null, false, 'Consulta vieja, nunca respondió.'],
  [2, 'Bruno Medina', 'ganado', 'muy_interesado', 45, 10, null, false, 'Se inscribió en Diseño Gráfico.'],
  [2, 'Julieta Romero', 'ganado', 'interesado', 70, 30, null, false, 'Se inscribió con beca.'],
  [2, 'Lautaro Giménez', 'ganado', 'muy_interesado', 25, 5, null, false, 'Quería empezar en marzo.'],
  [2, 'Paula Navarro', 'perdido', 'poco_interesado', 50, 20, null, false, 'Le pareció caro.'],
  [3, 'Santiago Luna', 'activo', null, 0.3, null, null, false, 'Escribió por Instagram.'],
  [3, 'Martina Ríos', 'activo', 'interesado', 18, 13.2, null, false, 'Pidió que la llamen a la tarde.'],
  [3, 'Ignacio Benítez', 'activo', 'muy_interesado', 7, 1, 2, true, 'Quiere visitar la sede el sábado.'],
  [3, 'Florencia Cabrera', 'activo', 'interesado', 12, 4, 50, false, 'Pregunta por la fecha de inicio.'],
  [3, 'Mateo Domínguez', 'activo', 'frio', 30, 8, 72, false, 'No contesta los mensajes.'],
  [3, 'Sofía Peralta', 'activo', 'duda', 10, 2, null, false, 'Compara con otra institución.'],
  [3, 'Emilia Godoy', 'activo', 'interesado', 3, 0.5, -3, false, 'Pidió cuotas sin interés.'],
  [3, 'Gonzalo Aguirre', 'vencido', 'duda', 50, 40, null, false, 'Consultó por cambio de carrera.'],
  [3, 'Victoria Silva', 'archivo', 'frio', 110, 85, null, false, 'No respondió nunca.'],
  [3, 'Franco Rojas', 'ganado', 'interesado', 60, 15, null, false, 'Se anotó en Marketing Digital.'],
  [3, 'Antonella Morales', 'perdido', 'no_interesado', 35, 6, null, false, 'Eligió otra institución.'],
  [3, 'Thiago Correa', 'perdido', 'poco_interesado', 80, 45, null, false, 'No le cerraban los horarios.'],
  [4, 'Lucas Fernández', 'activo', null, 1, null, null, false, 'Llegó por el formulario de la web.'],
  [4, 'Abril Quiroga', 'activo', null, 5, null, null, false, 'Pregunta si hay modalidad a distancia.'],
  [4, 'Benjamín Ojeda', 'activo', 'interesado', 22, 12, null, false, 'Quiere saber el costo de la matrícula.'],
  [4, 'Catalina Ponce', 'activo', 'duda', 8, 5, -48, false, 'Pide hablar con un docente.'],
  [4, 'Dante Villalba', 'activo', 'muy_interesado', 3, 1, 20, true, 'Viene recomendado por un alumno.'],
  [4, 'Guadalupe Ferreyra', 'vencido', 'interesado', 35, 20, null, false, 'Quería info de Fotografía.'],
  [4, 'Bautista Sánchez', 'vencido', 'frio', 28, 16, null, false, 'Dejó de responder.'],
  [4, 'Josefina Álvarez', 'archivo', 'poco_interesado', 100, 60, null, false, 'Consulta del año pasado.'],
  [4, 'Lorenzo Gutiérrez', 'ganado', 'interesado', 55, 25, null, false, 'Se inscribió en Analista de Sistemas.'],
  [4, 'Renata Blanco', 'perdido', 'no_interesado', 40, 10, null, false, 'Ya no le interesa.'],
  [4, 'Tobías Ramírez', 'perdido', 'duda', 65, 30, null, false, 'No respondió más.'],
  [4, 'Olivia Herrera', 'perdido', 'poco_interesado', 20, 9, null, false, 'Le pareció caro.'],
  [1, 'Federico Arias', 'activo', 'muy_interesado', 5, 1, 30, true, 'Empresa que quiere capacitar a su equipo.'],
  [1, 'Micaela Torres', 'ganado', 'muy_interesado', 30, 8, null, false, 'Inscripción corporativa.'],
  [0, 'Ezequiel Moreno', 'activo', null, 0.2, null, null, false, 'Escribió por mensaje directo.'],
  [0, 'Daniela Campos', 'activo', null, 1.5, null, null, false, 'Dejó sus datos en la feria.'],
  [0, 'Hernán Vargas', 'activo', null, 3, null, null, false, 'Pidió información general.'],
]

let contador = 0
export const nuevoId = () => {
  contador += 1
  const azar = Math.random().toString(16).slice(2, 10).padEnd(8, '0')
  return `${azar}-${String(contador).padStart(4, '0')}-4000-8000-${Date.now().toString(16).slice(-12).padStart(12, '0')}`
}

const hace = (dias) => new Date(Date.now() - dias * 864e5).toISOString()
const enHoras = (horas) => new Date(Date.now() + horas * 36e5).toISOString()
const sinTildes = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '')

function generar() {
  const quien = [null, IDS.lider, IDS.martin, IDS.lucia, IDS.diego]
  const db = {
    usuarios: USUARIOS.map(({ id, email, nombre }) => ({ id, email, nombre })),
    tenants: [
      { id: IDS.equipo, nombre: 'Instituto Horizonte', plan: 'equipo', licencias: 5, created_by: IDS.lider, created_at: hace(120) },
    ],
    config: {
      [IDS.equipo]: {
        tenant_id: IDS.equipo,
        rubro: 'educacion',
        vencimiento_habilitado: true,
        dias_vencimiento_lead: 14,
        dias_alerta_previa: 3,
        dias_archivo: 30,
        dias_habiles: false,
        termino_contacto: 'Lead',
        termino_contacto_plural: 'Leads',
        categorias_origen: ORIGENES,
        eventos_habilitado: true,
        termino_evento: 'Charla informativa',
        email_diario: false,
        motivos_perdida: MOTIVOS,
        campos_cierre: [
          { id: 'producto', nombre: 'Carrera', tipo: 'lista', obligatorio: true, opciones: CARRERAS },
          { id: 'modalidad', nombre: 'Modalidad', tipo: 'lista', obligatorio: true, opciones: MODALIDADES },
          {
            id: 'descuento',
            nombre: 'Descuento',
            tipo: 'lista',
            obligatorio: false,
            opciones: ['Sin descuento', '20%', '30%', '50%', '70%'],
          },
          { id: 'importe', nombre: 'Importe ($)', tipo: 'numero', obligatorio: true },
        ],
      },
    },
    profiles: USUARIOS.map((u, i) => ({
      id: u.id,
      tenant_id: IDS.equipo,
      nombre: u.nombre,
      rol: u.rol,
      avatar_url: null,
      activo: true,
      historico: false,
      created_at: hace(120 - i * 10),
    })),
    invitaciones: [],
    leads: [],
    historial: [],
    recordatorios: [],
    cierres: [],
    charlas: [],
    notificados: [],
    plantillas: [],
    reportes: [],
  }

  CONTACTOS.forEach(([q, nombre, estado, interes, ingreso, contacto, recordatorio, destacado, consulta], i) => {
    const n = i + 1
    const id = nuevoId()
    const asesor = quien[q]
    const ultimo = contacto !== null ? hace(contacto) : null
    const origen = ORIGENES[n % 5]
    const lead = {
      id,
      tenant_id: IDS.equipo,
      asesor_id: asesor,
      nombre,
      telefono: `11 ${4100 + n} ${String((n * 379) % 10000).padStart(4, '0')}`,
      email: n % 5 !== 0 ? `${sinTildes(nombre.toLowerCase().replace(/ /g, '.'))}@demo.trackly` : null,
      emails_extra: nombre === 'Camila Ortiz' ? ['camila.trabajo@demo.trackly'] : [],
      origen,
      consulta,
      interes,
      estado: 'activo',
      destacado,
      fecha_ingreso: hace(ingreso),
      ultimo_contacto: ultimo,
      recordatorio: recordatorio !== null ? enHoras(recordatorio) : null,
      vencido_at: null,
      archivado_at: null,
      created_at: hace(ingreso),
      updated_at: hace(contacto ?? ingreso),
    }
    db.leads.push(lead)
    const nota = (texto, fecha, autor = asesor) =>
      db.historial.push({ id: nuevoId(), lead_id: id, texto, autor_id: autor, created_at: fecha })
    nota(`Ingresó desde ${origen}.`, hace(ingreso))
    if (ultimo) {
      nota('Primer contacto por WhatsApp: le pasé la info que pidió.', hace(contacto + (ingreso - contacto) / 2))
      nota('Último contacto registrado.', ultimo)
    }
    if (estado === 'vencido' || estado === 'archivo') {
      const vencido = new Date(new Date(ultimo || Date.now()).getTime() + 14 * 864e5).toISOString()
      lead.estado = 'vencido'
      lead.vencido_at = vencido
      nota('Venció por falta de contacto (plazo de 14 días). Quedó disponible para que cualquier asesor lo reclame.', vencido, null)
      if (estado === 'archivo') {
        const archivado = new Date(new Date(vencido).getTime() + 30 * 864e5).toISOString()
        lead.estado = 'archivo'
        lead.archivado_at = archivado
        nota('Pasó a Archivo: estuvo 30 días vencido sin que nadie lo reclamara.', archivado, null)
      }
    }
    if (estado === 'ganado' || estado === 'perdido') {
      const ganado = estado === 'ganado'
      const datos = ganado
        ? { producto: CARRERAS[n % 6], modalidad: MODALIDADES[n % 3], descuento: DESCUENTOS[n % 5], importe: 150000 + (n % 7) * 25000 }
        : {}
      db.cierres.push({
        id: nuevoId(),
        lead_id: id,
        tenant_id: IDS.equipo,
        tipo: estado,
        datos,
        motivo: ganado ? null : MOTIVOS[n % 5],
        cerrado_por: asesor,
        created_at: ultimo,
        updated_at: ultimo,
      })
      lead.estado = estado
      nota(ganado ? `Cerrado como ganado: ${datos.producto}.` : `Cerrado como perdido. Motivo: ${MOTIVOS[n % 5]}.`, ultimo)
    }
  })

  const porNombre = (n) => db.leads.find((l) => l.nombre === n)
  const dia = (desplazamiento, hora) => {
    const d = new Date()
    d.setDate(d.getDate() + desplazamiento)
    d.setHours(hora, 0, 0, 0)
    return d.toISOString()
  }
  const charla = (nombre, carrera, fecha, link, invitados) => {
    const id = nuevoId()
    db.charlas.push({ id, tenant_id: IDS.equipo, nombre, carrera, fecha, meet_link: link, created_by: IDS.lider, created_at: hace(20) })
    invitados.forEach(([nombreLead, asistio]) => {
      const l = porNombre(nombreLead)
      db.notificados.push({ id: nuevoId(), charla_id: id, lead_id: l.id, asistio, notificado_at: hace(12), notificado_por: l.asesor_id })
    })
  }
  charla('Charla de Diseño Gráfico', 'Diseño Gráfico', dia(-10, 19), 'https://meet.google.com/abc-defg-hij', [
    ['Camila Ortiz', true],
    ['Bruno Medina', true],
    ['Ignacio Benítez', true],
    ['Paula Navarro', false],
    ['Martina Ríos', false],
  ])
  charla('Open house', null, dia(-3, 18), null, [
    ['Dante Villalba', true],
    ['Benjamín Ojeda', false],
    ['Facundo Sosa', null],
    ['Florencia Cabrera', null],
  ])
  charla('Charla de Analista de Sistemas', 'Analista de Sistemas', dia(5, 19), 'https://meet.google.com/xyz-abcd-efg', [
    ['Tomás Herrera', null],
    ['Joaquín Acosta', null],
    ['Sofía Peralta', null],
    ['Catalina Ponce', null],
  ])

  const hoy = new Date()
  const fecha = (d) => {
    const x = new Date(hoy)
    x.setDate(x.getDate() + d)
    return fechaLocal(x)
  }
  ;[
    [IDS.lider, 0, '10:00', 'Reunión de equipo', 'Revisar números del mes', false],
    [IDS.lider, 2, '15:30', 'Proveedor de folletería', null, false],
    [IDS.martin, 1, '11:00', 'Padre de Valentina Ruiz', 'Quiere hablar de la cuota', false],
    [IDS.lucia, -1, '16:00', 'Llamar a la feria educativa', null, false],
    [IDS.lucia, -2, '09:30', 'Mandar fotos de la sede', null, true],
    [IDS.diego, 0, '17:00', 'Seguimiento de inscriptos', null, false],
  ].forEach(([asesor, d, hora, contacto, nota, hecho]) =>
    db.recordatorios.push({
      id: nuevoId(),
      tenant_id: IDS.equipo,
      asesor_id: asesor,
      lead_id: null,
      fecha: fecha(d),
      hora: `${hora}:00`,
      contacto,
      nota,
      hecho,
      created_at: hace(3),
    }),
  )

  ;[
    [
      IDS.lider,
      true,
      'Primer contacto',
      'ambos',
      'Tu consulta en {equipo}',
      'Hola {nombre}, soy {mi_nombre} de {equipo}. Te escribo por tu consulta. ¿Te puedo llamar hoy?',
    ],
    [
      IDS.lider,
      true,
      'Invitación a charla',
      'whatsapp',
      null,
      'Hola {nombre}! Este jueves tenemos una charla informativa. ¿Te reservo un lugar?',
    ],
    [IDS.martin, false, 'Seguimiento', 'whatsapp', null, 'Hola {nombre}, ¿pudiste ver la info que te mandé? Cualquier duda, avisame.'],
  ].forEach(([autor, compartida, nombre, canal, asunto, texto]) =>
    db.plantillas.push({
      id: nuevoId(),
      tenant_id: IDS.equipo,
      creado_por: autor,
      compartida,
      nombre,
      canal,
      asunto,
      texto,
      created_at: hace(30),
      updated_at: hace(30),
    }),
  )

  db.reportes.push({
    id: nuevoId(),
    tenant_id: IDS.equipo,
    nombre: 'Ganados por asesor (90 días)',
    definicion: {
      medida: 'ganados',
      campoMedida: null,
      agrupar: 'asesor',
      campoAgrupar: null,
      vista: 'barras',
      filtros: { dias: 90, estados: [], asesorId: '', origen: '', interes: '', destacados: false },
    },
    creado_por: IDS.lider,
    compartido: true,
    created_at: hace(10),
    updated_at: hace(10),
  })

  return db
}

function leer() {
  try {
    const guardado = sessionStorage.getItem(CLAVE)
    if (guardado) return JSON.parse(guardado)
  } catch {
    // sin almacenamiento: se arranca de cero
  }
  return generar()
}

export const db = leer()

export function guardar() {
  try {
    sessionStorage.setItem(CLAVE, JSON.stringify(db))
  } catch {
    // sin almacenamiento, los cambios duran hasta recargar
  }
}

export function reiniciarDatos() {
  try {
    sessionStorage.removeItem(CLAVE)
  } catch {
    // nada que borrar
  }
}
