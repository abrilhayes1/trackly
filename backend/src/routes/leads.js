const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const leads = require('../controllers/leadsController');

router.get('/', requireAuth, leads.listar);
router.get('/buscar', requireAuth, leads.buscar);
router.get('/totales', requireAuth, leads.totales);
router.post('/', requireAuth, leads.crear);
router.patch('/:id', requireAuth, leads.actualizar);
router.get('/:id/historial', requireAuth, leads.listarHistorial);
router.post('/:id/historial', requireAuth, leads.agregarHistorial);
router.post('/:id/reclamar', requireAuth, leads.reclamar);
router.post('/:id/reactivar', requireAuth, leads.reactivar);
router.post('/:id/reasignar', requireAuth, leads.reasignar);

module.exports = router;
