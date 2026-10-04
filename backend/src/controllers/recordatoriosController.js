const recordatoriosService = require('../services/recordatoriosService');

async function listar(req, res) {
  res.json(await recordatoriosService.listar(req.supabase, req.user, req.query.fecha));
}

async function crear(req, res) {
  res.status(201).json(await recordatoriosService.crear(req.supabase, req.user, req.body));
}

async function marcar(req, res) {
  res.json(await recordatoriosService.marcar(req.supabase, req.user, req.params.id, req.body));
}

module.exports = { listar, crear, marcar };
