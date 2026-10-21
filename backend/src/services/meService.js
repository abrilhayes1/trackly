// Perfil del usuario logueado (con el nombre de su equipo) y lo que cada uno cambia de sí mismo:
// nombre y foto.
const { ErrorHttp, lanzarSiError } = require('../lib/errores');
const { lanzarErrorDeBase } = require('../lib/configEquipo');

const BUCKET = 'avatares';
const MAX_FOTO = 1024 * 1024;

async function buscarPerfil(supabase, user) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*, tenants(nombre)')
    .eq('id', user.id)
    .maybeSingle();

  lanzarSiError(error);
  return data;
}

// la foto de la cuenta de Google, si entró con Google
function fotoDeGoogle(user) {
  const url = user.user_metadata?.avatar_url || user.user_metadata?.picture;
  return typeof url === 'string' && url.startsWith('https://lh3.googleusercontent.com/') ? url : null;
}

// Devuelve null si el usuario todavía no tiene equipo (tiene que hacer el onboarding).
// Si no tiene equipo pero alguien lo invitó, lo suma a ese equipo antes de responder.
async function perfil(supabase, user) {
  let encontrado = await buscarPerfil(supabase, user);

  if (!encontrado) {
    const { data: unido, error } = await supabase.rpc('aceptar_invitacion');
    lanzarSiError(error);
    if (!unido) return null;
    encontrado = await buscarPerfil(supabase, user);
  }

  // si nunca eligió foto (null; '' es que la quitó) y entró con Google, se usa la de Google
  const google = fotoDeGoogle(user);
  if (encontrado && encontrado.avatar_url === null && google) {
    const { data } = await supabase.rpc('cambiar_mi_foto', { p_url: google });
    if (data) encontrado.avatar_url = data.avatar_url;
  }

  return encontrado;
}

async function cambiarNombre(supabase, user, body) {
  const nombre = typeof body?.nombre === 'string' ? body.nombre : '';
  const { error } = await supabase.rpc('cambiar_mi_nombre', { p_nombre: nombre });
  lanzarErrorDeBase(error);
  return buscarPerfil(supabase, user);
}

// qué tipo de imagen es, mirando los primeros bytes (no alcanza con el encabezado que manda el navegador)
function tipoDeImagen(buffer) {
  if (buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpg';
  if (buffer.length > 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buffer.length > 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  return null;
}

// borra las fotos anteriores de la carpeta del usuario (menos la que se acaba de subir)
async function borrarFotosViejas(supabase, user, salvo) {
  const { data } = await supabase.storage.from(BUCKET).list(user.id);
  const viejas = (data || []).map((f) => `${user.id}/${f.name}`).filter((ruta) => ruta !== salvo);
  if (viejas.length) await supabase.storage.from(BUCKET).remove(viejas);
}

// sube la foto nueva (la app ya la manda achicada), la deja como foto del perfil y borra las anteriores
async function cambiarFoto(supabase, user, buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new ErrorHttp(400, 'No llegó ninguna imagen');
  }
  if (buffer.length > MAX_FOTO) {
    throw new ErrorHttp(413, 'La imagen es demasiado grande (máximo 1 MB)');
  }
  const tipo = tipoDeImagen(buffer);
  if (!tipo) {
    throw new ErrorHttp(400, 'El archivo no es una imagen JPG, PNG o WEBP');
  }

  // un nombre nuevo en cada cambio, así el navegador no muestra la foto vieja guardada
  const ruta = `${user.id}/${Date.now()}.${tipo}`;
  const { error: errorSubida } = await supabase.storage
    .from(BUCKET)
    .upload(ruta, buffer, { contentType: tipo === 'jpg' ? 'image/jpeg' : `image/${tipo}`, upsert: true });
  lanzarSiError(errorSubida);

  const { data: publica } = supabase.storage.from(BUCKET).getPublicUrl(ruta);
  const { error } = await supabase.rpc('cambiar_mi_foto', { p_url: publica.publicUrl });
  lanzarErrorDeBase(error);

  await borrarFotosViejas(supabase, user, ruta);
  return buscarPerfil(supabase, user);
}

// vuelve a las iniciales ('' para que no se vuelva a poner la de Google sola)
async function quitarFoto(supabase, user) {
  const { error } = await supabase.rpc('cambiar_mi_foto', { p_url: '' });
  lanzarErrorDeBase(error);
  await borrarFotosViejas(supabase, user, null);
  return buscarPerfil(supabase, user);
}

module.exports = { perfil, cambiarNombre, cambiarFoto, quitarFoto };
