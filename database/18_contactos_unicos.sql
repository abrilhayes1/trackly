-- ============================================================
-- CONTACTOS SIN REPETIR Y MÁS DE UN EMAIL POR CONTACTO
-- Correr después de 17_configurables.sql.
-- (se puede ejecutar más de una vez sin duplicar nada)
-- ============================================================
-- - Un contacto puede tener varios emails: el principal (leads.email) y otros (leads.emails_extra).
-- - En un mismo equipo no puede haber dos contactos con el mismo teléfono ni con un email en común,
--   en ningún estado (activos, vencidos, archivados o cerrados). Lo controla la base al crear,
--   editar o importar, así que no depende de la pantalla.
-- - Los contactos repetidos que ya existían no se tocan: la consulta del final los lista para
--   revisarlos a mano.

-- 1) Otros emails del contacto
alter table leads add column if not exists emails_extra text[] not null default '{}';

-- los emails ya cargados quedan en minúscula y sin espacios (así se comparan bien)
update leads set email = nullif(lower(btrim(email)), '')
 where email is distinct from nullif(lower(btrim(email)), '');

-- 2) Todos los emails de un contacto en una lista (para buscar y comparar)
create or replace function emails_de_lead(p_email text, p_extra text[])
returns text[]
language sql
immutable
as $$
  select array_remove(array[p_email] || coalesce(p_extra, '{}'), null)
$$;

-- índices para encontrar rápido un teléfono o un email repetido
create index if not exists leads_tenant_telefono_idx on leads (tenant_id, clave_telefono(telefono));
create index if not exists leads_emails_idx on leads using gin (emails_de_lead(email, emails_extra));

-- 3) Control antes de guardar un contacto: ordena los emails y frena los repetidos
create or replace function controlar_contacto_repetido()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_clave text := clave_telefono(new.telefono);
  v_nuevos text[];
  v_email text;
  v_otro text;
begin
  -- emails en minúscula y sin espacios; los otros, sin vacíos, sin repetir y sin el principal
  new.email := nullif(lower(btrim(new.email)), '');
  select coalesce(array_agg(e order by orden), '{}') into new.emails_extra
    from (
      select lower(btrim(x)) as e, min(o) as orden
        from unnest(coalesce(new.emails_extra, '{}')) with ordinality as u(x, o)
       where btrim(coalesce(x, '')) <> ''
       group by 1
    ) s
   where e is distinct from new.email;

  if cardinality(new.emails_extra) > 10 then
    raise exception 'Un contacto puede tener hasta 10 emails además del principal' using errcode = '22023';
  end if;
  select e into v_email from unnest(emails_de_lead(new.email, new.emails_extra)) as e
   where e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(e) > 150 limit 1;
  if found then
    raise exception 'El email % no es válido', v_email using errcode = '22023';
  end if;

  -- solo se controla lo que cambió (así los repetidos viejos no traban otros cambios)
  if tg_op = 'UPDATE' then
    if v_clave is not distinct from clave_telefono(old.telefono) then
      v_clave := null;
    end if;
    select coalesce(array_agg(e), '{}') into v_nuevos
      from unnest(emails_de_lead(new.email, new.emails_extra)) as e
     where not e = any(emails_de_lead(nullif(lower(btrim(old.email)), ''), old.emails_extra));
  else
    v_nuevos := emails_de_lead(new.email, new.emails_extra);
  end if;
  if v_clave is null and cardinality(v_nuevos) = 0 then
    return new;
  end if;

  -- uno a la vez por equipo, para que dos cargas al mismo tiempo no se salteen el control
  perform pg_advisory_xact_lock(hashtext('contactos:' || coalesce(new.tenant_id::text, '')));

  if v_clave is not null then
    select nombre into v_otro from leads
     where tenant_id = new.tenant_id and id <> new.id and clave_telefono(telefono) = v_clave
     limit 1;
    if found then
      raise exception 'Ya hay un contacto con ese teléfono: %', v_otro using errcode = '23505';
    end if;
  end if;

  if cardinality(v_nuevos) > 0 then
    select l.nombre, e into v_otro, v_email
      from leads l, unnest(emails_de_lead(l.email, l.emails_extra)) as e
     where l.tenant_id = new.tenant_id and l.id <> new.id
       and emails_de_lead(l.email, l.emails_extra) && v_nuevos
       and e = any(v_nuevos)
     limit 1;
    if found then
      raise exception 'Ya hay un contacto con el email %: %', v_email, v_otro using errcode = '23505';
    end if;
  end if;

  return new;
end;
$$;

revoke execute on function controlar_contacto_repetido() from public, anon, authenticated;

drop trigger if exists leads_contacto_repetido on leads;
create trigger leads_contacto_repetido
before insert or update of telefono, email, emails_extra on leads
for each row execute function controlar_contacto_repetido();

-- 4) Importar desde una planilla: igual que en 16_importar_leads.sql, pero también compara con los
--    otros emails de cada contacto
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
  select 'e:' || e from leads, unnest(emails_de_lead(email, emails_extra)) as e
   where tenant_id = v_tenant
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

-- 5) Contactos repetidos que ya estaban cargados (si no devuelve filas, no hay ninguno)
select 'teléfono' as repetido, clave_telefono(telefono) as dato,
       string_agg(nombre || ' (' || estado || ')', ', ') as contactos
  from leads
 where clave_telefono(telefono) is not null
 group by tenant_id, clave_telefono(telefono)
having count(*) > 1
union all
select 'email', e, string_agg(nombre || ' (' || estado || ')', ', ')
  from leads, unnest(emails_de_lead(nullif(lower(btrim(email)), ''), emails_extra)) as e
 group by tenant_id, e
having count(*) > 1;
