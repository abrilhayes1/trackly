const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const plantillas = require('../controllers/plantillasController');

router.get('/', requireAuth, plantillas.listar);
router.post('/', requireAuth, plantillas.crear);
router.put('/:id', requireAuth, plantillas.editar);
router.delete('/:id', requireAuth, plantillas.borrar);

module.exports = router;
