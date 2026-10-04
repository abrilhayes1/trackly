// Error "esperado" de la aplicación: lleva el código HTTP que corresponde.
// Los servicios lo lanzan; el middleware de errores lo convierte en la respuesta.
class ErrorHttp extends Error {
  constructor(status, mensaje) {
    super(mensaje);
    this.status = status;
  }
}

// Si la base devolvió un error, lo convierte en un ErrorHttp (400 por defecto).
function lanzarSiError(error, status = 400) {
  if (error) throw new ErrorHttp(status, error.message);
}

module.exports = { ErrorHttp, lanzarSiError };
