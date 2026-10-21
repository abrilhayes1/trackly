-- ============================================================
-- MI PERFIL: nombre y foto de cada usuario
-- Correr después de 13_reportes.sql.
-- (se puede ejecutar más de una vez sin duplicar nada)
-- ============================================================

-- 1) Foto de perfil. null = nunca eligió (si entra con Google se usa la de Google);
--    '' = la quitó a propósito (se muestran las iniciales).
alter table profiles add column if not exists avatar_url text;

-- 2) Cambiar el propio nombre. Solo toca el nombre de quien llama (nunca el rol ni el equipo).
--    Las iniciales guardadas se borran para que se calculen de nuevo con el nombre nuevo.
create or replace function cambiar_mi_nombre(p_nombre text)
returns profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nombre text := btrim(coalesce(p_nombre, ''));
  v_perfil profiles;
begin
  if auth.uid() is null then
    raise exception 'Tenés que iniciar sesión' using errcode = '42501';
  end if;
  if char_length(v_nombre) < 2 or char_length(v_nombre) > 80 then
    raise exception 'El nombre tiene que tener entre 2 y 80 caracteres' using errcode = '22023';
  end if;

  update profiles set nombre = v_nombre, avatar_iniciales = null
  where id = auth.uid()
  returning * into v_perfil;

  if not found then
    raise exception 'Perfil no encontrado' using errcode = 'P0002';
  end if;
  return v_perfil;
end;
$$;

revoke execute on function cambiar_mi_nombre(text) from public, anon;
grant execute on function cambiar_mi_nombre(text) to authenticated;

-- 3) Cambiar la propia foto. Acepta: '' (quitarla), una foto subida a la carpeta propia del
--    bucket "avatares" o la foto de la cuenta de Google.
create or replace function cambiar_mi_foto(p_url text)
returns profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text := btrim(coalesce(p_url, ''));
  v_perfil profiles;
begin
  if auth.uid() is null then
    raise exception 'Tenés que iniciar sesión' using errcode = '42501';
  end if;
  if v_url <> ''
     and not (v_url like 'https://%/storage/v1/object/public/avatares/' || auth.uid()::text || '/%')
     and not (v_url like 'https://lh3.googleusercontent.com/%')
     or char_length(v_url) > 500 then
    raise exception 'La foto no es válida' using errcode = '22023';
  end if;

  update profiles set avatar_url = v_url
  where id = auth.uid()
  returning * into v_perfil;

  if not found then
    raise exception 'Perfil no encontrado' using errcode = 'P0002';
  end if;
  return v_perfil;
end;
$$;

revoke execute on function cambiar_mi_foto(text) from public, anon;
grant execute on function cambiar_mi_foto(text) to authenticated;

-- 4) Carpeta (bucket) de fotos en Supabase Storage. Es pública para poder mostrarlas con un
--    enlace (los nombres de archivo no se pueden adivinar). Máximo 1 MB y solo imágenes; la app
--    igual las achica a unos 30 KB antes de subirlas.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatares', 'avatares', true, 1048576, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = true, file_size_limit = 1048576, allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

-- cada persona sube, cambia y borra solo lo que está en su carpeta (avatares/<su id>/...)
drop policy if exists "avatares_subir_propia" on storage.objects;
create policy "avatares_subir_propia"
on storage.objects for insert to authenticated
with check (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatares_cambiar_propia" on storage.objects;
create policy "avatares_cambiar_propia"
on storage.objects for update to authenticated
using (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatares_borrar_propia" on storage.objects;
create policy "avatares_borrar_propia"
on storage.objects for delete to authenticated
using (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text);

-- para listar la carpeta propia (y borrar las fotos viejas al subir una nueva)
drop policy if exists "avatares_ver_propia" on storage.objects;
create policy "avatares_ver_propia"
on storage.objects for select to authenticated
using (bucket_id = 'avatares' and (storage.foldername(name))[1] = auth.uid()::text);
