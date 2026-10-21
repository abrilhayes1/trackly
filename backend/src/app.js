const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { manejarErrores } = require('./middleware/errores');
const { encabezados, limitarPedidos } = require('./middleware/seguridad');

const app = express();

// Railway pone un proxy adelante: así req.ip es la IP real de quien hace el pedido
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(encabezados);

// en producción solo se aceptan pedidos desde el frontend publicado (FRONTEND_URL, separadas por coma
// si hay más de una); sin esa variable, como en desarrollo, se acepta cualquier origen
const origenes = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((o) => o.trim().replace(/\/$/, ''))
  .filter(Boolean);
app.use(cors(origenes.length ? { origin: origenes } : undefined));

// 1.000 pedidos por minuto por IP: alcanza para un equipo entero trabajando desde la misma red (en
// una oficina suelen salir todos con la misma IP), pero corta a quien intente saturar el servidor
app.use('/api', limitarPedidos({ maximo: 1000 }));
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ ok: true, mensaje: 'Trackly backend funcionando' });
});

app.use('/api/leads', require('./routes/leads'));
app.use('/api/onboarding', require('./routes/onboarding'));
app.use('/api/config', require('./routes/config'));
app.use('/api/me', require('./routes/me'));
app.use('/api/cierres', require('./routes/cierres'));
app.use('/api/recordatorios', require('./routes/recordatorios'));
app.use('/api/charlas', require('./routes/charlas'));
app.use('/api/reportes', require('./routes/reportes'));

// siempre al final: convierte cualquier error en una respuesta JSON
app.use(manejarErrores);

module.exports = app;
