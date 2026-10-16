const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { manejarErrores } = require('./middleware/errores');

const app = express();
const PORT = process.env.PORT || 3000;

// en producción solo se aceptan pedidos desde el frontend publicado (FRONTEND_URL, separadas por coma
// si hay más de una); sin esa variable, como en desarrollo, se acepta cualquier origen
const origenes = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((o) => o.trim().replace(/\/$/, ''))
  .filter(Boolean);
app.use(cors(origenes.length ? { origin: origenes } : undefined));
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

// siempre al final: convierte cualquier error en una respuesta JSON
app.use(manejarErrores);

app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
