const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use('/api/onboarding', require('./routes/onboarding'));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, mensaje: 'Trackly backend funcionando' });
});

app.use('/api/leads', require('./routes/leads'));

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});