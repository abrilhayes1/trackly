const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const me = require('../controllers/meController');
const { limitarPedidos } = require('../middleware/seguridad');

// la foto llega como imagen cruda (no JSON); el límite deja pasar un poco más de 1 MB para que el
// servicio responda con un mensaje claro si es más grande
const imagen = express.raw({ type: ['image/jpeg', 'image/png', 'image/webp'], limit: '2mb' });

router.get('/', requireAuth, me.perfil);
router.patch('/', requireAuth, me.cambiarNombre);
// subir fotos es lo más pesado: como mucho 10 por minuto
const limiteFotos = limitarPedidos({ maximo: 10, mensaje: 'Subiste muchas fotos seguidas. Esperá un minuto.' });

router.put('/foto', limiteFotos, requireAuth, imagen, me.cambiarFoto);
router.delete('/foto', requireAuth, me.quitarFoto);

module.exports = router;
