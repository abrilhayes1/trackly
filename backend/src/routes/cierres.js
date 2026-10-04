const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const cierres = require('../controllers/cierresController');

router.get('/', requireAuth, cierres.listar);
router.get('/:leadId', requireAuth, cierres.obtener);
router.put('/:leadId', requireAuth, cierres.cerrar);

module.exports = router;
