const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const me = require('../controllers/meController');

router.get('/', requireAuth, me.perfil);

module.exports = router;
