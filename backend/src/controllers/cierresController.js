const cierresService = require('../services/cierresService');

async function listar(req, res) {
  res.json(await cierresService.listar(req.supabase, req.query.tipo));
}

async function obtener(req, res) {
  res.json(await cierresService.obtener(req.supabase, req.params.leadId));
}

async function cerrar(req, res) {
  res.json(await cierresService.cerrar(req.supabase, req.params.leadId, req.body));
}

module.exports = { listar, obtener, cerrar };
