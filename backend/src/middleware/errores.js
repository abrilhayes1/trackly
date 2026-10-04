const { ErrorHttp } = require('../lib/errores');

// Único lugar donde un error se convierte en respuesta.
// Va al final de index.js, después de todas las rutas.
function manejarErrores(err, req, res, next) {
  if (res.headersSent) return next(err);

  // errores esperados: los lanzan los servicios con su código HTTP
  if (err instanceof ErrorHttp) {
    return res.status(err.status).json({ error: err.message });
  }

  // el cuerpo del pedido no es un JSON válido
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'El cuerpo del pedido no es un JSON válido' });
  }

  // cualquier otra cosa es un error nuestro: se registra y no se le muestra el detalle al usuario
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
}

module.exports = { manejarErrores };
