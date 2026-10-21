// Error "esperado" de la aplicación: lleva el código HTTP que corresponde.
// Los servicios lo lanzan; el middleware de errores lo convierte en la respuesta.
class ErrorHttp extends Error {
  constructor(status, mensaje) {
    super(mensaje);
    this.status = status;
  }
}

// Los mensajes que escribimos nosotros (en las funciones SQL y en el backend) están en castellano y
// se muestran tal cual. Los que genera Postgres, PostgREST o Storage están en inglés y son técnicos:
// esos se registran en el servidor y al usuario le llega un texto claro según el código del error.
const TECNICO =
  /violates|permission denied|duplicate key|invalid input|null value|does not exist|not found|syntax error|column|relation|schema cache|JSON|fetch failed|ECONN|timeout|could not|bucket|resource|exceeded|payload|PGRST/i;
const SIN_CONEXION = /fetch failed|ECONN|timeout/i;

const STATUS_POR_CODIGO = {
  42501: 403,
  23505: 409,
  23503: 409,
  23514: 409,
  23502: 400,
  22023: 400,
  '22P02': 400,
  P0002: 404,
  PGRST116: 404,
};

const TEXTO_POR_CODIGO = {
  42501: 'No tenés permiso para hacer esto.',
  23505: 'Ya existe un registro con esos datos.',
  23503: 'No se puede: hay otros datos que dependen de este.',
  23514: 'Algún dato no cumple las reglas.',
  23502: 'Falta completar un dato obligatorio.',
  '22P02': 'Algún dato no tiene el formato correcto.',
  P0002: 'No se encontró lo que buscabas.',
  PGRST116: 'No se encontró lo que buscabas.',
};

// Convierte un error de la base en un ErrorHttp con el código HTTP y un mensaje para el usuario.
function traducirErrorDeBase(error, status = 400) {
  const mensaje = String(error.message || '');

  if (SIN_CONEXION.test(mensaje)) {
    console.error('Sin conexión con la base:', mensaje);
    return new ErrorHttp(503, 'No se pudo conectar con la base de datos. Probá de nuevo en un momento.');
  }

  const codigo = error.code;
  const final = STATUS_POR_CODIGO[codigo] ?? status;
  if (mensaje && !TECNICO.test(mensaje)) return new ErrorHttp(final, mensaje);

  console.error('Error de la base:', codigo || '(sin código)', mensaje, error.details || '');
  return new ErrorHttp(final, TEXTO_POR_CODIGO[codigo] || 'No se pudo completar la operación. Probá de nuevo.');
}

// Si la base devolvió un error, lo convierte en un ErrorHttp (400 si el código no dice otra cosa).
function lanzarSiError(error, status = 400) {
  if (error) throw traducirErrorDeBase(error, status);
}

module.exports = { ErrorHttp, lanzarSiError, traducirErrorDeBase };
