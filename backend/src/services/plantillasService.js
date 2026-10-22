// Plantillas de mensajes para WhatsApp y email. Como los reportes, la RLS decide qué ve cada uno
// (las suyas y las compartidas) y quién comparte con el equipo (solo el líder).
const { ErrorHttp, lanzarSiError } = require('../lib/errores');

const CANALES = ['whatsapp', 'email', 'ambos'];

function datos(body) {
  const texto = (v) => (typeof v === 'string' ? v.trim() : '');
  const nombre = texto(body?.nombre);
  const contenido = texto(body?.texto);
  const asunto = texto(body?.asunto);
  const canal = CANALES.includes(body?.canal) ? body.canal : 'ambos';
  if (!nombre) throw new ErrorHttp(400, 'Ponele un nombre a la plantilla');
  if (nombre.length > 60) throw new ErrorHttp(400, 'El nombre puede tener hasta 60 letras');
  if (!contenido) throw new ErrorHttp(400, 'Escribí el texto del mensaje');
  if (contenido.length > 2000) throw new ErrorHttp(400, 'El mensaje puede tener hasta 2.000 letras');
  if (asunto.length > 150) throw new ErrorHttp(400, 'El asunto puede tener hasta 150 letras');
  return { nombre, texto: contenido, asunto: canal === 'whatsapp' ? null : asunto || null, canal, compartida: body?.compartida === true };
}

function errorPermiso(error) {
  if (error?.code === '42501') throw new ErrorHttp(403, 'Solo el líder puede compartir plantillas con el equipo');
  lanzarSiError(error);
}

const COLUMNAS = '*, autor:profiles(nombre)';

async function listar(supabase) {
  const { data, error } = await supabase.from('plantillas').select(COLUMNAS).order('compartida', { ascending: false }).order('nombre');
  lanzarSiError(error);
  return data;
}

async function crear(supabase, user, body) {
  const { data: perfil, error: errorPerfil } = await supabase.from('profiles').select('tenant_id').eq('id', user.id).single();
  lanzarSiError(errorPerfil);
  const { data, error } = await supabase
    .from('plantillas')
    .insert({ ...datos(body), tenant_id: perfil.tenant_id, creado_por: user.id })
    .select(COLUMNAS)
    .single();
  errorPermiso(error);
  return data;
}

async function editar(supabase, id, body) {
  const { data, error } = await supabase
    .from('plantillas')
    .update({ ...datos(body), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(COLUMNAS)
    .maybeSingle();
  errorPermiso(error);
  if (!data) throw new ErrorHttp(403, 'No podés modificar esta plantilla');
  return data;
}

async function borrar(supabase, id) {
  const { data, error } = await supabase.from('plantillas').delete().eq('id', id).select('id');
  lanzarSiError(error);
  if (!data.length) throw new ErrorHttp(403, 'No podés borrar esta plantilla');
  return { ok: true };
}

module.exports = { listar, crear, editar, borrar };
