// Forma de la definición de un reporte personalizado (RF45). El frontend calcula los números;
// acá solo se revisa que la definición tenga valores conocidos antes de guardarla.
const { ErrorHttp } = require('./errores');

const MEDIDAS = ['cantidad', 'contactados', 'ganados', 'perdidos', 'tasa_contacto', 'tasa_conversion', 'suma_campo', 'promedio_campo'];
const AGRUPAR = ['ninguno', 'origen', 'interes', 'asesor', 'estado', 'semana', 'mes', 'campo_cierre'];
const VISTAS = ['numero', 'barras', 'columnas', 'tabla'];
const PERIODOS = [0, 7, 30, 90, 365];
const ESTADOS = ['activo', 'vencido', 'archivo', 'ganado', 'perdido'];
const ID = /^[a-z0-9_]{1,30}$/;

function texto(v, max = 120) {
  return typeof v === 'string' ? v.slice(0, max) : '';
}

function validarDefinicion(d) {
  if (!d || typeof d !== 'object' || Array.isArray(d)) throw new ErrorHttp(400, 'La definición del reporte no es válida');
  if (!MEDIDAS.includes(d.medida)) throw new ErrorHttp(400, 'Elegí qué medir');
  if (!AGRUPAR.includes(d.agrupar)) throw new ErrorHttp(400, 'Elegí cómo agrupar');
  if (!VISTAS.includes(d.vista)) throw new ErrorHttp(400, 'Elegí cómo ver el reporte');
  if (['suma_campo', 'promedio_campo'].includes(d.medida) && !ID.test(d.campoMedida || '')) {
    throw new ErrorHttp(400, 'Elegí el campo del cierre a sumar o promediar');
  }
  if (d.agrupar === 'campo_cierre' && !ID.test(d.campoAgrupar || '')) {
    throw new ErrorHttp(400, 'Elegí el campo del cierre para agrupar');
  }

  const f = d.filtros && typeof d.filtros === 'object' ? d.filtros : {};
  const estados = Array.isArray(f.estados) ? f.estados.filter((e) => ESTADOS.includes(e)) : [];
  return {
    medida: d.medida,
    campoMedida: ['suma_campo', 'promedio_campo'].includes(d.medida) ? d.campoMedida : null,
    agrupar: d.agrupar,
    campoAgrupar: d.agrupar === 'campo_cierre' ? d.campoAgrupar : null,
    vista: d.agrupar === 'ninguno' ? 'numero' : d.vista === 'numero' ? 'barras' : d.vista,
    filtros: {
      dias: PERIODOS.includes(f.dias) ? f.dias : 30,
      estados,
      asesorId: texto(f.asesorId, 40),
      origen: texto(f.origen),
      interes: texto(f.interes, 30),
      destacados: f.destacados === true,
    },
  };
}

module.exports = { validarDefinicion };
