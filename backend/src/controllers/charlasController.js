const charlasService = require('../services/charlasService');

const listar = async (req, res) => res.json(await charlasService.listar(req.supabase));
const obtener = async (req, res) => res.json(await charlasService.obtener(req.supabase, req.params.id));
const crear = async (req, res) => res.status(201).json(await charlasService.guardar(req.supabase, null, req.body));
const editar = async (req, res) => res.json(await charlasService.guardar(req.supabase, req.params.id, req.body));
const eliminar = async (req, res) => res.json(await charlasService.eliminar(req.supabase, req.params.id));
const invitar = async (req, res) => res.status(201).json(await charlasService.invitar(req.supabase, req.params.id, req.body));
const marcarAsistencia = async (req, res) =>
  res.json(await charlasService.marcarAsistencia(req.supabase, req.params.invitacionId, req.body));
const delLead = async (req, res) => res.json(await charlasService.delLead(req.supabase, req.params.leadId));

module.exports = { listar, obtener, crear, editar, eliminar, invitar, marcarAsistencia, delLead };
