const meService = require('../services/meService');

async function perfil(req, res) {
  res.json(await meService.perfil(req.supabase, req.user));
}

module.exports = { perfil };
