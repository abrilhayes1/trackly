-- ============================================================
-- CONFIGURACIÓN DEL EQUIPO, ONBOARDING E INVITACIONES (RF02, RF05, RF06, RF07 · CU12)
-- Correr después de 7_archivo_y_reclamo.sql.
-- (se puede ejecutar más de una vez sin duplicar nada)
-- ============================================================

-- 1) Configuración nueva por equipo
alter table tenant_config
  add column if not exists termino_contacto text not null default 'Lead',
  add column if not exists termino_contacto_plural text not null default 'Leads',
  add column if not exists categorias_origen text[] not null default '{}',
  add column if not exists eventos_habilitado boolean not null default false,
  add column if not exists termino_evento text not null default 'Charla informativa',
  add column if not exists email_diario boolean not null default true;

-- 2) Invitaciones: el líder carga emails; cuando esa persona crea su cuenta e inicia sesión,
--    entra sola al equipo como asesor (ver aceptar_invitacion)
create table if not exists invitaciones (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  email text not null check (email = lower(trim(email)) and email like '%_@_%._%'),
  rol text not null default 'asesor' check (rol in ('asesor', 'lider')),
  invitado_por uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  aceptada_at timestamptz
);

create unique index if not exists invitaciones_tenant_email_unica on invitaciones (tenant_id, email);

alter table invitaciones enable row level security;
grant select, delete on invitaciones to authenticated;

drop policy if exists "lider_ve_invitaciones_del_equipo" on invitaciones;
create policy "lider_ve_invitaciones_del_equipo"
on invitaciones for select
using (tenant_id = current_tenant_id() and current_user_rol() = 'lider');

drop policy if exists "lider_borra_invitaciones_pendientes" on invitaciones;
create policy "lider_borra_invitaciones_pendientes"
on invitaciones for delete
using (tenant_id = current_tenant_id() and current_user_rol() = 'lider' and aceptada_at is null);

-- 3) Validación común de la configuración (la usan el onboarding y la pantalla de configuración)
create or replace function validar_config_equipo(p jsonb)
returns void
language plpgsql
immutable
as $$
begin
  if coalesce(trim(p->>'termino_contacto'), '') = '' or length(p->>'termino_contacto') > 30 then
    raise exception 'Indicá cómo se llaman tus contactos (hasta 30 letras)' using errcode = '22023';
  end if;
  if coalesce(trim(p->>'termino_contacto_plural'), '') = '' or length(p->>'termino_contacto_plural') > 30 then
    raise exception 'Indicá el plural de cómo se llaman tus contactos' using errcode = '22023';
  end if;
  if (p->>'vencimiento_habilitado')::boolean then
    if coalesce((p->>'dias_vencimiento_lead')::int, 0) not between 1 and 365 then
      raise exception 'El plazo de vencimiento tiene que ser de 1 a 365 días' using errcode = '22023';
    end if;
    if coalesce((p->>'dias_alerta_previa')::int, -1) not between 0 and 30
       or (p->>'dias_alerta_previa')::int >= (p->>'dias_vencimiento_lead')::int then
      raise exception 'El aviso previo tiene que ser menor que el plazo de vencimiento' using errcode = '22023';
    end if;
    if coalesce((p->>'dias_archivo')::int, 0) not between 1 and 365 then
      raise exception 'Los días hasta pasar a Archivo tienen que ser de 1 a 365' using errcode = '22023';
    end if;
  end if;
  if (p->>'eventos_habilitado')::boolean
     and (coalesce(trim(p->>'termino_evento'), '') = '' or length(p->>'termino_evento') > 40) then
    raise exception 'Indicá cómo se llaman tus eventos (hasta 40 letras)' using errcode = '22023';
  end if;
end;
$$;

-- lista de categorías limpia: sin espacios de más, sin vacías y sin repetidas
create or replace function limpiar_categorias(p jsonb)
returns text[]
language sql
immutable
as $$
  select coalesce(array_agg(c order by orden), '{}')
    from (
      select distinct on (lower(trim(valor))) trim(valor) as c, orden
        from jsonb_array_elements_text(coalesce(p, '[]'::jsonb)) with ordinality as t(valor, orden)
       where trim(valor) <> ''
       order by lower(trim(valor)), orden
    ) x;
$$;

-- 4) Onboarding (CU12): crea el equipo, el perfil del líder, la configuración y las invitaciones
--    en UNA sola operación (si algo falla, no queda nada a medias)
create or replace function crear_equipo(p jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid;
  v_email text := lower(auth.jwt() ->> 'email');
  v_venc boolean := coalesce((p->>'vencimiento_habilitado')::boolean, false);
begin
  if auth.uid() is null then
    raise exception 'Tenés que iniciar sesión' using errcode = '42501';
  end if;
  if exists (select 1 from profiles where id = auth.uid()) then
    raise exception 'Tu usuario ya pertenece a un equipo' using errcode = '23505';
  end if;
  if coalesce(trim(p->>'equipo_nombre'), '') = '' or length(p->>'equipo_nombre') > 80 then
    raise exception 'Ingresá el nombre del equipo (hasta 80 letras)' using errcode = '22023';
  end if;
  if coalesce(p->>'rubro', '') = '' then
    raise exception 'Elegí el rubro del equipo' using errcode = '22023';
  end if;
  perform validar_config_equipo(p);

  insert into tenants (nombre, plan, created_by)
  values (trim(p->>'equipo_nombre'), 'individual', auth.uid())
  returning id into v_tenant;

  insert into profiles (id, tenant_id, nombre, rol)
  values (auth.uid(), v_tenant,
          coalesce(nullif(trim(p->>'nombre_usuario'), ''), split_part(v_email, '@', 1), 'Líder'),
          'lider');

  insert into tenant_config (
    tenant_id, rubro, vencimiento_habilitado, dias_vencimiento_lead, dias_alerta_previa, dias_archivo,
    termino_contacto, termino_contacto_plural, categorias_origen, eventos_habilitado, termino_evento,
    email_diario
  ) values (
    v_tenant,
    p->>'rubro',
    v_venc,
    case when v_venc then (p->>'dias_vencimiento_lead')::int end,
    case when v_venc then (p->>'dias_alerta_previa')::int end,
    case when v_venc then (p->>'dias_archivo')::int end,
    trim(p->>'termino_contacto'),
    trim(p->>'termino_contacto_plural'),
    limpiar_categorias(p->'categorias_origen'),
    coalesce((p->>'eventos_habilitado')::boolean, false),
    coalesce(nullif(trim(p->>'termino_evento'), ''), 'Charla informativa'),
    coalesce((p->>'email_diario')::boolean, true)
  );

  insert into invitaciones (tenant_id, email, invitado_por)
  select distinct v_tenant, lower(trim(e)), auth.uid()
    from jsonb_array_elements_text(coalesce(p->'invitados', '[]'::jsonb)) as t(e)
   where trim(e) <> '' and lower(trim(e)) <> coalesce(v_email, '')
  on conflict (tenant_id, email) do nothing;

  return v_tenant;
end;
$$;

-- 5) Pantalla de configuración: solo el líder cambia la configuración de SU equipo
create or replace function guardar_config_equipo(p jsonb)
returns tenant_config
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid := current_tenant_id();
  v_venc boolean := coalesce((p->>'vencimiento_habilitado')::boolean, false);
  v_config tenant_config;
begin
  if v_tenant is null or current_user_rol() <> 'lider' then
    raise exception 'Solo el líder puede cambiar la configuración del equipo' using errcode = '42501';
  end if;
  if coalesce(trim(p->>'equipo_nombre'), '') = '' or length(p->>'equipo_nombre') > 80 then
    raise exception 'Ingresá el nombre del equipo (hasta 80 letras)' using errcode = '22023';
  end if;
  perform validar_config_equipo(p);

  update tenants set nombre = trim(p->>'equipo_nombre') where id = v_tenant;

  update tenant_config set
    rubro = coalesce(p->>'rubro', rubro),
    vencimiento_habilitado = v_venc,
    dias_vencimiento_lead = case when v_venc then (p->>'dias_vencimiento_lead')::int end,
    dias_alerta_previa = case when v_venc then (p->>'dias_alerta_previa')::int end,
    dias_archivo = case when v_venc then (p->>'dias_archivo')::int end,
    termino_contacto = trim(p->>'termino_contacto'),
    termino_contacto_plural = trim(p->>'termino_contacto_plural'),
    categorias_origen = limpiar_categorias(p->'categorias_origen'),
    eventos_habilitado = coalesce((p->>'eventos_habilitado')::boolean, false),
    termino_evento = coalesce(nullif(trim(p->>'termino_evento'), ''), termino_evento),
    email_diario = coalesce((p->>'email_diario')::boolean, true)
  where tenant_id = v_tenant
  returning * into v_config;

  return v_config;
end;
$$;

-- 6) Invitar miembros en cualquier momento (RF02): devuelve cuántos emails nuevos se agregaron
create or replace function invitar_miembros(p_emails text[])
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid := current_tenant_id();
  v_cantidad integer;
begin
  if v_tenant is null or current_user_rol() <> 'lider' then
    raise exception 'Solo el líder puede invitar miembros' using errcode = '42501';
  end if;

  with nuevas as (
    insert into invitaciones (tenant_id, email, invitado_por)
    select distinct v_tenant, lower(trim(e)), auth.uid()
      from unnest(p_emails) as e
     where trim(e) <> ''
       and not exists (
         select 1 from profiles pr join auth.users u on u.id = pr.id
          where pr.tenant_id = v_tenant and lower(u.email) = lower(trim(e))
       )
    on conflict (tenant_id, email) do nothing
    returning 1
  )
  select count(*) into v_cantidad from nuevas;

  return v_cantidad;
end;
$$;

-- 7) Al iniciar sesión sin equipo: si alguien lo invitó, entra a ese equipo con el rol invitado.
--    Devuelve true si lo sumó a un equipo.
create or replace function aceptar_invitacion()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(auth.jwt() ->> 'email');
  v_inv invitaciones;
begin
  if auth.uid() is null or v_email is null then
    return false;
  end if;
  if exists (select 1 from profiles where id = auth.uid()) then
    return false;
  end if;

  -- si lo invitaron de más de un equipo, gana la invitación más reciente
  select * into v_inv from invitaciones
   where email = v_email and aceptada_at is null
   order by created_at desc
   limit 1
   for update;

  if not found then
    return false;
  end if;

  insert into profiles (id, tenant_id, nombre, rol)
  values (auth.uid(), v_inv.tenant_id, split_part(v_email, '@', 1), v_inv.rol);

  update invitaciones set aceptada_at = now() where id = v_inv.id;

  return true;
end;
$$;

-- permisos: solo usuarios con sesión; las validaciones de rol están dentro de cada función
revoke execute on function crear_equipo(jsonb), guardar_config_equipo(jsonb),
  invitar_miembros(text[]), aceptar_invitacion() from public, anon;
grant execute on function crear_equipo(jsonb), guardar_config_equipo(jsonb),
  invitar_miembros(text[]), aceptar_invitacion() to authenticated;
