const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const reportes = require('../controllers/reportesController');

router.get('/', requireAuth, reportes.listar);
router.post('/', requireAuth, reportes.crear);
router.put('/:id', requireAuth, reportes.editar);
router.delete('/:id', requireAuth, reportes.borrar);

module.exports = router;
