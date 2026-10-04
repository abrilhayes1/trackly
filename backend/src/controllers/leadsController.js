// Recibe el pedido HTTP, llama al servicio y arma la respuesta.
// Si el servicio lanza un error, Express lo pasa solo al middleware de errores.
const leadsService = require('../services/leadsService');

async function listar(req, res) {
  res.json(await leadsService.listar(req.supabase, req.query.estado));
}

async function buscar(req, res) {
  res.json(await leadsService.buscar(req.supabase, req.query.q));
}

async function crear(req, res) {
  res.status(201).json(await leadsService.crear(req.supabase, req.user, req.body));
}

async function actualizar(req, res) {
  res.json(await leadsService.actualizar(req.supabase, req.user, req.params.id, req.body));
}

async function listarHistorial(req, res) {
  res.json(await leadsService.listarHistorial(req.supabase, req.params.id));
}

async function agregarHistorial(req, res) {
  res.status(201).json(
    await leadsService.agregarHistorial(req.supabase, req.user, req.params.id, req.body)
  );
}

async function reactivar(req, res) {
  res.json(await leadsService.reactivar(req.supabase, req.params.id));
}

module.exports = { listar, buscar, crear, actualizar, listarHistorial, agregarHistorial, reactivar };
