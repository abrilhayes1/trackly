const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const onboarding = require('../controllers/onboardingController');

router.post('/', requireAuth, onboarding.completar);

module.exports = router;
