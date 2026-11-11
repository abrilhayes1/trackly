-- ============================================================
-- ESQUEMA COMPLETO DE LA BASE (foto del 11 de noviembre de 2026, después de 19_licencias.sql)
-- Sacado de Supabase con exportar_esquema.sql. Incluye lo que se creó a mano al principio
-- (tablas base, current_tenant_id, current_user_rol y sus reglas) y todo lo de los scripts 1 a 19.
--
-- Para qué sirve:
--   - Tener versionado lo que existe en la base (antes solo estaba en Supabase).
--   - Reconstruir la base en un proyecto de Supabase NUEVO y vacío: se corre este archivo solo,
--     una vez, en vez de los scripts 1 a 19. No hay que correrlo en la base actual.
-- Si cambia la base, se vuelve a exportar con exportar_esquema.sql y se reemplaza este archivo.
-- ============================================================

-- las funciones se usan entre sí: se validan al usarlas, no al crearlas (igual que pg_dump)
set check_function_bodies = off;

-- extensiones: tarea programada de cada noche y comparar textos sin tildes
create extension if not exists pg_cron;
create extension if not exists unaccent;


-- ------------------------------------------------------------
-- Tablas
-- ------------------------------------------------------------

create table if not exists public.charla_notificados (
  id uuid not null default gen_random_uuid(),
  charla_id uuid not null,
  lead_id uuid not null,
  asistio boolean,
  notificado_at timestamp with time zone not null default now(),
  notificado_por uuid
);
create table if not exists public.charlas (
  id uuid not null default gen_random_uuid(),
  tenant_id uuid not null,
  nombre text not null,
  carrera text,
  fecha timestamp with time zone,
  meet_link text,
  created_by uuid,
  created_at timestamp with time zone not null default now()
);
create table if not exists public.cierres (
  id uuid not null default gen_random_uuid(),
  lead_id uuid not null,
  tenant_id uuid not null,
  tipo text not null,
  producto text,
  modalidad text,
  descuento integer,
  importe numeric(12,2),
  motivo text,
  cerrado_por uuid,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  datos jsonb not null default '{}'::jsonb
);
create table if not exists public.invitaciones (
  id uuid not null default gen_random_uuid(),
  tenant_id uuid not null,
  email text not null,
  rol text not null default 'asesor'::text,
  invitado_por uuid,
  created_at timestamp with time zone not null default now(),
  aceptada_at timestamp with time zone
);
create table if not exists public.lead_historial (
  id uuid not null default gen_random_uuid(),
  lead_id uuid not null,
  texto text not null,
  autor_id uuid,
  created_at timestamp with time zone not null default now()
);
create table if not exists public.leads (
  id uuid not null default gen_random_uuid(),
  tenant_id uuid not null,
  asesor_id uuid,
  nombre text not null,
  telefono text,
  email text,
  origen text,
  consulta text,
  interes text,
  estado text not null default 'activo'::text,
  fijado boolean not null default false,
  fecha_ingreso timestamp with time zone not null default now(),
  ultimo_contacto timestamp with time zone,
  recordatorio timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  vencido_at timestamp with time zone,
  archivado_at timestamp with time zone,
  destacado boolean not null default false,
  emails_extra text[] not null default '{}'::text[]
);
create table if not exists public.plantillas (
  id uuid not null default gen_random_uuid(),
  tenant_id uuid not null,
  creado_por uuid not null,
  compartida boolean not null default false,
  nombre text not null,
  canal text not null default 'ambos'::text,
  asunto text,
  texto text not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);
create table if not exists public.profiles (
  id uuid not null,
  tenant_id uuid not null,
  nombre text not null,
  rol text not null,
  avatar_iniciales text,
  created_at timestamp with time zone not null default now(),
  avatar_url text,
  activo boolean not null default true,
  desactivado_at timestamp with time zone,
  desactivado_por uuid,
  historico boolean not null default false
);
create table if not exists public.recordatorios (
  id uuid not null default gen_random_uuid(),
  tenant_id uuid not null,
  asesor_id uuid not null,
  lead_id uuid,
  hora time without time zone,
  nota text,
  hecho boolean not null default false,
  fecha date not null default CURRENT_DATE,
  created_at timestamp with time zone not null default now(),
  contacto text
);
create table if not exists public.reportes (
  id uuid not null default gen_random_uuid(),
  tenant_id uuid not null,
  nombre text not null,
  definicion jsonb not null,
  creado_por uuid not null,
  compartido boolean not null default false,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);
create table if not exists public.tenant_config (
  tenant_id uuid not null,
  rubro text,
  vencimiento_habilitado boolean not null default false,
  dias_vencimiento_lead integer,
  dias_alerta_previa integer,
  dias_archivo integer,
  termino_contacto text not null default 'Lead'::text,
  termino_contacto_plural text not null default 'Leads'::text,
  categorias_origen text[] not null default '{}'::text[],
  eventos_habilitado boolean not null default false,
  termino_evento text not null default 'Charla informativa'::text,
  email_diario boolean not null default true,
  campos_cierre jsonb not null default '[{"id": "producto", "tipo": "texto", "nombre": "Producto o servicio", "obligatorio": true}, {"id": "importe", "tipo": "numero", "nombre": "Importe", "obligatorio": false}]'::jsonb,
  motivos_perdida text[] not null default ARRAY['Precio'::text, 'Eligió otra opción'::text, 'No respondió'::text, 'Horarios'::text, 'Ya no le interesa'::text],
  dias_habiles boolean not null default false
);
create table if not exists public.tenants (
  id uuid not null default gen_random_uuid(),
  nombre text not null,
  plan text not null default 'individual'::text,
  created_at timestamp with time zone not null default now(),
  created_by uuid,
  licencias integer not null default 1
);

-- ------------------------------------------------------------
-- Funciones
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.aceptar_invitacion()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  select * into v_inv from invitaciones
   where email = v_email and aceptada_at is null
   order by created_at desc
   limit 1
   for update;

  if not found then
    return false;
  end if;

  insert into profiles (id, tenant_id, nombre, rol)
  values (auth.uid(), v_inv.tenant_id, nombre_de_la_cuenta(), v_inv.rol);

  update invitaciones set aceptada_at = now() where id = v_inv.id;
  return true;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.aceptar_invitacion_de(p_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_email text := lower(auth.jwt() ->> 'email');
  v_inv invitaciones;
  v_yo profiles;
begin
  if auth.uid() is null then
    raise exception 'Tenés que iniciar sesión' using errcode = '42501';
  end if;

  select * into v_inv from invitaciones where id = p_id and email = v_email and aceptada_at is null for update;
  if not found then
    raise exception 'Esa invitación ya no está disponible' using errcode = 'P0002';
  end if;

  select * into v_yo from profiles where id = auth.uid();

  if found and v_yo.tenant_id = v_inv.tenant_id then
    -- lo habían desactivado y lo volvieron a invitar al mismo equipo: vuelve a estar activo
    update profiles set activo = true, desactivado_at = null, desactivado_por = null where id = auth.uid();
  else
    if found and v_yo.activo and v_yo.rol = 'lider'
       and exists (select 1 from profiles where tenant_id = v_yo.tenant_id and activo and id <> v_yo.id)
       and not exists (select 1 from profiles where tenant_id = v_yo.tenant_id and activo and rol = 'lider' and id <> v_yo.id) then
      raise exception 'Sos la única persona líder de tu equipo actual. Antes de irte, hacé líder a otra persona desde Configuración.'
        using errcode = '23514';
    end if;
    perform mover_a_equipo(v_inv.tenant_id, v_inv.rol, nombre_de_la_cuenta());
  end if;

  update invitaciones set aceptada_at = now() where id = v_inv.id;
  return true;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.cambiar_mi_foto(p_url text)
 RETURNS profiles
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.cambiar_mi_nombre(p_nombre text)
 RETURNS profiles
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.cambiar_rol_miembro(p_id uuid, p_rol text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_tenant uuid := current_tenant_id();
begin
  if v_tenant is null or current_user_rol() <> 'lider' then
    raise exception 'Solo el líder puede cambiar roles' using errcode = '42501';
  end if;
  if p_rol not in ('asesor', 'lider') then
    raise exception 'Rol inválido' using errcode = '22023';
  end if;
  if p_rol = 'asesor' and not exists (
    select 1 from profiles where tenant_id = v_tenant and activo and rol = 'lider' and id <> p_id
  ) then
    raise exception 'El equipo tiene que tener al menos una persona líder' using errcode = '23514';
  end if;

  update profiles set rol = p_rol where id = p_id and tenant_id = v_tenant and activo;
  if not found then
    raise exception 'Esa persona no es un miembro activo del equipo' using errcode = 'P0002';
  end if;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.cerrar_lead(p_lead_id uuid, p_tipo text, p_producto text, p_modalidad text, p_descuento integer, p_importe numeric, p_motivo text, p_historial text)
 RETURNS cierres
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_tenant uuid;
  v_cierre cierres;
begin
  select tenant_id into v_tenant from leads where id = p_lead_id;
  if v_tenant is null then
    raise exception 'Lead no encontrado' using errcode = 'P0002';
  end if;

  insert into cierres (lead_id, tenant_id, tipo, producto, modalidad, descuento, importe, motivo, cerrado_por)
  values (p_lead_id, v_tenant, p_tipo, p_producto, p_modalidad, p_descuento, p_importe, p_motivo, auth.uid())
  on conflict (lead_id) do update set
    tipo = excluded.tipo,
    producto = excluded.producto,
    modalidad = excluded.modalidad,
    descuento = excluded.descuento,
    importe = excluded.importe,
    motivo = excluded.motivo
  returning * into v_cierre;

  update leads set estado = p_tipo, updated_at = now() where id = p_lead_id;
  if not found then
    raise exception 'No tenés permiso para cerrar este lead' using errcode = '42501';
  end if;

  insert into lead_historial (lead_id, texto, autor_id)
  values (p_lead_id, p_historial, auth.uid());

  return v_cierre;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.clave_telefono(p_telefono text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select nullif(right(regexp_replace(coalesce(p_telefono, ''), '\D', '', 'g'), 10), '')
$function$
;

CREATE OR REPLACE FUNCTION public.controlar_asesor_activo()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  -- mientras una cuenta pasa a otro equipo, sus leads se mueven a su perfil histórico
  if current_setting('trackly.moviendo', true) = '1' then
    return new;
  end if;
  if new.asesor_id is not null
     and (tg_op = 'INSERT' or new.asesor_id is distinct from old.asesor_id)
     and not exists (select 1 from profiles where id = new.asesor_id and activo) then
    raise exception 'Esa persona está desactivada: no se le pueden asignar contactos' using errcode = '22023';
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.controlar_contacto_repetido()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_clave text := clave_telefono(new.telefono);
  v_nuevos text[];
  v_email text;
  v_otro text;
begin
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
$function$
;

CREATE OR REPLACE FUNCTION public.crear_equipo(p jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_tenant uuid;
  v_venc boolean := coalesce((p->>'vencimiento_habilitado')::boolean, false);
begin
  if auth.uid() is null then
    raise exception 'Tenés que iniciar sesión' using errcode = '42501';
  end if;
  if exists (select 1 from profiles where id = auth.uid() and activo) then
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

  perform mover_a_equipo(v_tenant, 'lider', coalesce(nullif(trim(p->>'nombre_usuario'), ''), nombre_de_la_cuenta(), 'Líder'));
  -- el nombre que eligió en el onboarding
  if coalesce(trim(p->>'nombre_usuario'), '') <> '' then
    update profiles set nombre = trim(p->>'nombre_usuario') where id = auth.uid();
  end if;

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

  return v_tenant;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.current_tenant_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ select tenant_id::uuid from profiles where id = auth.uid() and activo $function$
;

CREATE OR REPLACE FUNCTION public.current_user_rol()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ select rol::text from profiles where id = auth.uid() and activo $function$
;

CREATE OR REPLACE FUNCTION public.desactivar_miembro(p_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_tenant uuid := current_tenant_id();
  v_leads integer;
begin
  if v_tenant is null or current_user_rol() <> 'lider' then
    raise exception 'Solo el líder puede desactivar miembros' using errcode = '42501';
  end if;
  if p_id = auth.uid() then
    raise exception 'No podés desactivarte a vos' using errcode = '22023';
  end if;

  update profiles
     set activo = false, desactivado_at = now(), desactivado_por = auth.uid()
   where id = p_id and tenant_id = v_tenant and activo;
  if not found then
    raise exception 'Esa persona no es un miembro activo del equipo' using errcode = 'P0002';
  end if;

  select count(*) into v_leads from leads where asesor_id = p_id and estado in ('activo', 'vencido');
  return v_leads;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.dias_transcurridos(p_desde timestamp with time zone, p_hasta timestamp with time zone, p_habiles boolean)
 RETURNS integer
 LANGUAGE sql
 STABLE
AS $function$
  select case
    when not p_habiles then floor(extract(epoch from (p_hasta - p_desde)) / 86400)::int
    else (
      select count(*)::int
        from generate_series(
               (p_desde at time zone 'America/Argentina/Buenos_Aires')::date + 1,
               (p_hasta at time zone 'America/Argentina/Buenos_Aires')::date - 1,
               interval '1 day') as d
       where extract(isodow from d) < 6
    )
  end
$function$
;

CREATE OR REPLACE FUNCTION public.eliminar_charla(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_tenant uuid := current_tenant_id();
begin
  if v_tenant is null or current_user_rol() <> 'lider' then
    raise exception 'Solo el líder puede eliminar charlas' using errcode = '42501';
  end if;
  if not exists (select 1 from charlas where id = p_id and tenant_id = v_tenant) then
    raise exception 'Charla no encontrada' using errcode = 'P0002';
  end if;

  delete from charla_notificados where charla_id = p_id;
  delete from charlas where id = p_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.emails_de_lead(p_email text, p_extra text[])
 RETURNS text[]
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select array_remove(array[p_email] || coalesce(p_extra, '{}'), null)
$function$
;

CREATE OR REPLACE FUNCTION public.guardar_charla(p_id uuid, p_nombre text, p_fecha timestamp with time zone, p_categoria text, p_link text)
 RETURNS charlas
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_tenant uuid := current_tenant_id();
  v_charla charlas;
begin
  if v_tenant is null or current_user_rol() <> 'lider' then
    raise exception 'Solo el líder puede crear o editar charlas' using errcode = '42501';
  end if;
  if coalesce(trim(p_nombre), '') = '' or length(p_nombre) > 120 then
    raise exception 'Ingresá el nombre de la charla (hasta 120 letras)' using errcode = '22023';
  end if;
  if p_fecha is null then
    raise exception 'Indicá la fecha y la hora' using errcode = '22023';
  end if;
  if length(coalesce(p_categoria, '')) > 80 then
    raise exception 'La categoría es demasiado larga' using errcode = '22023';
  end if;
  if nullif(trim(coalesce(p_link, '')), '') is not null and trim(p_link) !~* '^https?://' then
    raise exception 'El enlace de la reunión tiene que empezar con https://' using errcode = '22023';
  end if;

  begin
    if p_id is null then
      insert into charlas (tenant_id, nombre, carrera, fecha, meet_link, created_by)
      values (v_tenant, trim(p_nombre), nullif(trim(coalesce(p_categoria, '')), ''), p_fecha,
              nullif(trim(coalesce(p_link, '')), ''), auth.uid())
      returning * into v_charla;
    else
      update charlas set
        nombre = trim(p_nombre),
        carrera = nullif(trim(coalesce(p_categoria, '')), ''),
        fecha = p_fecha,
        meet_link = nullif(trim(coalesce(p_link, '')), '')
      where id = p_id and tenant_id = v_tenant
      returning * into v_charla;
      if not found then
        raise exception 'Charla no encontrada' using errcode = 'P0002';
      end if;
    end if;
  exception when unique_violation then
    raise exception 'Ya hay una charla "%" ese mismo día', trim(p_nombre) using errcode = '23505';
  end;

  return v_charla;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.guardar_config_equipo(p jsonb)
 RETURNS tenant_config
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  if p ? 'campos_cierre' then
    perform validar_campos_cierre(p->'campos_cierre');
  end if;

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
    email_diario = coalesce((p->>'email_diario')::boolean, true),
    campos_cierre = coalesce(p->'campos_cierre', campos_cierre),
    motivos_perdida = case when p ? 'motivos_perdida' then limpiar_motivos(p->'motivos_perdida') else motivos_perdida end,
    dias_habiles = coalesce((p->>'dias_habiles')::boolean, dias_habiles)
  where tenant_id = v_tenant
  returning * into v_config;

  return v_config;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.importar_leads(p_filas jsonb, p_asesor_id uuid DEFAULT NULL::uuid, p_sin_asignar boolean DEFAULT false, p_archivo text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.invitar_a_charla(p_charla_id uuid, p_lead_id uuid)
 RETURNS charla_notificados
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_tenant uuid := current_tenant_id();
  v_charla charlas;
  v_lead leads;
  v_inv charla_notificados;
begin
  if v_tenant is null then
    raise exception 'Tenés que iniciar sesión' using errcode = '42501';
  end if;

  select * into v_charla from charlas where id = p_charla_id and tenant_id = v_tenant;
  if not found then
    raise exception 'Charla no encontrada' using errcode = 'P0002';
  end if;
  select * into v_lead from leads where id = p_lead_id and tenant_id = v_tenant;
  if not found then
    raise exception 'Lead no encontrado' using errcode = 'P0002';
  end if;
  if current_user_rol() <> 'lider' and v_lead.asesor_id is distinct from auth.uid() then
    raise exception 'Solo podés invitar a tus propios contactos' using errcode = '42501';
  end if;

  insert into charla_notificados (charla_id, lead_id, notificado_por)
  values (p_charla_id, p_lead_id, auth.uid())
  on conflict (charla_id, lead_id) do nothing
  returning * into v_inv;

  if v_inv.id is null then
    raise exception '% ya estaba invitado a esta charla', v_lead.nombre using errcode = '23505';
  end if;

  insert into lead_historial (lead_id, texto, autor_id)
  values (p_lead_id,
          'Invitado a "' || v_charla.nombre || '" del '
            || to_char(v_charla.fecha at time zone 'America/Argentina/Buenos_Aires', 'DD/MM/YYYY "a las" HH24:MI') || '.',
          auth.uid());

  return v_inv;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.invitar_miembros(p_emails text[])
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_tenant uuid := current_tenant_id();
  v_nuevos text[];
  v_libres integer;
  v_licencias integer;
begin
  if v_tenant is null or current_user_rol() <> 'lider' then
    raise exception 'Solo el líder puede invitar miembros' using errcode = '42501';
  end if;

  -- emails que todavía no están en el equipo (activos o desactivados) ni invitados
  select coalesce(array_agg(distinct e), '{}') into v_nuevos
    from (select lower(trim(x)) as e from unnest(p_emails) as x) t
   where e <> ''
     and not exists (select 1 from invitaciones i where i.tenant_id = v_tenant and i.email = t.e and i.aceptada_at is null)
     and not exists (
       select 1 from profiles pr join auth.users u on u.id = pr.id
        where pr.tenant_id = v_tenant and lower(u.email) = t.e
     );

  if cardinality(v_nuevos) = 0 then
    return 0;
  end if;

  select licencias into v_licencias from tenants where id = v_tenant;
  v_libres := v_licencias - licencias_usadas(v_tenant);
  if cardinality(v_nuevos) > v_libres then
    raise exception '%',
      case when v_libres <= 0
        then mensaje_sin_licencias(v_licencias)
        else format('Te %s %s %s: invitá hasta %s %s.',
               case when v_libres = 1 then 'queda' else 'quedan' end, v_libres,
               case when v_libres = 1 then 'licencia libre' else 'licencias libres' end,
               v_libres, case when v_libres = 1 then 'persona' else 'personas' end)
      end
      using errcode = '23514';
  end if;

  -- si esa persona ya había estado (invitación aceptada y después se fue), se la puede volver a invitar
  delete from invitaciones where tenant_id = v_tenant and email = any(v_nuevos) and aceptada_at is not null;

  insert into invitaciones (tenant_id, email, invitado_por)
  select v_tenant, e, auth.uid() from unnest(v_nuevos) as e;

  return cardinality(v_nuevos);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.licencias_usadas(p_tenant uuid)
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select ((select count(*) from profiles where tenant_id = p_tenant and activo)
        + (select count(*) from invitaciones where tenant_id = p_tenant and aceptada_at is null))::int
$function$
;

CREATE OR REPLACE FUNCTION public.limpiar_categorias(p jsonb)
 RETURNS text[]
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select coalesce(array_agg(c order by orden), '{}')
    from (
      select distinct on (lower(trim(valor))) trim(valor) as c, orden
        from jsonb_array_elements_text(coalesce(p, '[]'::jsonb)) with ordinality as t(valor, orden)
       where trim(valor) <> ''
       order by lower(trim(valor)), orden
    ) x;
$function$
;

CREATE OR REPLACE FUNCTION public.limpiar_datos_cierre(p_campos jsonb, p_datos jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
declare
  c jsonb;
  v_valor text;
  v_limpio jsonb := '{}'::jsonb;
begin
  for c in select * from jsonb_array_elements(p_campos) loop
    v_valor := nullif(trim(coalesce(p_datos->>(c->>'id'), '')), '');

    if v_valor is null then
      if (c->>'obligatorio')::boolean then
        raise exception 'Completá "%"', c->>'nombre' using errcode = '22023';
      end if;
      continue;
    end if;

    if c->>'tipo' = 'numero' then
      v_valor := replace(v_valor, ',', '.');
      if v_valor !~ '^-?[0-9]{1,12}(\.[0-9]{1,2})?$' then
        raise exception '"%" tiene que ser un número', c->>'nombre' using errcode = '22023';
      end if;
      v_limpio := v_limpio || jsonb_build_object(c->>'id', v_valor::numeric);
    elsif c->>'tipo' = 'lista' then
      if not (c->'opciones' ? v_valor) then
        raise exception 'Elegí una opción válida para "%"', c->>'nombre' using errcode = '22023';
      end if;
      v_limpio := v_limpio || jsonb_build_object(c->>'id', v_valor);
    else
      if length(v_valor) > 200 then
        raise exception '"%" es demasiado largo (hasta 200 letras)', c->>'nombre' using errcode = '22023';
      end if;
      v_limpio := v_limpio || jsonb_build_object(c->>'id', v_valor);
    end if;
  end loop;

  return v_limpio;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.limpiar_motivos(p jsonb)
 RETURNS text[]
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
declare
  v text[];
begin
  if p is null or jsonb_typeof(p) <> 'array' then
    raise exception 'Los motivos tienen que venir en una lista' using errcode = '22023';
  end if;
  select coalesce(array_agg(m order by orden), '{}') into v
    from (
      select distinct on (lower(btrim(value))) btrim(value) as m, ordinality as orden
        from jsonb_array_elements_text(p) with ordinality
       where btrim(value) <> ''
       order by lower(btrim(value)), ordinality
    ) x;
  if array_length(v, 1) > 20 then
    raise exception 'Podés tener hasta 20 motivos de pérdida' using errcode = '22023';
  end if;
  if exists (select 1 from unnest(v) m where length(m) > 60) then
    raise exception 'Cada motivo puede tener hasta 60 letras' using errcode = '22023';
  end if;
  return v;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.marcar_asistencia(p_invitacion_id uuid, p_asistio boolean)
 RETURNS charla_notificados
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_tenant uuid := current_tenant_id();
  v_inv charla_notificados;
  v_charla charlas;
  v_lead leads;
begin
  select * into v_inv from charla_notificados where id = p_invitacion_id for update;
  select * into v_charla from charlas where id = v_inv.charla_id and tenant_id = v_tenant;
  if v_inv.id is null or v_charla.id is null then
    raise exception 'Invitación no encontrada' using errcode = 'P0002';
  end if;
  select * into v_lead from leads where id = v_inv.lead_id;
  if current_user_rol() <> 'lider' and v_lead.asesor_id is distinct from auth.uid() then
    raise exception 'Solo podés registrar la asistencia de tus propios contactos' using errcode = '42501';
  end if;

  update charla_notificados set asistio = p_asistio where id = p_invitacion_id returning * into v_inv;

  if p_asistio is not null then
    insert into lead_historial (lead_id, texto, autor_id)
    values (v_lead.id,
            case when p_asistio then 'Asistió a "' else 'No asistió a "' end || v_charla.nombre || '".',
            auth.uid());
  end if;

  return v_inv;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.mensaje_sin_licencias(p_licencias integer)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select case when p_licencias = 1
    then 'Tu equipo tiene 1 licencia, la tuya. Para sumar personas necesitás más licencias.'
    else format('Usaste las %s licencias del equipo. Desactivá a alguien o pedí más licencias.', p_licencias)
  end
$function$
;

CREATE OR REPLACE FUNCTION public.mi_estado()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select jsonb_build_object('activo', p.activo, 'equipo', t.nombre::text, 'desactivado_at', p.desactivado_at)
    from profiles p
    join tenants t on t.id = p.tenant_id
   where p.id = auth.uid()
$function$
;

CREATE OR REPLACE FUNCTION public.mis_invitaciones()
 RETURNS TABLE(id uuid, equipo text, rol text, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select i.id, t.nombre::text, i.rol::text, i.created_at
    from invitaciones i
    join tenants t on t.id = i.tenant_id
   where i.email = lower(auth.jwt() ->> 'email')
     and i.aceptada_at is null
     and i.tenant_id is distinct from (select p.tenant_id from profiles p where p.id = auth.uid() and p.activo)
   order by i.created_at desc
$function$
;

CREATE OR REPLACE FUNCTION public.mover_a_equipo(p_tenant uuid, p_rol text, p_nombre text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_viejo profiles;
  v_historico uuid;
  r record;
  v_columna text;
begin
  select * into v_viejo from profiles where id = v_uid for update;

  if not found then
    insert into profiles (id, tenant_id, nombre, rol) values (v_uid, p_tenant, p_nombre, p_rol);
    return;
  end if;

  v_historico := gen_random_uuid();
  perform set_config('trackly.moviendo', '1', true);

  -- copia del perfil para el equipo anterior (sin foto: la foto es de la persona)
  insert into profiles
  select * from jsonb_populate_record(
    null::profiles,
    to_jsonb(v_viejo) || jsonb_build_object(
      'id', v_historico,
      'avatar_url', null,
      'activo', false,
      'historico', true,
      'desactivado_at', coalesce(v_viejo.desactivado_at, now())
    )
  );

  -- todo lo que apuntaba al perfil pasa al histórico: primero las columnas con referencia a profiles...
  for r in
    select c.conrelid::regclass as tabla, a.attname as columna
      from pg_constraint c
      join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
     where c.contype = 'f' and c.confrelid = 'public.profiles'::regclass and array_length(c.conkey, 1) = 1
  loop
    execute format('update %s set %I = $1 where %I = $2', r.tabla, r.columna, r.columna) using v_historico, v_uid;
  end loop;

  -- ...y después las que guardan el id sin referencia declarada (si existen)
  foreach v_columna in array array[
    'leads.asesor_id', 'lead_historial.autor_id', 'recordatorios.asesor_id', 'charlas.created_by',
    'tenants.created_by', 'cierres.cerrado_por', 'charla_notificados.notificado_por',
    'plantillas.creado_por', 'reportes.creado_por', 'invitaciones.invitado_por', 'profiles.desactivado_por'
  ]
  loop
    if exists (
      select 1 from information_schema.columns
       where table_schema = 'public'
         and table_name = split_part(v_columna, '.', 1)
         and column_name = split_part(v_columna, '.', 2)
    ) then
      execute format('update public.%I set %I = $1 where %I = $2',
        split_part(v_columna, '.', 1), split_part(v_columna, '.', 2), split_part(v_columna, '.', 2))
      using v_historico, v_uid;
    end if;
  end loop;

  perform set_config('trackly.moviendo', '', true);

  -- la cuenta queda en el equipo nuevo, activa (conserva su nombre y su foto)
  update profiles
     set tenant_id = p_tenant, rol = p_rol, activo = true, historico = false,
         desactivado_at = null, desactivado_por = null
   where id = v_uid;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.nombre_de_la_cuenta()
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
  select coalesce(
    nullif(trim(auth.jwt() -> 'user_metadata' ->> 'full_name'), ''),
    nullif(trim(auth.jwt() -> 'user_metadata' ->> 'name'), ''),
    split_part(lower(auth.jwt() ->> 'email'), '@', 1)
  )
$function$
;

CREATE OR REPLACE FUNCTION public.normalizar_texto(txt text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public', 'extensions'
AS $function$
  select lower(trim(unaccent(txt)))
$function$
;

CREATE OR REPLACE FUNCTION public.procesar_vencimientos()
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_vencidos integer;
  v_archivados integer;
begin
  with archivados as (
    update leads l
       set estado = 'archivo',
           archivado_at = now(),
           updated_at = now()
      from tenant_config c
     where c.tenant_id = l.tenant_id
       and c.vencimiento_habilitado
       and c.dias_archivo is not null
       and l.estado = 'vencido'
       and dias_transcurridos(coalesce(l.vencido_at, l.updated_at), now(), c.dias_habiles) >= c.dias_archivo
    returning l.id, c.dias_archivo as dias, c.dias_habiles as habiles
  ),
  historial as (
    insert into lead_historial (lead_id, texto, autor_id)
    select id,
           'Pasó a Archivo: estuvo ' || dias || case when habiles then ' días hábiles' else ' días' end
             || ' vencido sin que nadie lo reclamara.',
           null
      from archivados
    returning 1
  )
  select count(*) into v_archivados from archivados;

  with vencidos as (
    update leads l
       set estado = 'vencido',
           vencido_at = now(),
           updated_at = now()
      from tenant_config c
     where c.tenant_id = l.tenant_id
       and c.vencimiento_habilitado
       and c.dias_vencimiento_lead is not null
       and l.estado = 'activo'
       and dias_transcurridos(coalesce(l.ultimo_contacto, l.fecha_ingreso), now(), c.dias_habiles) >= c.dias_vencimiento_lead
    returning l.id, c.dias_vencimiento_lead as plazo, c.dias_habiles as habiles
  ),
  historial as (
    insert into lead_historial (lead_id, texto, autor_id)
    select id,
           'Venció por falta de contacto (plazo de ' || plazo || case when habiles then ' días hábiles' else ' días' end
             || '). Quedó disponible para que cualquier asesor lo reclame.',
           null
      from vencidos
    returning 1
  )
  select count(*) into v_vencidos from vencidos;

  return jsonb_build_object('vencidos', v_vencidos, 'archivados', v_archivados);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.proteger_licencias()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if current_user in ('authenticated', 'anon') and new.licencias is distinct from old.licencias then
    raise exception 'Las licencias las carga el administrador de Trackly' using errcode = '42501';
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.proteger_perfil()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'INSERT' then
      raise exception 'No se puede crear un perfil directamente' using errcode = '42501';
    end if;
    if new.activo is distinct from old.activo
       or new.historico is distinct from old.historico
       or new.desactivado_at is distinct from old.desactivado_at
       or new.desactivado_por is distinct from old.desactivado_por
       or new.tenant_id is distinct from old.tenant_id
       or new.rol is distinct from old.rol then
      raise exception 'Ese dato del perfil solo lo puede cambiar el líder' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.reactivar_lead(p_lead_id uuid)
 RETURNS leads
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select tomar_lead(p_lead_id, 'archivo');
$function$
;

CREATE OR REPLACE FUNCTION public.reactivar_miembro(p_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_tenant uuid := current_tenant_id();
  v_licencias integer;
begin
  if v_tenant is null or current_user_rol() <> 'lider' then
    raise exception 'Solo el líder puede reactivar miembros' using errcode = '42501';
  end if;
  if exists (select 1 from profiles where id = p_id and tenant_id = v_tenant and historico) then
    raise exception 'Esa persona ahora está en otro equipo. Si vuelve, invitala de nuevo.' using errcode = '22023';
  end if;

  select licencias into v_licencias from tenants where id = v_tenant for update;
  if licencias_usadas(v_tenant) >= v_licencias then
    raise exception '%', mensaje_sin_licencias(v_licencias) using errcode = '23514';
  end if;

  update profiles
     set activo = true, desactivado_at = null, desactivado_por = null
   where id = p_id and tenant_id = v_tenant and not activo and not historico;
  if not found then
    raise exception 'Esa persona no está desactivada en el equipo' using errcode = 'P0002';
  end if;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.reasignar_lead(p_lead_id uuid, p_asesor_id uuid)
 RETURNS leads
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_tenant uuid := current_tenant_id();
  v_antes leads;
  v_lead leads;
  v_lider text;
  v_anterior text;
  v_nuevo text;
begin
  if v_tenant is null or current_user_rol() <> 'lider' then
    raise exception 'Solo el líder puede reasignar leads' using errcode = '42501';
  end if;

  select * into v_antes from leads where id = p_lead_id for update;
  if not found or v_antes.tenant_id is distinct from v_tenant then
    raise exception 'Lead no encontrado' using errcode = 'P0002';
  end if;
  if v_antes.estado <> 'activo' then
    raise exception 'Solo se pueden reasignar leads activos (este está %)', v_antes.estado
      using errcode = '23514';
  end if;

  select nombre into v_nuevo from profiles where id = p_asesor_id and tenant_id = v_tenant;
  if v_nuevo is null then
    raise exception 'Esa persona no es parte del equipo' using errcode = '22023';
  end if;
  if v_antes.asesor_id = p_asesor_id then
    raise exception 'El lead ya está asignado a %', v_nuevo using errcode = '22023';
  end if;

  update leads set asesor_id = p_asesor_id, updated_at = now()
   where id = p_lead_id
   returning * into v_lead;

  select nombre into v_lider from profiles where id = auth.uid();
  select nombre into v_anterior from profiles where id = v_antes.asesor_id;

  insert into lead_historial (lead_id, texto, autor_id)
  values (
    p_lead_id,
    case when v_antes.asesor_id is null
      then 'Asignado a ' || v_nuevo || ' por ' || coalesce(v_lider, 'el líder') || '.'
      else 'Reasignado de ' || coalesce(v_anterior, 'otro asesor') || ' a ' || v_nuevo
           || ' por ' || coalesce(v_lider, 'el líder') || '.'
    end,
    auth.uid()
  );

  return v_lead;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rechazar_invitacion(p_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  delete from invitaciones
   where id = p_id and email = lower(auth.jwt() ->> 'email') and aceptada_at is null;
  return found;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.reclamar_lead(p_lead_id uuid)
 RETURNS leads
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select tomar_lead(p_lead_id, 'vencido');
$function$
;

CREATE OR REPLACE FUNCTION public.registrar_cierre(p_lead_id uuid, p_tipo text, p_datos jsonb, p_motivo text)
 RETURNS cierres
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_tenant uuid;
  v_campos jsonb;
  v_datos jsonb := '{}'::jsonb;
  v_motivo text := nullif(trim(coalesce(p_motivo, '')), '');
  v_anterior text;
  v_detalle text;
  v_inicio text;
  v_cierre cierres;
begin
  if p_tipo is null or p_tipo not in ('ganado', 'perdido') then
    raise exception 'El cierre tiene que ser ganado o perdido' using errcode = '22023';
  end if;

  select tenant_id into v_tenant from leads where id = p_lead_id;
  if v_tenant is null then
    raise exception 'Lead no encontrado' using errcode = 'P0002';
  end if;

  select tipo into v_anterior from cierres where lead_id = p_lead_id;

  if p_tipo = 'ganado' then
    select campos_cierre into v_campos from tenant_config where tenant_id = v_tenant;
    v_campos := coalesce(v_campos, '[]'::jsonb);
    v_datos := limpiar_datos_cierre(v_campos, coalesce(p_datos, '{}'::jsonb));
    v_motivo := null;

    select string_agg((c->>'nombre') || ': ' || (v_datos->>(c->>'id')), ' · ' order by orden)
      into v_detalle
      from jsonb_array_elements(v_campos) with ordinality as x(c, orden)
     where v_datos ? (c->>'id');
  else
    if length(v_motivo) > 500 then
      raise exception 'El motivo es demasiado largo (hasta 500 letras)' using errcode = '22023';
    end if;
    v_detalle := case when v_motivo is not null then 'motivo: ' || v_motivo end;
  end if;

  insert into cierres (lead_id, tenant_id, tipo, datos, motivo, cerrado_por)
  values (p_lead_id, v_tenant, p_tipo, v_datos, v_motivo, auth.uid())
  on conflict (lead_id) do update set
    tipo = excluded.tipo,
    datos = excluded.datos,
    motivo = excluded.motivo,
    producto = null,
    modalidad = null,
    descuento = null,
    importe = null
  returning * into v_cierre;

  update leads set estado = p_tipo, updated_at = now() where id = p_lead_id;
  if not found then
    raise exception 'No tenés permiso para cerrar este lead' using errcode = '42501';
  end if;

  v_inicio := case
    when v_anterior is null then 'Cerrado como ' || p_tipo
    when v_anterior <> p_tipo then 'Cierre cambiado de ' || v_anterior || ' a ' || p_tipo
    else 'Cierre ' || p_tipo || ' modificado'
  end;

  insert into lead_historial (lead_id, texto, autor_id)
  values (p_lead_id, v_inicio || coalesce(': ' || v_detalle, '') || '.', auth.uid());

  return v_cierre;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.tomar_lead(p_lead_id uuid, p_desde text)
 RETURNS leads
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_antes leads;
  v_lead leads;
  v_nombre text;
  v_anterior text;
  v_texto text;
begin
  if auth.uid() is null then
    raise exception 'Tenés que iniciar sesión' using errcode = '42501';
  end if;

  select * into v_antes from leads where id = p_lead_id for update;

  if not found or v_antes.tenant_id is distinct from current_tenant_id() then
    raise exception 'Lead no encontrado' using errcode = 'P0002';
  end if;

  if v_antes.estado <> p_desde then
    if p_desde = 'vencido' then
      raise exception 'Este lead ya no está disponible: otro asesor lo reclamó o cambió de estado.'
        using errcode = '23514';
    end if;
    raise exception 'Este lead ya no está en Archivo: otro asesor lo reactivó o cambió de estado.'
      using errcode = '23514';
  end if;

  update leads
     set estado = 'activo',
         asesor_id = auth.uid(),
         ultimo_contacto = now(),
         vencido_at = null,
         archivado_at = null,
         updated_at = now()
   where id = p_lead_id
   returning * into v_lead;

  select nombre into v_nombre from profiles where id = auth.uid();
  select nombre into v_anterior from profiles where id = v_antes.asesor_id;

  v_texto := case when p_desde = 'vencido' then 'Reclamado por ' else 'Reactivado desde Archivo por ' end
             || coalesce(v_nombre, 'un usuario')
             || '. El conteo de días sin contacto vuelve a empezar.';
  if v_antes.asesor_id is distinct from auth.uid() then
    v_texto := v_texto || case
      when v_anterior is null then ' Estaba sin asesor asignado.'
      else ' Estaba asignado a ' || v_anterior || '.'
    end;
  end if;

  insert into lead_historial (lead_id, texto, autor_id)
  values (p_lead_id, v_texto, auth.uid());

  return v_lead;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.validar_campos_cierre(p jsonb)
 RETURNS void
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
declare
  c jsonb;
begin
  if jsonb_typeof(p) <> 'array' then
    raise exception 'Los campos de cierre tienen que venir en una lista' using errcode = '22023';
  end if;
  if jsonb_array_length(p) > 15 then
    raise exception 'Puede haber hasta 15 campos de cierre' using errcode = '22023';
  end if;
  if (select count(distinct x->>'id') from jsonb_array_elements(p) x) <> jsonb_array_length(p) then
    raise exception 'Hay campos de cierre repetidos' using errcode = '22023';
  end if;
  if (select count(distinct lower(trim(x->>'nombre'))) from jsonb_array_elements(p) x) <> jsonb_array_length(p) then
    raise exception 'Hay dos campos de cierre con el mismo nombre' using errcode = '22023';
  end if;

  for c in select * from jsonb_array_elements(p) loop
    if coalesce(c->>'id', '') !~ '^[a-z0-9_]{1,30}$' then
      raise exception 'Un campo de cierre no tiene un identificador válido' using errcode = '22023';
    end if;
    if coalesce(trim(c->>'nombre'), '') = '' or length(c->>'nombre') > 40 then
      raise exception 'Cada campo de cierre necesita un nombre (hasta 40 letras)' using errcode = '22023';
    end if;
    if coalesce(c->>'tipo', '') not in ('texto', 'numero', 'lista') then
      raise exception 'El campo "%" tiene un tipo inválido', c->>'nombre' using errcode = '22023';
    end if;
    if c->>'tipo' = 'lista' and (
         jsonb_typeof(c->'opciones') is distinct from 'array'
         or jsonb_array_length(c->'opciones') = 0
         or jsonb_array_length(c->'opciones') > 30) then
      raise exception 'El campo "%" es una lista: cargale entre 1 y 30 opciones', c->>'nombre'
        using errcode = '22023';
    end if;
  end loop;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.validar_config_equipo(p jsonb)
 RETURNS void
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.validar_estado_cierre()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new.estado in ('ganado', 'perdido') and new.estado is distinct from old.estado then
    if not exists (
      select 1 from cierres where lead_id = new.id and tipo = new.estado
    ) then
      raise exception 'Para cerrar un lead hay que registrar el cierre'
        using errcode = '23514';
    end if;
  end if;
  return new;
end;
$function$
;


-- ------------------------------------------------------------
-- Claves primarias, únicas y checks
-- ------------------------------------------------------------

alter table charla_notificados add constraint charla_notificados_pkey PRIMARY KEY (id);
alter table charla_notificados add constraint charla_notificados_charla_id_lead_id_key UNIQUE (charla_id, lead_id);
alter table charlas add constraint charlas_pkey PRIMARY KEY (id);
alter table cierres add constraint cierres_modalidad_check CHECK ((modalidad = ANY (ARRAY['presencial'::text, 'virtual'::text, 'hibrida'::text])));
alter table cierres add constraint cierre_perdido_sin_datos CHECK (((tipo = 'ganado'::text) OR (datos = '{}'::jsonb)));
alter table cierres add constraint cierres_descuento_check CHECK ((descuento = ANY (ARRAY[0, 20, 30, 50, 70])));
alter table cierres add constraint cierres_importe_check CHECK ((importe >= (0)::numeric));
alter table cierres add constraint cierres_lead_id_key UNIQUE (lead_id);
alter table cierres add constraint cierres_pkey PRIMARY KEY (id);
alter table cierres add constraint cierres_tipo_check CHECK ((tipo = ANY (ARRAY['ganado'::text, 'perdido'::text])));
alter table invitaciones add constraint invitaciones_rol_check CHECK ((rol = ANY (ARRAY['asesor'::text, 'lider'::text])));
alter table invitaciones add constraint invitaciones_email_check CHECK (((email = lower(TRIM(BOTH FROM email))) AND (email ~~ '%_@_%._%'::text)));
alter table invitaciones add constraint invitaciones_pkey PRIMARY KEY (id);
alter table lead_historial add constraint lead_historial_pkey PRIMARY KEY (id);
alter table leads add constraint leads_pkey PRIMARY KEY (id);
alter table leads add constraint leads_estado_check CHECK ((estado = ANY (ARRAY['activo'::text, 'vencido'::text, 'archivo'::text, 'ganado'::text, 'perdido'::text])));
alter table leads add constraint leads_interes_check CHECK ((interes = ANY (ARRAY['muy_interesado'::text, 'interesado'::text, 'duda'::text, 'poco_interesado'::text, 'frio'::text, 'no_interesado'::text])));
alter table plantillas add constraint plantillas_texto_check CHECK (((char_length(btrim(texto)) >= 1) AND (char_length(btrim(texto)) <= 2000)));
alter table plantillas add constraint plantillas_pkey PRIMARY KEY (id);
alter table plantillas add constraint plantillas_nombre_check CHECK (((char_length(btrim(nombre)) >= 1) AND (char_length(btrim(nombre)) <= 60)));
alter table plantillas add constraint plantillas_canal_check CHECK ((canal = ANY (ARRAY['whatsapp'::text, 'email'::text, 'ambos'::text])));
alter table plantillas add constraint plantillas_asunto_check CHECK (((asunto IS NULL) OR (char_length(asunto) <= 150)));
alter table profiles add constraint profiles_pkey PRIMARY KEY (id);
alter table profiles add constraint profiles_rol_check CHECK ((rol = ANY (ARRAY['asesor'::text, 'lider'::text])));
alter table recordatorios add constraint recordatorios_pkey PRIMARY KEY (id);
alter table recordatorios add constraint recordatorios_contacto_check CHECK (((char_length(contacto) >= 1) AND (char_length(contacto) <= 120)));
alter table reportes add constraint reportes_pkey PRIMARY KEY (id);
alter table reportes add constraint reportes_definicion_check CHECK ((jsonb_typeof(definicion) = 'object'::text));
alter table reportes add constraint reportes_nombre_check CHECK (((char_length(TRIM(BOTH FROM nombre)) >= 1) AND (char_length(TRIM(BOTH FROM nombre)) <= 80)));
alter table tenant_config add constraint tenant_config_dias_archivo_check CHECK ((dias_archivo > 0));
alter table tenant_config add constraint tenant_config_pkey PRIMARY KEY (tenant_id);
alter table tenants add constraint tenants_pkey PRIMARY KEY (id);
alter table tenants add constraint tenants_licencias_positivas CHECK ((licencias >= 1));

-- ------------------------------------------------------------
-- Referencias entre tablas
-- ------------------------------------------------------------

alter table charla_notificados add constraint charla_notificados_notificado_por_fkey FOREIGN KEY (notificado_por) REFERENCES profiles(id) ON DELETE SET NULL;
alter table charla_notificados add constraint charla_notificados_charla_id_fkey FOREIGN KEY (charla_id) REFERENCES charlas(id) ON DELETE CASCADE;
alter table charla_notificados add constraint charla_notificados_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE;
alter table charlas add constraint charlas_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
alter table charlas add constraint charlas_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
alter table cierres add constraint cierres_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE;
alter table cierres add constraint cierres_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
alter table cierres add constraint cierres_cerrado_por_fkey FOREIGN KEY (cerrado_por) REFERENCES profiles(id) ON DELETE SET NULL;
alter table invitaciones add constraint invitaciones_invitado_por_fkey FOREIGN KEY (invitado_por) REFERENCES profiles(id) ON DELETE SET NULL;
alter table invitaciones add constraint invitaciones_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
alter table lead_historial add constraint lead_historial_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE;
alter table lead_historial add constraint lead_historial_autor_id_fkey FOREIGN KEY (autor_id) REFERENCES profiles(id) ON DELETE SET NULL;
alter table leads add constraint leads_asesor_id_fkey FOREIGN KEY (asesor_id) REFERENCES profiles(id) ON DELETE SET NULL;
alter table leads add constraint leads_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
alter table plantillas add constraint plantillas_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES profiles(id) ON DELETE CASCADE;
alter table plantillas add constraint plantillas_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
alter table profiles add constraint profiles_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
alter table recordatorios add constraint recordatorios_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
alter table recordatorios add constraint recordatorios_asesor_id_fkey FOREIGN KEY (asesor_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table recordatorios add constraint recordatorios_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL;
alter table reportes add constraint reportes_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
alter table reportes add constraint reportes_creado_por_fkey FOREIGN KEY (creado_por) REFERENCES profiles(id) ON DELETE CASCADE;
alter table tenant_config add constraint tenant_config_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
alter table tenants add constraint tenants_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id) DEFERRABLE INITIALLY DEFERRED NOT VALID;

-- ------------------------------------------------------------
-- Índices
-- ------------------------------------------------------------

CREATE INDEX charla_notificados_lead_idx ON public.charla_notificados USING btree (lead_id);
CREATE UNIQUE INDEX charla_notificados_unico ON public.charla_notificados USING btree (charla_id, lead_id);
CREATE INDEX charlas_tenant_fecha_idx ON public.charlas USING btree (tenant_id, fecha);
CREATE UNIQUE INDEX charlas_nombre_normalizado_fecha_unico ON public.charlas USING btree (tenant_id, normalizar_texto(nombre), (((fecha AT TIME ZONE 'America/Argentina/Buenos_Aires'::text))::date));
CREATE INDEX cierres_tenant_tipo_idx ON public.cierres USING btree (tenant_id, tipo);
CREATE UNIQUE INDEX invitaciones_tenant_email_unica ON public.invitaciones USING btree (tenant_id, email);
CREATE INDEX lead_historial_lead_fecha_idx ON public.lead_historial USING btree (lead_id, created_at DESC);
CREATE INDEX leads_tenant_telefono_idx ON public.leads USING btree (tenant_id, clave_telefono(telefono));
CREATE INDEX leads_asesor_estado_idx ON public.leads USING btree (asesor_id, estado);
CREATE INDEX leads_emails_idx ON public.leads USING gin (emails_de_lead(email, emails_extra));
CREATE INDEX leads_tenant_estado_idx ON public.leads USING btree (tenant_id, estado);
CREATE INDEX plantillas_tenant_idx ON public.plantillas USING btree (tenant_id);
CREATE INDEX profiles_tenant_activo_idx ON public.profiles USING btree (tenant_id, activo);
CREATE INDEX profiles_tenant_idx ON public.profiles USING btree (tenant_id);
CREATE INDEX recordatorios_asesor_fecha_idx ON public.recordatorios USING btree (asesor_id, fecha);
CREATE INDEX reportes_tenant_idx ON public.reportes USING btree (tenant_id);

-- ------------------------------------------------------------
-- Seguridad por fila (RLS)
-- ------------------------------------------------------------

alter table public.charla_notificados enable row level security;
alter table public.charlas enable row level security;
alter table public.cierres enable row level security;
alter table public.invitaciones enable row level security;
alter table public.lead_historial enable row level security;
alter table public.leads enable row level security;
alter table public.plantillas enable row level security;
alter table public.profiles enable row level security;
alter table public.recordatorios enable row level security;
alter table public.reportes enable row level security;
alter table public.tenant_config enable row level security;
alter table public.tenants enable row level security;

-- ------------------------------------------------------------
-- Reglas de seguridad
-- ------------------------------------------------------------

create policy notificar_lead_propio_o_lider on public.charla_notificados as PERMISSIVE for INSERT to public with check (((EXISTS ( SELECT 1
   FROM charlas
  WHERE ((charlas.id = charla_notificados.charla_id) AND (charlas.tenant_id = ( SELECT current_tenant_id() AS current_tenant_id))))) AND (EXISTS ( SELECT 1
   FROM leads
  WHERE ((leads.id = charla_notificados.lead_id) AND (leads.tenant_id = ( SELECT current_tenant_id() AS current_tenant_id)) AND ((( SELECT current_user_rol() AS current_user_rol) = 'lider'::text) OR (leads.asesor_id = ( SELECT auth.uid() AS uid))))))));
create policy marcar_asistencia_lead_propio_o_lider on public.charla_notificados as PERMISSIVE for UPDATE to public using (((EXISTS ( SELECT 1
   FROM charlas
  WHERE ((charlas.id = charla_notificados.charla_id) AND (charlas.tenant_id = ( SELECT current_tenant_id() AS current_tenant_id))))) AND (EXISTS ( SELECT 1
   FROM leads
  WHERE ((leads.id = charla_notificados.lead_id) AND (leads.tenant_id = ( SELECT current_tenant_id() AS current_tenant_id)) AND ((( SELECT current_user_rol() AS current_user_rol) = 'lider'::text) OR (leads.asesor_id = ( SELECT auth.uid() AS uid)))))))) with check (((EXISTS ( SELECT 1
   FROM charlas
  WHERE ((charlas.id = charla_notificados.charla_id) AND (charlas.tenant_id = ( SELECT current_tenant_id() AS current_tenant_id))))) AND (EXISTS ( SELECT 1
   FROM leads
  WHERE ((leads.id = charla_notificados.lead_id) AND (leads.tenant_id = ( SELECT current_tenant_id() AS current_tenant_id)) AND ((( SELECT current_user_rol() AS current_user_rol) = 'lider'::text) OR (leads.asesor_id = ( SELECT auth.uid() AS uid))))))));
create policy equipo_ve_notificados_del_tenant on public.charla_notificados as PERMISSIVE for SELECT to public using ((EXISTS ( SELECT 1
   FROM charlas
  WHERE ((charlas.id = charla_notificados.charla_id) AND (charlas.tenant_id = ( SELECT current_tenant_id() AS current_tenant_id))))));
create policy equipo_ve_charlas_del_tenant on public.charlas as PERMISSIVE for SELECT to public using ((tenant_id = ( SELECT current_tenant_id() AS current_tenant_id)));
create policy creador_o_lider_edita_charla on public.charlas as PERMISSIVE for UPDATE to public using (((tenant_id = ( SELECT current_tenant_id() AS current_tenant_id)) AND ((created_by = ( SELECT auth.uid() AS uid)) OR (( SELECT current_user_rol() AS current_user_rol) = 'lider'::text)))) with check (((tenant_id = ( SELECT current_tenant_id() AS current_tenant_id)) AND ((created_by = ( SELECT auth.uid() AS uid)) OR (( SELECT current_user_rol() AS current_user_rol) = 'lider'::text))));
create policy solo_lider_crea_charlas on public.charlas as PERMISSIVE for INSERT to public with check (((tenant_id = ( SELECT current_tenant_id() AS current_tenant_id)) AND (created_by = ( SELECT auth.uid() AS uid)) AND (( SELECT current_user_rol() AS current_user_rol) = 'lider'::text)));
create policy cerrar_lead_propio_o_lider on public.cierres as PERMISSIVE for INSERT to public with check (((tenant_id = ( SELECT current_tenant_id() AS current_tenant_id)) AND (cerrado_por = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM leads
  WHERE ((leads.id = cierres.lead_id) AND (leads.tenant_id = ( SELECT current_tenant_id() AS current_tenant_id)) AND ((( SELECT current_user_rol() AS current_user_rol) = 'lider'::text) OR (leads.asesor_id = ( SELECT auth.uid() AS uid))))))));
create policy modificar_cierre_propio_o_lider on public.cierres as PERMISSIVE for UPDATE to public using (((tenant_id = ( SELECT current_tenant_id() AS current_tenant_id)) AND (EXISTS ( SELECT 1
   FROM leads
  WHERE ((leads.id = cierres.lead_id) AND ((( SELECT current_user_rol() AS current_user_rol) = 'lider'::text) OR (leads.asesor_id = ( SELECT auth.uid() AS uid)))))))) with check (((tenant_id = ( SELECT current_tenant_id() AS current_tenant_id)) AND (EXISTS ( SELECT 1
   FROM leads
  WHERE ((leads.id = cierres.lead_id) AND ((( SELECT current_user_rol() AS current_user_rol) = 'lider'::text) OR (leads.asesor_id = ( SELECT auth.uid() AS uid))))))));
create policy ver_cierres_propios_o_lider on public.cierres as PERMISSIVE for SELECT to public using (((tenant_id = ( SELECT current_tenant_id() AS current_tenant_id)) AND ((( SELECT current_user_rol() AS current_user_rol) = 'lider'::text) OR (EXISTS ( SELECT 1
   FROM leads
  WHERE ((leads.id = cierres.lead_id) AND (leads.asesor_id = ( SELECT auth.uid() AS uid))))))));
create policy lider_borra_invitaciones_pendientes on public.invitaciones as PERMISSIVE for DELETE to public using (((tenant_id = ( SELECT current_tenant_id() AS current_tenant_id)) AND (( SELECT current_user_rol() AS current_user_rol) = 'lider'::text) AND (aceptada_at IS NULL)));
create policy lider_ve_invitaciones_del_equipo on public.invitaciones as PERMISSIVE for SELECT to public using (((tenant_id = ( SELECT current_tenant_id() AS current_tenant_id)) AND (( SELECT current_user_rol() AS current_user_rol) = 'lider'::text)));
create policy agrega_historial_si_puede_editar_el_lead on public.lead_historial as PERMISSIVE for INSERT to public with check (((autor_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM leads
  WHERE ((leads.id = lead_historial.lead_id) AND (leads.tenant_id = ( SELECT current_tenant_id() AS current_tenant_id)) AND ((( SELECT current_user_rol() AS current_user_rol) = 'lider'::text) OR ((leads.asesor_id = ( SELECT auth.uid() AS uid)) AND (leads.estado <> 'vencido'::text)) OR (leads.estado = 'vencido'::text)))))));
create policy equipo_ve_historial_de_leads_del_tenant on public.lead_historial as PERMISSIVE for SELECT to public using ((EXISTS ( SELECT 1
   FROM leads
  WHERE ((leads.id = lead_historial.lead_id) AND (leads.tenant_id = ( SELECT current_tenant_id() AS current_tenant_id))))));
create policy editar_leads_segun_ownership_o_vencimiento on public.leads as PERMISSIVE for UPDATE to public using (((tenant_id = ( SELECT current_tenant_id() AS current_tenant_id)) AND ((( SELECT current_user_rol() AS current_user_rol) = 'lider'::text) OR ((asesor_id = ( SELECT auth.uid() AS uid)) AND (estado <> 'vencido'::text)) OR (estado = 'vencido'::text))));
create policy equipo_ve_todos_los_leads_del_tenant on public.leads as PERMISSIVE for SELECT to public using ((tenant_id = ( SELECT current_tenant_id() AS current_tenant_id)));
create policy equipo_inserta_leads_del_tenant on public.leads as PERMISSIVE for INSERT to public with check ((tenant_id = ( SELECT current_tenant_id() AS current_tenant_id)));
create policy crear_plantilla_propia on public.plantillas as PERMISSIVE for INSERT to public with check (((tenant_id = ( SELECT current_tenant_id() AS current_tenant_id)) AND (creado_por = ( SELECT auth.uid() AS uid)) AND ((NOT compartida) OR (( SELECT current_user_rol() AS current_user_rol) = 'lider'::text))));
create policy ver_plantillas_propias_o_compartidas on public.plantillas as PERMISSIVE for SELECT to public using (((tenant_id = ( SELECT current_tenant_id() AS current_tenant_id)) AND ((creado_por = ( SELECT auth.uid() AS uid)) OR compartida)));
create policy borrar_plantilla_propia_o_lider on public.plantillas as PERMISSIVE for DELETE to public using (((tenant_id = ( SELECT current_tenant_id() AS current_tenant_id)) AND ((creado_por = ( SELECT auth.uid() AS uid)) OR (compartida AND (( SELECT current_user_rol() AS current_user_rol) = 'lider'::text)))));
create policy editar_plantilla_propia_o_lider on public.plantillas as PERMISSIVE for UPDATE to public using (((tenant_id = ( SELECT current_tenant_id() AS current_tenant_id)) AND ((creado_por = ( SELECT auth.uid() AS uid)) OR (compartida AND (( SELECT current_user_rol() AS current_user_rol) = 'lider'::text))))) with check (((tenant_id = ( SELECT current_tenant_id() AS current_tenant_id)) AND ((NOT compartida) OR (( SELECT current_user_rol() AS current_user_rol) = 'lider'::text))));
create policy usuario_crea_su_propio_perfil on public.profiles as PERMISSIVE for INSERT to public with check ((id = ( SELECT auth.uid() AS uid)));
create policy usuarios_ven_perfiles_de_su_tenant on public.profiles as PERMISSIVE for SELECT to public using ((tenant_id = ( SELECT current_tenant_id() AS current_tenant_id)));
create policy ver_mis_recordatorios_o_lider on public.recordatorios as PERMISSIVE for SELECT to public using (((tenant_id = ( SELECT current_tenant_id() AS current_tenant_id)) AND ((asesor_id = ( SELECT auth.uid() AS uid)) OR (( SELECT current_user_rol() AS current_user_rol) = 'lider'::text))));
create policy editar_mis_recordatorios_o_lider on public.recordatorios as PERMISSIVE for UPDATE to public using (((tenant_id = ( SELECT current_tenant_id() AS current_tenant_id)) AND ((asesor_id = ( SELECT auth.uid() AS uid)) OR (( SELECT current_user_rol() AS current_user_rol) = 'lider'::text)))) with check (((tenant_id = ( SELECT current_tenant_id() AS current_tenant_id)) AND ((asesor_id = ( SELECT auth.uid() AS uid)) OR (( SELECT current_user_rol() AS current_user_rol) = 'lider'::text)) AND ((lead_id IS NULL) OR (EXISTS ( SELECT 1
   FROM leads
  WHERE ((leads.id = recordatorios.lead_id) AND (leads.tenant_id = ( SELECT current_tenant_id() AS current_tenant_id))))))));
create policy crear_mis_recordatorios on public.recordatorios as PERMISSIVE for INSERT to public with check (((tenant_id = ( SELECT current_tenant_id() AS current_tenant_id)) AND (asesor_id = ( SELECT auth.uid() AS uid)) AND ((lead_id IS NULL) OR (EXISTS ( SELECT 1
   FROM leads
  WHERE ((leads.id = recordatorios.lead_id) AND (leads.tenant_id = ( SELECT current_tenant_id() AS current_tenant_id))))))));
create policy editar_reporte_propio_o_lider on public.reportes as PERMISSIVE for UPDATE to public using (((tenant_id = ( SELECT current_tenant_id() AS current_tenant_id)) AND ((creado_por = ( SELECT auth.uid() AS uid)) OR (compartido AND (( SELECT current_user_rol() AS current_user_rol) = 'lider'::text))))) with check (((tenant_id = ( SELECT current_tenant_id() AS current_tenant_id)) AND ((NOT compartido) OR (( SELECT current_user_rol() AS current_user_rol) = 'lider'::text))));
create policy ver_reportes_propios_o_compartidos on public.reportes as PERMISSIVE for SELECT to public using (((tenant_id = ( SELECT current_tenant_id() AS current_tenant_id)) AND ((creado_por = ( SELECT auth.uid() AS uid)) OR compartido)));
create policy crear_reporte_propio on public.reportes as PERMISSIVE for INSERT to public with check (((tenant_id = ( SELECT current_tenant_id() AS current_tenant_id)) AND (creado_por = ( SELECT auth.uid() AS uid)) AND ((NOT compartido) OR (( SELECT current_user_rol() AS current_user_rol) = 'lider'::text))));
create policy borrar_reporte_propio_o_lider on public.reportes as PERMISSIVE for DELETE to public using (((tenant_id = ( SELECT current_tenant_id() AS current_tenant_id)) AND ((creado_por = ( SELECT auth.uid() AS uid)) OR (compartido AND (( SELECT current_user_rol() AS current_user_rol) = 'lider'::text)))));
create policy lider_actualiza_config on public.tenant_config as PERMISSIVE for UPDATE to public using (((tenant_id = ( SELECT current_tenant_id() AS current_tenant_id)) AND (( SELECT current_user_rol() AS current_user_rol) = 'lider'::text)));
create policy usuarios_leen_config_de_su_tenant on public.tenant_config as PERMISSIVE for SELECT to public using ((tenant_id = ( SELECT current_tenant_id() AS current_tenant_id)));
create policy lider_crea_config on public.tenant_config as PERMISSIVE for INSERT to public with check (((tenant_id = ( SELECT current_tenant_id() AS current_tenant_id)) AND (( SELECT current_user_rol() AS current_user_rol) = 'lider'::text)));
create policy cualquiera_autenticado_crea_un_tenant on public.tenants as PERMISSIVE for INSERT to authenticated with check (true);
create policy creador_ve_el_tenant_que_acaba_de_crear on public.tenants as PERMISSIVE for SELECT to public using ((created_by = ( SELECT auth.uid() AS uid)));
create policy usuarios_ven_su_tenant on public.tenants as PERMISSIVE for SELECT to public using ((id = ( SELECT current_tenant_id() AS current_tenant_id)));
create policy avatares_cambiar_propia on storage.objects as PERMISSIVE for UPDATE to authenticated using (((bucket_id = 'avatares'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
create policy avatares_ver_propia on storage.objects as PERMISSIVE for SELECT to authenticated using (((bucket_id = 'avatares'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
create policy avatares_borrar_propia on storage.objects as PERMISSIVE for DELETE to authenticated using (((bucket_id = 'avatares'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
create policy avatares_subir_propia on storage.objects as PERMISSIVE for INSERT to authenticated with check (((bucket_id = 'avatares'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));

-- ------------------------------------------------------------
-- Permisos para la app (los que Supabase da por defecto)
-- ------------------------------------------------------------

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.charla_notificados to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.charla_notificados to anon;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.charlas to anon;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.charlas to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.cierres to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.cierres to anon;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.invitaciones to anon;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.invitaciones to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.lead_historial to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.lead_historial to anon;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.leads to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.leads to anon;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.plantillas to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.plantillas to anon;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.profiles to anon;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.profiles to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.recordatorios to anon;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.recordatorios to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.reportes to anon;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.reportes to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.tenant_config to anon;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.tenant_config to authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.tenants to anon;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on public.tenants to authenticated;

-- ------------------------------------------------------------
-- Triggers
-- ------------------------------------------------------------

CREATE TRIGGER trg_cierres_updated_at BEFORE UPDATE ON public.cierres FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER leads_asesor_activo BEFORE INSERT OR UPDATE OF asesor_id ON public.leads FOR EACH ROW EXECUTE FUNCTION controlar_asesor_activo();
CREATE TRIGGER trg_leads_validar_cierre BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION validar_estado_cierre();
CREATE TRIGGER leads_contacto_repetido BEFORE INSERT OR UPDATE OF telefono, email, emails_extra ON public.leads FOR EACH ROW EXECUTE FUNCTION controlar_contacto_repetido();
CREATE TRIGGER profiles_proteger BEFORE INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION proteger_perfil();
CREATE TRIGGER tenants_proteger_licencias BEFORE UPDATE ON public.tenants FOR EACH ROW EXECUTE FUNCTION proteger_licencias();

-- ------------------------------------------------------------
-- Fotos de perfil (bucket público de Storage, 1 MB, JPG/PNG/WEBP)
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatares', 'avatares', true, 1048576, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- Tarea programada: vencimientos todas las noches a las 00:05 de Argentina (03:05 UTC)
-- ------------------------------------------------------------
select cron.schedule('procesar-vencimientos', '5 3 * * *', 'select procesar_vencimientos()');
