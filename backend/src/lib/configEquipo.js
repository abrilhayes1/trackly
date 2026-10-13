// Validación y armado de la configuración del equipo, compartida por el onboarding y la pantalla
// de configuración. La base vuelve a validar todo (validar_config_equipo); acá se arma el objeto
// con los nombres de columna y se dan mensajes claros antes de llegar a la base.
const { ErrorHttp } = require('./errores');

const RUBROS = ['educacion', 'salud', 'servicios', 'tecnologia', 'otro'];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function entero(valor) {
  return Number.isInteger(valor) ? valor : null;
}

function texto(valor) {
  return typeof valor === 'string' ? valor.trim() : '';
}

// Convierte el cuerpo del pedido (camelCase) al formato de la base (snake_case)
function armarConfig(body) {
  const b = body ?? {};
  const config = {
    equipo_nombre: texto(b.equipoNombre),
    rubro: texto(b.rubro),
    termino_contacto: texto(b.terminoContacto),
    termino_contacto_plural: texto(b.terminoContactoPlural),
    vencimiento_habilitado: b.vencimientoHabilitado === true,
    dias_vencimiento_lead: entero(b.diasVencimiento),
    dias_alerta_previa: entero(b.diasAlertaPrevia),
    dias_archivo: entero(b.diasArchivo),
    categorias_origen: Array.isArray(b.categoriasOrigen) ? b.categoriasOrigen.filter((c) => typeof c === 'string') : [],
    eventos_habilitado: b.eventosHabilitado === true,
    termino_evento: texto(b.terminoEvento),
    email_diario: b.emailDiario !== false,
  };

  if (!config.equipo_nombre) throw new ErrorHttp(400, 'Ingresá el nombre del equipo');
  if (!RUBROS.includes(config.rubro)) throw new ErrorHttp(400, 'Elegí el rubro del equipo');
  if (!config.termino_contacto || !config.termino_contacto_plural) {
    throw new ErrorHttp(400, 'Indicá cómo se llaman tus contactos');
  }
  if (config.categorias_origen.length > 30) {
    throw new ErrorHttp(400, 'Podés tener hasta 30 categorías de origen');
  }
  return config;
}

// Lista de emails limpia; avisa cuál está mal escrito
function limpiarEmails(lista) {
  if (lista === undefined || lista === null) return [];
  if (!Array.isArray(lista)) throw new ErrorHttp(400, 'Los emails tienen que venir en una lista');
  const emails = [...new Set(lista.map((e) => texto(e).toLowerCase()).filter(Boolean))];
  const mal = emails.find((e) => !EMAIL.test(e));
  if (mal) throw new ErrorHttp(400, `El email "${mal}" no es válido`);
  if (emails.length > 50) throw new ErrorHttp(400, 'Podés invitar hasta 50 personas a la vez');
  return emails;
}

// Errores de las funciones de la base → respuesta HTTP
function lanzarErrorDeBase(error) {
  if (!error) return;
  if (error.code === '22023') throw new ErrorHttp(400, error.message);
  if (error.code === '23505') throw new ErrorHttp(409, error.message);
  if (error.code === '42501') throw new ErrorHttp(403, error.message);
  throw new ErrorHttp(400, error.message);
}

module.exports = { armarConfig, limpiarEmails, lanzarErrorDeBase };
