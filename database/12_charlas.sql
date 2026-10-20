-- ============================================================
-- CHARLAS / EVENTOS (RF29 a RF34 · CU08, CU13)
-- Correr después de 11_reasignacion.sql.
-- (se puede ejecutar más de una vez sin duplicar nada)
-- ============================================================
-- Usa las tablas que ya existen: charlas (nombre, carrera = categoría, fecha, meet_link) y
-- charla_notificados (un lead invitado a una charla, con su asistencia).

-- 1) Quién invitó a cada lead (RF32) y un lead una sola vez por charla
alter table charla_notificados
  add column if not exists notificado_por uuid references profiles(id) on delete set null;

create unique index if not exists charla_notificados_unico on charla_notificados (charla_id, lead_id);

-- 2) Crear o editar una charla (RF29). Solo el líder. Sin p_id crea; con p_id edita.
--    No puede haber dos con el mismo nombre el mismo día (RF30): lo frena el índice
--    charlas_nombre_normalizado_fecha_unico del script 1, y acá se da un mensaje claro.
create or replace function guardar_charla(
  p_id uuid, p_nombre text, p_fecha timestamptz, p_categoria text, p_link text
)
returns charlas
language plpgsql
security definer
set search_path = public
as $$
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
$$;

-- 3) Eliminar una charla con sus invitados (RF29). Solo el líder.
create or replace function eliminar_charla(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
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
$$;

-- 4) Invitar un lead a una charla (RF31, RF33). El asesor invita a sus leads; el líder, a cualquiera.
--    Queda en el historial del lead.
create or replace function invitar_a_charla(p_charla_id uuid, p_lead_id uuid)
returns charla_notificados
language plpgsql
security definer
set search_path = public
as $$
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
$$;

-- 5) Registrar si asistió (RF31): true asistió, false no asistió, null todavía sin registrar
create or replace function marcar_asistencia(p_invitacion_id uuid, p_asistio boolean)
returns charla_notificados
language plpgsql
security definer
set search_path = public
as $$
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
$$;

revoke execute on function guardar_charla(uuid, text, timestamptz, text, text), eliminar_charla(uuid),
  invitar_a_charla(uuid, uuid), marcar_asistencia(uuid, boolean) from public, anon;
grant execute on function guardar_charla(uuid, text, timestamptz, text, text), eliminar_charla(uuid),
  invitar_a_charla(uuid, uuid), marcar_asistencia(uuid, boolean) to authenticated;
