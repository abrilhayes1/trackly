-- ============================================================
-- VENCIDO → ARCHIVO, RECLAMO Y REACTIVACIÓN (RF07, RF17, RF18, RF36 · CU06, CU10, CU16)
-- Correr después de 5_vencimiento.sql y 6_programar_vencimiento.sql.
-- (se puede ejecutar más de una vez sin duplicar nada)
-- ============================================================
--
-- Ciclo de un lead sin contacto:
--   activo  → vencido   cuando pasa el plazo del equipo (dias_vencimiento_lead).
--                       Cualquier asesor del equipo lo puede RECLAMAR.
--   vencido → archivo   si nadie lo reclama en dias_archivo días.
--                       Cualquier asesor del equipo lo puede REACTIVAR.

-- 1) Columnas nuevas
alter table tenant_config
  add column if not exists dias_archivo integer check (dias_archivo > 0);

alter table leads
  add column if not exists vencido_at timestamptz,
  add column if not exists archivado_at timestamptz;

-- equipos que ya tenían el vencimiento prendido: 30 días vencido antes de archivar
-- (el líder lo puede cambiar después en la configuración)
update tenant_config
   set dias_archivo = 30
 where vencimiento_habilitado and dias_archivo is null;

-- leads que ya estaban vencidos o archivados: se toma la última modificación como fecha
update leads set vencido_at = coalesce(updated_at, now())
 where estado = 'vencido' and vencido_at is null;
update leads set archivado_at = coalesce(updated_at, now())
 where estado = 'archivo' and archivado_at is null;

-- 2) Proceso diario (CU16): vence los activos que pasaron el plazo y archiva los vencidos que
--    nadie reclamó. Cada cambio deja su línea en el historial (sin autor: lo hizo el sistema).
--    Reemplaza a marcar_leads_vencidos().
drop function if exists marcar_leads_vencidos();

create or replace function procesar_vencimientos()
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_vencidos integer;
  v_archivados integer;
begin
  -- primero archivar (así un lead que vence hoy no se archiva en la misma corrida)
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
       and coalesce(l.vencido_at, l.updated_at) <= now() - c.dias_archivo * interval '24 hours'
    returning l.id, c.dias_archivo as dias
  ),
  historial as (
    insert into lead_historial (lead_id, texto, autor_id)
    select id,
           'Pasó a Archivo: estuvo ' || dias || ' días vencido sin que nadie lo reclamara.',
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
       and coalesce(l.ultimo_contacto, l.fecha_ingreso)
           <= now() - c.dias_vencimiento_lead * interval '24 hours'
    returning l.id, c.dias_vencimiento_lead as plazo
  ),
  historial as (
    insert into lead_historial (lead_id, texto, autor_id)
    select id,
           'Venció por falta de contacto (plazo de ' || plazo || ' días). Quedó disponible para que cualquier asesor lo reclame.',
           null
      from vencidos
    returning 1
  )
  select count(*) into v_vencidos from vencidos;

  return jsonb_build_object('vencidos', v_vencidos, 'archivados', v_archivados);
end;
$$;

-- toca los leads de TODOS los equipos: solo la ejecuta la tarea programada
revoke execute on function procesar_vencimientos() from public, anon, authenticated;

-- 3) Tomar un lead vencido (reclamar) o archivado (reactivar). Es la lógica común de las dos
--    funciones de abajo: lo deja activo, a nombre de quien lo toma, con el conteo de días en cero.
--    Corre como dueño de la base (security definer) para no depender de la política de edición
--    de leads, pero valida a mano que el lead sea del mismo equipo.
create or replace function tomar_lead(p_lead_id uuid, p_desde text)
returns leads
language plpgsql
security definer
set search_path = public
as $$
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

  -- "for update" bloquea el lead: si dos asesores lo toman a la vez, el segundo espera a que
  -- termine el primero y después recibe el error de "ya no está disponible"
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
$$;

revoke execute on function tomar_lead(uuid, text) from public, anon, authenticated;

-- CU06 / RF18: cualquier asesor del equipo reclama un lead vencido
create or replace function reclamar_lead(p_lead_id uuid)
returns leads
language sql
security definer
set search_path = public
as $$
  select tomar_lead(p_lead_id, 'vencido');
$$;

-- CU10 / RF36: cualquier asesor del equipo reactiva un lead archivado
-- (antes también aceptaba vencidos; ahora esos se reclaman)
drop function if exists reactivar_lead(uuid);
create function reactivar_lead(p_lead_id uuid)
returns leads
language sql
security definer
set search_path = public
as $$
  select tomar_lead(p_lead_id, 'archivo');
$$;

revoke execute on function reclamar_lead(uuid), reactivar_lead(uuid) from public, anon;
grant execute on function reclamar_lead(uuid), reactivar_lead(uuid) to authenticated;

-- 4) La tarea nocturna pasa a llamar a la función nueva (misma hora: 00:05 en Argentina)
select cron.unschedule(jobid) from cron.job where jobname = 'marcar-leads-vencidos';
select cron.schedule(
  'procesar-vencimientos',
  '5 3 * * *',
  'select procesar_vencimientos()'
);
