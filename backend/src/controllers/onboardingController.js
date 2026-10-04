const onboardingService = require('../services/onboardingService');

async function completar(req, res) {
  res.status(201).json(await onboardingService.completar(req.supabase, req.user, req.body));
}

module.exports = { completar };
