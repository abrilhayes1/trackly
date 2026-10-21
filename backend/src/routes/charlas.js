const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const charlas = require('../controllers/charlasController');

router.get('/', requireAuth, charlas.listar);
router.post('/', requireAuth, charlas.crear);
router.get('/proximas', requireAuth, charlas.contarProximas);
router.get('/lead/:leadId', requireAuth, charlas.delLead);
router.patch('/invitados/:invitacionId', requireAuth, charlas.marcarAsistencia);
router.get('/:id', requireAuth, charlas.obtener);
router.put('/:id', requireAuth, charlas.editar);
router.delete('/:id', requireAuth, charlas.eliminar);
router.post('/:id/invitados', requireAuth, charlas.invitar);

module.exports = router;
