const plantillasService = require('../services/plantillasService');

const listar = async (req, res) => res.json(await plantillasService.listar(req.supabase));
const crear = async (req, res) => res.status(201).json(await plantillasService.crear(req.supabase, req.user, req.body));
const editar = async (req, res) => res.json(await plantillasService.editar(req.supabase, req.params.id, req.body));
const borrar = async (req, res) => res.json(await plantillasService.borrar(req.supabase, req.params.id));

module.exports = { listar, crear, editar, borrar };
