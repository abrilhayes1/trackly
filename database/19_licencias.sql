-- ============================================================
-- LICENCIAS POR EQUIPO Y USUARIOS DESACTIVADOS (RF53)
-- Correr después de 18_contactos_unicos.sql.
-- (se puede ejecutar más de una vez sin duplicar nada)
--
-- - Cada equipo tiene una cantidad de licencias (las carga a mano el administrador de Trackly):
--     update tenants set licencias = 15 where nombre = 'Nombre del equipo';
-- - Ocupan licencia los miembros activos y las invitaciones pendientes.
-- - El líder desactiva a quien se va: no puede entrar más, libera su licencia y sus leads quedan a
--   su nombre hasta que el líder los reasigne. El historial no se toca.
-- - Si una persona desactivada (o activa) acepta la invitación de otro equipo, su perfil viejo
--   queda como "histórico" en el equipo anterior y su cuenta pasa al equipo nuevo.
-- ============================================================

-- 1) Columnas nuevas
alter table tenants add column if not exists licencias integer;

-- equipos que ya existían: tantas licencias como miembros e invitaciones tienen hoy (nadie queda afuera)
update tenants t
   set licencias = greatest(
     1,
     (select count(*) from profiles p where p.tenant_id = t.id)
     + (select count(*) from invitaciones i where i.tenant_id = t.id and i.aceptada_at is null)
   )
 where licencias is null;

-- equipos nuevos: 1 licencia (plan gratuito individual)
alter table tenants alter column licencias set default 1;
alter table tenants alter column licencias set not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'tenants_licencias_positivas') then
    alter table tenants add constraint tenants_licencias_positivas check (licencias >= 1);
  end if;
end $$;

alter table profiles
  add column if not exists activo boolean not null default true,
  add column if not exists desactivado_at timestamptz,
  add column if not exists desactivado_por uuid,
  -- perfil que quedó en este equipo cuando la persona se fue a otro (ya no tiene cuenta asociada)
  add column if not exists historico boolean not null default false;

create index if not exists profiles_tenant_activo_idx on profiles (tenant_id, activo);

-- 2) Nadie cambia estos datos a mano desde la app: solo las funciones de este archivo
--    (que corren como dueño de la base, no como "authenticated")
create or replace function proteger_perfil()
returns trigger
language plpgsql
as $$
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
$$;

drop trigger if exists profiles_proteger on profiles;
create trigger profiles_proteger
before insert or update on profiles
for each row execute function proteger_perfil();

create or replace function proteger_licencias()
returns trigger
language plpgsql
as $$
begin
  if current_user in ('authenticated', 'anon') and new.licencias is distinct from old.licencias then
    raise exception 'Las licencias las carga el administrador de Trackly' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists tenants_proteger_licencias on tenants;
create trigger tenants_proteger_licencias
before update on tenants
for each row execute function proteger_licencias();

-- 3) Quien está desactivado deja de pertenecer al equipo: todas las reglas de seguridad (RLS)
--    usan estas dos funciones, así que con esto pierde el acceso a todo.
--    Se respeta el tipo que ya devolvían.
do $$
begin
  execute format(
    'create or replace function current_tenant_id() returns %s language sql stable security definer set search_path = public as $f$ select tenant_id::%s from profiles where id = auth.uid() and activo $f$',
    pg_get_function_result('current_tenant_id()'::regprocedure),
    pg_get_function_result('current_tenant_id()'::regprocedure)
  );
  execute format(
    'create or replace function current_user_rol() returns %s language sql stable security definer set search_path = public as $f$ select rol::%s from profiles where id = auth.uid() and activo $f$',
    pg_get_function_result('current_user_rol()'::regprocedure),
    pg_get_function_result('current_user_rol()'::regprocedure)
  );
end $$;

-- 4) Para que una cuenta pueda pasar a otro equipo, el perfil deja de estar atado a auth.users
--    y lo que apuntaba a auth.users pasa a apuntar al perfil (se revisa al final de la operación).
do $$
declare
  r record;
begin
  for r in
    select conname from pg_constraint
     where conrelid = 'public.profiles'::regclass and contype = 'f' and confrelid = 'auth.users'::regclass
  loop
    execute format('alter table public.profiles drop constraint %I', r.conname);
    raise notice 'profiles ya no depende de auth.users (%)', r.conname;
  end loop;

  for r in
    select c.conname, c.conrelid::regclass as tabla, a.attname as columna, c.confdeltype
      from pg_constraint c
      join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
     where c.contype = 'f'
       and c.confrelid = 'auth.users'::regclass
       and c.connamespace = 'public'::regnamespace
       and c.conrelid <> 'public.profiles'::regclass
       and array_length(c.conkey, 1) = 1
  loop
    execute format('alter table %s drop constraint %I', r.tabla, r.conname);
    execute format(
      'alter table %s add constraint %I foreign key (%I) references public.profiles(id) on delete %s deferrable initially deferred not valid',
      r.tabla, r.conname, r.columna,
      case r.confdeltype when 'c' then 'cascade' when 'n' then 'set null' when 'd' then 'set default' when 'r' then 'restrict' else 'no action' end
    );
    raise notice '%.% ahora apunta a profiles', r.tabla, r.columna;
  end loop;
end $$;

-- 5) No se le pueden asignar leads a alguien desactivado (cubre reasignar, importar y alta)
create or replace function controlar_asesor_activo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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
$$;

revoke execute on function controlar_asesor_activo() from public, anon, authenticated;

drop trigger if exists leads_asesor_activo on leads;
create trigger leads_asesor_activo
before insert or update of asesor_id on leads
for each row execute function controlar_asesor_activo();

-- 6) Licencias ocupadas: miembros activos + invitaciones pendientes
create or replace function licencias_usadas(p_tenant uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select ((select count(*) from profiles where tenant_id = p_tenant and activo)
        + (select count(*) from invitaciones where tenant_id = p_tenant and aceptada_at is null))::int
$$;

-- mensaje cuando no quedan licencias libres
create or replace function mensaje_sin_licencias(p_licencias integer)
returns text
language sql
immutable
as $$
  select case when p_licencias = 1
    then 'Tu equipo tiene 1 licencia, la tuya. Para sumar personas necesitás más licencias.'
    else format('Usaste las %s licencias del equipo. Desactivá a alguien o pedí más licencias.', p_licencias)
  end
$$;

-- 7) Pasa la cuenta del usuario logueado a otro equipo. Si ya tenía perfil, ese perfil queda en el
--    equipo anterior como histórico (con otro id): sus leads, notas, cierres y charlas quedan ahí,
--    a su nombre. Uso interno: la llaman aceptar_invitacion_de y crear_equipo.
create or replace function mover_a_equipo(p_tenant uuid, p_rol text, p_nombre text)
returns void
language plpgsql
security definer
set search_path = public
as $$
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
$$;

revoke execute on function mover_a_equipo(uuid, text, text) from public, anon, authenticated;

-- nombre para un perfil nuevo: el que puso al crear la cuenta, o lo que está antes de la @
create or replace function nombre_de_la_cuenta()
returns text
language sql
stable
as $$
  select coalesce(
    nullif(trim(auth.jwt() -> 'user_metadata' ->> 'full_name'), ''),
    nullif(trim(auth.jwt() -> 'user_metadata' ->> 'name'), ''),
    split_part(lower(auth.jwt() ->> 'email'), '@', 1)
  )
$$;

-- 8) Invitar: no se puede pasar de las licencias del equipo
create or replace function invitar_miembros(p_emails text[])
returns integer
language plpgsql
security definer
set search_path = public
as $$
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
$$;

-- 9) Al iniciar sesión sin perfil: si alguien lo invitó, entra a ese equipo (como antes, pero con
--    el nombre que puso al crear la cuenta)
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
$$;

-- 10) Invitaciones de otros equipos para quien ya tiene equipo (o está desactivado)
create or replace function mis_invitaciones()
returns table (id uuid, equipo text, rol text, created_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select i.id, t.nombre::text, i.rol::text, i.created_at
    from invitaciones i
    join tenants t on t.id = i.tenant_id
   where i.email = lower(auth.jwt() ->> 'email')
     and i.aceptada_at is null
     and i.tenant_id is distinct from (select p.tenant_id from profiles p where p.id = auth.uid() and p.activo)
   order by i.created_at desc
$$;

-- estado de la propia cuenta, aunque esté desactivada (las reglas RLS ya no la dejan leer el equipo)
create or replace function mi_estado()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object('activo', p.activo, 'equipo', t.nombre::text, 'desactivado_at', p.desactivado_at)
    from profiles p
    join tenants t on t.id = p.tenant_id
   where p.id = auth.uid()
$$;

-- 11) Aceptar la invitación de otro equipo. Si estaba activo en uno, se va de ese equipo: queda
--     como histórico y el líder reasigna sus leads.
create or replace function aceptar_invitacion_de(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
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
$$;

create or replace function rechazar_invitacion(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from invitaciones
   where id = p_id and email = lower(auth.jwt() ->> 'email') and aceptada_at is null;
  return found;
end;
$$;

-- 12) Lo que hace el líder con los miembros de su equipo
create or replace function desactivar_miembro(p_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
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
$$;

create or replace function reactivar_miembro(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
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
$$;

create or replace function cambiar_rol_miembro(p_id uuid, p_rol text)
returns void
language plpgsql
security definer
set search_path = public
as $$
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
$$;

-- 13) Onboarding: un equipo nuevo arranca con 1 licencia (plan gratuito). Si la persona estaba
--     desactivada en otro equipo, su cuenta pasa al nuevo (el perfil viejo queda como histórico).
create or replace function crear_equipo(p jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
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
$$;

-- 14) Permisos: las de uso interno no se pueden llamar desde la app
revoke execute on function licencias_usadas(uuid), mensaje_sin_licencias(integer), nombre_de_la_cuenta()
  from public, anon, authenticated;
revoke execute on function invitar_miembros(text[]), aceptar_invitacion(), mis_invitaciones(), mi_estado(),
  aceptar_invitacion_de(uuid), rechazar_invitacion(uuid), desactivar_miembro(uuid), reactivar_miembro(uuid),
  cambiar_rol_miembro(uuid, text), crear_equipo(jsonb)
  from public, anon;
grant execute on function invitar_miembros(text[]), aceptar_invitacion(), mis_invitaciones(), mi_estado(),
  aceptar_invitacion_de(uuid), rechazar_invitacion(uuid), desactivar_miembro(uuid), reactivar_miembro(uuid),
  cambiar_rol_miembro(uuid, text), crear_equipo(jsonb)
  to authenticated;

-- chequeo: licencias de cada equipo y cuántas usa
select t.nombre, t.licencias, licencias_usadas(t.id) as usadas from tenants t order by t.nombre;
