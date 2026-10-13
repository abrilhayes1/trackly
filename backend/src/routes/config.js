const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const config = require('../controllers/configController');

router.get('/', requireAuth, config.obtener);
router.put('/', requireAuth, config.guardar);
router.get('/equipo', requireAuth, config.equipo);
router.post('/invitaciones', requireAuth, config.invitar);
router.delete('/invitaciones/:id', requireAuth, config.borrarInvitacion);

module.exports = router;
