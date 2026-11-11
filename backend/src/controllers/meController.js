const meService = require('../services/meService');

async function perfil(req, res) {
  res.json(await meService.perfil(req.supabase, req.user));
}

async function cambiarNombre(req, res) {
  res.json(await meService.cambiarNombre(req.supabase, req.user, req.body));
}

async function cambiarFoto(req, res) {
  res.json(await meService.cambiarFoto(req.supabase, req.user, req.body));
}

async function quitarFoto(req, res) {
  res.json(await meService.quitarFoto(req.supabase, req.user));
}

async function aceptarInvitacion(req, res) {
  res.json(await meService.aceptarInvitacion(req.supabase, req.user, req.params.id));
}

async function rechazarInvitacion(req, res) {
  res.json(await meService.rechazarInvitacion(req.supabase, req.params.id));
}

module.exports = { perfil, cambiarNombre, cambiarFoto, quitarFoto, aceptarInvitacion, rechazarInvitacion };
