const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const recordatorios = require('../controllers/recordatoriosController');

router.get('/', requireAuth, recordatorios.listar);
router.post('/', requireAuth, recordatorios.crear);
router.patch('/:id', requireAuth, recordatorios.marcar);

module.exports = router;
