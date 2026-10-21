const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const me = require('../controllers/meController');

// la foto llega como imagen cruda (no JSON); el límite deja pasar un poco más de 1 MB para que el
// servicio responda con un mensaje claro si es más grande
const imagen = express.raw({ type: ['image/jpeg', 'image/png', 'image/webp'], limit: '2mb' });

router.get('/', requireAuth, me.perfil);
router.patch('/', requireAuth, me.cambiarNombre);
router.put('/foto', requireAuth, imagen, me.cambiarFoto);
router.delete('/foto', requireAuth, me.quitarFoto);

module.exports = router;
