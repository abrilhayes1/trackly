const configService = require('../services/configService');

async function obtener(req, res) {
  res.json(await configService.obtener(req.supabase));
}

async function guardar(req, res) {
  res.json(await configService.guardar(req.supabase, req.body));
}

async function equipo(req, res) {
  res.json(await configService.equipo(req.supabase));
}

async function invitar(req, res) {
  res.status(201).json(await configService.invitar(req.supabase, req.body));
}

async function borrarInvitacion(req, res) {
  res.json(await configService.borrarInvitacion(req.supabase, req.params.id));
}

async function desactivarMiembro(req, res) {
  res.json(await configService.desactivarMiembro(req.supabase, req.params.id));
}

async function reactivarMiembro(req, res) {
  res.json(await configService.reactivarMiembro(req.supabase, req.params.id));
}

async function cambiarRol(req, res) {
  res.json(await configService.cambiarRol(req.supabase, req.params.id, req.body));
}

module.exports = { obtener, guardar, equipo, invitar, borrarInvitacion, desactivarMiembro, reactivarMiembro, cambiarRol };
