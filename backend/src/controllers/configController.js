const configService = require('../services/configService');

async function obtener(req, res) {
  res.json(await configService.obtener(req.supabase));
}

module.exports = { obtener };
