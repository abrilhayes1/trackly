// Importar contactos desde una planilla: reconocer las columnas, armar las filas y revisarlas antes
// de mandarlas. La base vuelve a revisar todo (importar_leads); acá es para mostrar la vista previa.

export const MAX_FILAS = 2000
export const TANDA = 200

// campos de Trackly y nombres de columna con los que se los suele encontrar en una planilla
export const CAMPOS = [
  {
    clave: 'nombre',
    etiqueta: 'Nombre',
    obligatorio: true,
    nombres: ['nombre', 'nombre y apellido', 'apellido y nombre', 'nombre completo', 'contacto', 'cliente', 'alumno', 'interesado', 'name'],
  },
  { clave: 'apellido', etiqueta: 'Apellido (si viene aparte)', nombres: ['apellido', 'apellidos', 'last name'] },
  {
    clave: 'telefono',
    etiqueta: 'Teléfono',
    nombres: ['telefono', 'tel', 'celular', 'cel', 'movil', 'whatsapp', 'wsp', 'wpp', 'phone'],
  },
  { clave: 'email', etiqueta: 'Email', nombres: ['email', 'mail', 'e mail', 'correo', 'correo electronico'] },
  { clave: 'origen', etiqueta: 'Origen', nombres: ['origen', 'fuente', 'canal', 'medio', 'campana', 'como nos conocio'] },
  {
    clave: 'consulta',
    etiqueta: 'Consulta',
    nombres: ['consulta', 'comentario', 'comentarios', 'mensaje', 'observacion', 'observaciones', 'nota', 'notas', 'carrera'],
  },
]

// "Teléfono / WhatsApp" → "telefono whatsapp"
export function normalizar(texto) {
  return String(texto ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

// la primera fila con algún dato es la de los títulos
export function filaDeTitulos(datos) {
  const i = datos.findIndex((fila) => fila.some((c) => String(c ?? '').trim() !== ''))
  return i === -1 ? 0 : i
}

// Qué columna corresponde a cada campo, mirando los títulos. Primero busca coincidencias exactas
// y después títulos que empiezan con alguno de los nombres; cada columna se usa una sola vez.
export function detectarColumnas(titulos) {
  const norm = titulos.map(normalizar)
  const mapeo = Object.fromEntries(CAMPOS.map((c) => [c.clave, null]))
  const usadas = new Set()
  for (const exacto of [true, false]) {
    for (const campo of CAMPOS) {
      if (mapeo[campo.clave] !== null) continue
      const i = norm.findIndex(
        (t, idx) => !usadas.has(idx) && t && campo.nombres.some((n) => (exacto ? t === n : t.startsWith(`${n} `) || t.startsWith(n))),
      )
      if (i !== -1) {
        mapeo[campo.clave] = i
        usadas.add(i)
      }
    }
  }
  return mapeo
}

// valor de una celda como texto (los teléfonos suelen venir como número)
function celda(fila, i) {
  if (i === null || i === undefined) return ''
  const v = fila[i]
  if (v === null || v === undefined) return ''
  if (v instanceof Date) return v.toLocaleDateString('es-AR')
  return String(v).trim()
}

// filas de la planilla → contactos para importar (fila = número de fila en el Excel, para ubicarla)
export function armarFilas(datos, mapeo, { origenFijo = '' } = {}) {
  const inicio = filaDeTitulos(datos)
  return datos
    .slice(inicio + 1)
    .map((fila, i) => {
      const nombre = celda(fila, mapeo.nombre)
      const apellido = celda(fila, mapeo.apellido)
      return {
        fila: inicio + i + 2,
        nombre: [nombre, apellido].filter(Boolean).join(' '),
        telefono: celda(fila, mapeo.telefono),
        email: celda(fila, mapeo.email).toLowerCase(),
        origen: celda(fila, mapeo.origen) || origenFijo.trim(),
        consulta: celda(fila, mapeo.consulta),
      }
    })
    .filter((f) => f.nombre || f.telefono || f.email || f.consulta)
}

// igual que clave_telefono en la base: solo números, últimos 10 dígitos
export function claveTelefono(telefono) {
  const digitos = String(telefono ?? '').replace(/\D/g, '')
  return digitos ? digitos.slice(-10) : null
}

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

// Revisa cada fila con las mismas reglas que la base: ok, error (falta algo) o repetido (contra los
// contactos que ya se ven en la app o contra otra fila del mismo archivo)
export function revisarFilas(filas, existentes = []) {
  const vistos = new Set()
  existentes.forEach((l) => {
    const t = claveTelefono(l.telefono)
    if (t) vistos.add(`t:${t}`)
    if (l.email) vistos.add(`e:${String(l.email).trim().toLowerCase()}`)
  })

  return filas.map((f) => {
    const t = claveTelefono(f.telefono)
    if (!f.nombre) return { ...f, estado: 'error', motivo: 'Falta el nombre' }
    if (!t && !f.email) return { ...f, estado: 'error', motivo: 'Falta el teléfono o el email' }
    if (f.email && !EMAIL.test(f.email)) return { ...f, estado: 'error', motivo: 'El email no es válido' }
    if (t && vistos.has(`t:${t}`)) return { ...f, estado: 'repetido', motivo: 'Ya hay un contacto con ese teléfono' }
    if (f.email && vistos.has(`e:${f.email}`)) return { ...f, estado: 'repetido', motivo: 'Ya hay un contacto con ese email' }
    if (t) vistos.add(`t:${t}`)
    if (f.email) vistos.add(`e:${f.email}`)
    return { ...f, estado: 'ok', motivo: '' }
  })
}

// CSV que Excel abre bien en castellano: separado por punto y coma y con BOM (para los acentos)
export function aCSV(encabezados, filas) {
  const escapar = (v) => {
    const s = String(v ?? '')
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return '﻿' + [encabezados, ...filas].map((f) => f.map(escapar).join(';')).join('\r\n')
}

export function plantillaCSV() {
  return aCSV(
    ['Nombre', 'Apellido', 'Teléfono', 'Email', 'Origen', 'Consulta'],
    [
      ['Lucía', 'Gómez', '11 2345-6789', 'lucia@mail.com', 'Instagram', 'Quiere info de la carrera de diseño'],
      ['Martín', 'Paz', '+54 9 351 555-0000', '', 'Feria educativa', ''],
    ],
  )
}

// descarga un texto como archivo
export function descargar(nombre, contenido, tipo = 'text/csv;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }))
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// Lee el archivo elegido y devuelve sus filas (cada una, una lista de celdas). Las librerías se
// descargan recién acá, la primera vez que alguien importa.
export async function leerPlanilla(archivo) {
  const nombre = archivo.name.toLowerCase()
  if (nombre.endsWith('.xlsx')) {
    const { readSheet } = await import('read-excel-file/browser')
    return readSheet(archivo)
  }
  if (nombre.endsWith('.csv') || nombre.endsWith('.txt')) {
    const { default: Papa } = await import('papaparse')
    return new Promise((listo, fallo) =>
      Papa.parse(archivo, {
        skipEmptyLines: 'greedy',
        complete: (r) => listo(r.data),
        error: () => fallo(new Error('No se pudo leer el archivo CSV')),
      }),
    )
  }
  if (nombre.endsWith('.xls')) {
    throw new Error('Ese es el formato viejo de Excel (.xls). Abrilo en Excel y guardalo como .xlsx o como CSV.')
  }
  throw new Error('Elegí un archivo de Excel (.xlsx) o CSV.')
}
