-- ============================================================
-- IMPORTAR CONTACTOS DESDE UNA PLANILLA (Excel o CSV)
-- Correr después de 15_rendimiento.sql.
-- (se puede ejecutar más de una vez sin duplicar nada)
-- ============================================================
-- La app lee el archivo en el navegador y manda las filas de a tandas. Esta función valida cada
-- fila, saltea las repetidas (mismo teléfono o email que un contacto del equipo, o repetidas dentro
-- del mismo archivo) y crea los contactos como activos, con una entrada en su historial.
-- - El asesor importa siempre a su nombre.
-- - El líder elige: a su nombre, a otra persona del equipo o sin asignar (p_asesor_id null y
--   p_sin_asignar true).
-- Devuelve { importados, repetidos: [{fila, nombre, motivo}], errores: [{fila, motivo}] }.

-- teléfono para comparar: solo números y los últimos 10 dígitos (así "+54 9 11 2345-6789",
-- "011 2345 6789" y "1123456789" son el mismo)
create or replace function clave_telefono(p_telefono text)
returns text
language sql
immutable
as $$
  select nullif(right(regexp_replace(coalesce(p_telefono, ''), '\D', '', 'g'), 10), '')
$$;

create or replace function importar_leads(
  p_filas jsonb,
  p_asesor_id uuid default null,
  p_sin_asignar boolean default false,
  p_archivo text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid := current_tenant_id();
  v_rol text := current_user_rol();
  v_asesor uuid;
  v_quien text;
  v_archivo text := nullif(left(btrim(coalesce(p_archivo, '')), 120), '');
  v_fila jsonb;
  v_n int;
  v_nombre text;
  v_telefono text;
  v_email text;
  v_origen text;
  v_consulta text;
  v_clave_tel text;
  v_lead_id uuid;
  v_importados int := 0;
  v_repetidos jsonb := '[]'::jsonb;
  v_errores jsonb := '[]'::jsonb;
begin
  if v_tenant is null then
    raise exception 'Tenés que pertenecer a un equipo para importar' using errcode = '42501';
  end if;
  if jsonb_typeof(p_filas) is distinct from 'array' then
    raise exception 'Las filas tienen que venir en una lista' using errcode = '22023';
  end if;
  if jsonb_array_length(p_filas) > 1000 then
    raise exception 'Se pueden importar hasta 1.000 filas por tanda' using errcode = '22023';
  end if;

  -- a quién se asignan
  if v_rol = 'lider' then
    if p_sin_asignar then
      v_asesor := null;
    else
      v_asesor := coalesce(p_asesor_id, auth.uid());
      if not exists (select 1 from profiles where id = v_asesor and tenant_id = v_tenant) then
        raise exception 'Esa persona no es parte del equipo' using errcode = '22023';
      end if;
    end if;
  else
    if p_sin_asignar or (p_asesor_id is not null and p_asesor_id <> auth.uid()) then
      raise exception 'Solo el líder puede importar contactos para otra persona' using errcode = '42501';
    end if;
    v_asesor := auth.uid();
  end if;

  select nombre into v_quien from profiles where id = auth.uid();

  -- teléfonos y emails que ya tiene el equipo (en cualquier estado), para no duplicar
  create temp table if not exists importar_existentes (clave text primary key) on commit drop;
  truncate importar_existentes;
  insert into importar_existentes (clave)
  select 't:' || clave_telefono(telefono) from leads
   where tenant_id = v_tenant and clave_telefono(telefono) is not null
  union
  select 'e:' || lower(btrim(email)) from leads
   where tenant_id = v_tenant and nullif(btrim(email), '') is not null
  on conflict do nothing;

  for v_fila, v_n in
    select value, ordinality from jsonb_array_elements(p_filas) with ordinality
  loop
    v_nombre := left(btrim(coalesce(v_fila ->> 'nombre', '')), 120);
    v_telefono := nullif(left(btrim(coalesce(v_fila ->> 'telefono', '')), 40), '');
    v_email := nullif(lower(left(btrim(coalesce(v_fila ->> 'email', '')), 150)), '');
    v_origen := nullif(left(btrim(coalesce(v_fila ->> 'origen', '')), 80), '');
    v_consulta := nullif(left(btrim(coalesce(v_fila ->> 'consulta', '')), 2000), '');
    v_clave_tel := clave_telefono(v_telefono);
    -- el número de fila del archivo lo manda la app (si no, la posición en esta tanda)
    v_n := coalesce((v_fila ->> 'fila')::int, v_n);

    if v_nombre = '' then
      v_errores := v_errores || jsonb_build_object('fila', v_n, 'motivo', 'Falta el nombre');
      continue;
    end if;
    if v_clave_tel is null and v_email is null then
      v_errores := v_errores || jsonb_build_object('fila', v_n, 'motivo', 'Falta el teléfono o el email');
      continue;
    end if;
    if v_email is not null and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
      v_errores := v_errores || jsonb_build_object('fila', v_n, 'motivo', 'El email no es válido');
      continue;
    end if;

    if v_clave_tel is not null and exists (select 1 from importar_existentes where clave = 't:' || v_clave_tel) then
      v_repetidos := v_repetidos || jsonb_build_object('fila', v_n, 'nombre', v_nombre, 'motivo', 'Ya hay un contacto con ese teléfono');
      continue;
    end if;
    if v_email is not null and exists (select 1 from importar_existentes where clave = 'e:' || v_email) then
      v_repetidos := v_repetidos || jsonb_build_object('fila', v_n, 'nombre', v_nombre, 'motivo', 'Ya hay un contacto con ese email');
      continue;
    end if;

    insert into leads (tenant_id, asesor_id, nombre, telefono, email, origen, consulta, estado)
    values (v_tenant, v_asesor, v_nombre, v_telefono, v_email, v_origen, v_consulta, 'activo')
    returning id into v_lead_id;

    insert into lead_historial (lead_id, texto, autor_id)
    values (
      v_lead_id,
      'Importado desde una planilla' || coalesce(' (' || v_archivo || ')', '') || ' por ' || coalesce(v_quien, 'alguien del equipo') || '.',
      auth.uid()
    );

    -- lo que se acaba de importar también cuenta para las filas siguientes del archivo
    if v_clave_tel is not null then
      insert into importar_existentes values ('t:' || v_clave_tel) on conflict do nothing;
    end if;
    if v_email is not null then
      insert into importar_existentes values ('e:' || v_email) on conflict do nothing;
    end if;
    v_importados := v_importados + 1;
  end loop;

  return jsonb_build_object('importados', v_importados, 'repetidos', v_repetidos, 'errores', v_errores);
end;
$$;

revoke execute on function importar_leads(jsonb, uuid, boolean, text) from public, anon;
grant execute on function importar_leads(jsonb, uuid, boolean, text) to authenticated;
