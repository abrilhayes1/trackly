const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const config = require('../controllers/configController');

router.get('/', requireAuth, config.obtener);

module.exports = router;
