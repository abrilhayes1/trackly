-- ============================================================
-- REASIGNACIÓN DE LEADS (RF39 · CU14)
-- Correr después de 10_destacados.sql.
-- (se puede ejecutar más de una vez sin duplicar nada)
-- ============================================================
-- Solo el líder reasigna un lead activo de su equipo a otro miembro, o asigna uno sin asesor.
-- Cada reasignación queda en el historial del lead.
create or replace function reasignar_lead(p_lead_id uuid, p_asesor_id uuid)
returns leads
language plpgsql
security definer
set search_path = public
as $$
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

  -- "for update": si dos personas reasignan a la vez, la segunda espera y ve el cambio de la primera
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
$$;

revoke execute on function reasignar_lead(uuid, uuid) from public, anon;
grant execute on function reasignar_lead(uuid, uuid) to authenticated;
