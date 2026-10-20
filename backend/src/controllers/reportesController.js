const reportesService = require('../services/reportesService');

const listar = async (req, res) => res.json(await reportesService.listar(req.supabase));
const crear = async (req, res) => res.status(201).json(await reportesService.crear(req.supabase, req.user, req.body));
const editar = async (req, res) => res.json(await reportesService.editar(req.supabase, req.params.id, req.body));
const borrar = async (req, res) => res.json(await reportesService.borrar(req.supabase, req.params.id));

module.exports = { listar, crear, editar, borrar };
