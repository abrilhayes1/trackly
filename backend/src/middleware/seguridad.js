// Seguridad del servidor (RNF03), sin librerías extra.

// Encabezados de seguridad para una API que solo devuelve JSON (lo mismo que haría "helmet"):
// el navegador no adivina tipos de archivo, no se puede meter en un iframe, no se manda la dirección
// de origen y se fuerza HTTPS. La respuesta se puede leer desde el frontend publicado (otro dominio).
function encabezados(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
}

// Límite de pedidos por dirección IP en una ventana de tiempo. Si se pasa, responde 429 y avisa en
// cuántos segundos puede volver a intentar. Se guarda en memoria (alcanza para un solo servidor).
function limitarPedidos({ maximo, ventanaMs = 60 * 1000, mensaje = 'Hiciste demasiados pedidos seguidos. Esperá un momento y probá de nuevo.' }) {
  const contadores = new Map();

  // cada tanto se borran las ventanas que ya terminaron, para no acumular memoria
  const limpieza = setInterval(() => {
    const ahora = Date.now();
    for (const [ip, c] of contadores) if (c.hasta <= ahora) contadores.delete(ip);
  }, ventanaMs);
  limpieza.unref();

  return function limitador(req, res, next) {
    const ahora = Date.now();
    const ip = req.ip || 'desconocida';
    let c = contadores.get(ip);
    if (!c || c.hasta <= ahora) {
      c = { cantidad: 0, hasta: ahora + ventanaMs };
      contadores.set(ip, c);
    }
    c.cantidad += 1;

    res.setHeader('RateLimit-Limit', String(maximo));
    res.setHeader('RateLimit-Remaining', String(Math.max(0, maximo - c.cantidad)));
    if (c.cantidad > maximo) {
      res.setHeader('Retry-After', String(Math.ceil((c.hasta - ahora) / 1000)));
      return res.status(429).json({ error: mensaje });
    }
    next();
  };
}

module.exports = { encabezados, limitarPedidos };
