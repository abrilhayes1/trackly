const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { manejarErrores } = require('./middleware/errores');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
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
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
