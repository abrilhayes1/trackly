const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const leads = require('../controllers/leadsController');

router.get('/', requireAuth, leads.listar);
router.get('/buscar', requireAuth, leads.buscar);
router.post('/', requireAuth, leads.crear);
router.patch('/:id', requireAuth, leads.actualizar);
router.get('/:id/historial', requireAuth, leads.listarHistorial);
router.post('/:id/historial', requireAuth, leads.agregarHistorial);

module.exports = router;
