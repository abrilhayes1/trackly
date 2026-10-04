-- ============================================================
-- VENCIMIENTO DE LEADS Y REACTIVACIÓN
-- (se puede ejecutar más de una vez sin duplicar nada)
-- ============================================================

-- 1) Marca como "vencido" los leads activos que pasaron el plazo de SU equipo.
--    Cada equipo tiene su propio plazo (tenant_config.dias_vencimiento_lead) y puede tenerlo apagado.
--    Los días se cuentan desde el último contacto o, si nunca lo contactaron, desde que ingresó:
--    es la misma cuenta que hace la aplicación en las pantallas.
--    Cada lead marcado deja una línea en su historial (sin autor: lo hizo el sistema).
--    Devuelve cuántos leads marcó.
create or replace function marcar_leads_vencidos()
returns integer
language plpgsql
set search_path = public
as $$
declare
  v_cantidad integer;
begin
  with vencidos as (
    update leads l
       set estado = 'vencido',
           updated_at = now()
      from tenant_config c
     where c.tenant_id = l.tenant_id
       and c.vencimiento_habilitado
       and c.dias_vencimiento_lead is not null
       and l.estado = 'activo'
       and coalesce(l.ultimo_contacto, l.fecha_ingreso)
           <= now() - c.dias_vencimiento_lead * interval '24 hours'
    returning l.id, c.dias_vencimiento_lead as plazo
  ),
  historial as (
    insert into lead_historial (lead_id, texto, autor_id)
    select id,
           'Venció por falta de contacto (plazo de ' || plazo || ' días). Quedó en Archivo, disponible para que un asesor lo reactive.',
           null
      from vencidos
    returning 1
  )
  select count(*) into v_cantidad from vencidos;

  return v_cantidad;
end;
$$;

-- Esta función toca los leads de TODOS los equipos: solo la puede ejecutar el sistema
-- (la tarea programada), nunca un usuario de la aplicación.
revoke execute on function marcar_leads_vencidos() from public, anon, authenticated;

-- 2) Reactivar un lead vencido o archivado: queda activo, a nombre de quien lo reactiva,
--    y el conteo de días sin contacto vuelve a empezar (si no, el próximo proceso diario
--    lo volvería a vencer). Todo en una sola operación, con su línea en el historial.
create or replace function reactivar_lead(p_lead_id uuid)
returns leads
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_antes leads;
  v_lead leads;
  v_nombre text;
  v_anterior text;
  v_texto text;
begin
  select * into v_antes from leads where id = p_lead_id;
  if not found then
    raise exception 'Lead no encontrado' using errcode = 'P0002';
  end if;

  if v_antes.estado not in ('vencido', 'archivo') then
    raise exception 'Solo se pueden reactivar leads vencidos o archivados' using errcode = '23514';
  end if;

  update leads
     set estado = 'activo',
         asesor_id = auth.uid(),
         ultimo_contacto = now(),
         updated_at = now()
   where id = p_lead_id
   returning * into v_lead;

  -- si la RLS no dejó modificarlo, no se actualizó nada
  if not found then
    raise exception 'No tenés permiso para reactivar este lead' using errcode = '42501';
  end if;

  select nombre into v_nombre from profiles where id = auth.uid();
  select nombre into v_anterior from profiles where id = v_antes.asesor_id;

  v_texto := 'Reactivado por ' || coalesce(v_nombre, 'un usuario')
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
$$;

grant execute on function reactivar_lead(uuid) to authenticated;
