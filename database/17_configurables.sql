-- ============================================================
-- MOTIVOS DE PÉRDIDA, VENCIMIENTO POR DÍAS HÁBILES Y PLANTILLAS DE MENSAJES
-- Correr después de 16_importar_leads.sql.
-- (se puede ejecutar más de una vez sin duplicar nada)
-- ============================================================

-- 1) Configuración nueva del equipo
--    motivos_perdida: la lista que se ofrece al cerrar un contacto como perdido (con "Otro" aparte)
--    dias_habiles: si el vencimiento cuenta solo de lunes a viernes
alter table tenant_config add column if not exists motivos_perdida text[];
alter table tenant_config add column if not exists dias_habiles boolean not null default false;

-- los equipos que ya existían arrancan con una lista sugerida (después la cambia el líder)
update tenant_config
   set motivos_perdida = array['Precio', 'Eligió otra opción', 'No respondió', 'Horarios', 'Ya no le interesa']
 where motivos_perdida is null;
alter table tenant_config alter column motivos_perdida set default array['Precio', 'Eligió otra opción', 'No respondió', 'Horarios', 'Ya no le interesa'];
alter table tenant_config alter column motivos_perdida set not null;

-- 2) Días transcurridos entre dos momentos, igual que en la app:
--    - corridos: días completos de 24 horas
--    - hábiles: días de lunes a viernes que pasaron entero (sin contar el día del contacto ni hoy),
--      con las fechas de Argentina
create or replace function dias_transcurridos(p_desde timestamptz, p_hasta timestamptz, p_habiles boolean)
returns integer
language sql
stable
as $$
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
$$;

-- 3) Proceso nocturno (CU16) con días hábiles cuando el equipo lo elige.
--    Misma lógica que en 7_archivo_y_reclamo.sql: primero archiva, después vence.
create or replace function procesar_vencimientos()
returns jsonb
language plpgsql
set search_path = public
as $$
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
$$;

revoke execute on function procesar_vencimientos() from public, anon, authenticated;

-- 4) Guardar la configuración: igual que en 9_campos_cierre.sql, más motivos_perdida y dias_habiles
--    (si no vienen, quedan como estaban)
create or replace function limpiar_motivos(p jsonb)
returns text[]
language plpgsql
immutable
as $$
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
$$;

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
$$;

revoke execute on function guardar_config_equipo(jsonb) from public, anon;
grant execute on function guardar_config_equipo(jsonb) to authenticated;

-- 5) Plantillas de mensajes para WhatsApp y email. Como los reportes: cada uno ve las suyas y las
--    compartidas; solo el líder comparte con el equipo y edita o borra las compartidas.
--    En el texto se pueden usar {nombre}, {nombre_completo}, {mi_nombre} y {equipo}.
create table if not exists plantillas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  creado_por uuid not null references profiles(id) on delete cascade,
  compartida boolean not null default false,
  nombre text not null check (char_length(btrim(nombre)) between 1 and 60),
  canal text not null default 'ambos' check (canal in ('whatsapp', 'email', 'ambos')),
  asunto text check (asunto is null or char_length(asunto) <= 150),
  texto text not null check (char_length(btrim(texto)) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists plantillas_tenant_idx on plantillas (tenant_id);

alter table plantillas enable row level security;
grant select, insert, update, delete on plantillas to authenticated;

drop policy if exists "ver_plantillas_propias_o_compartidas" on plantillas;
create policy "ver_plantillas_propias_o_compartidas"
on plantillas for select
using (tenant_id = (select current_tenant_id()) and (creado_por = (select auth.uid()) or compartida));

drop policy if exists "crear_plantilla_propia" on plantillas;
create policy "crear_plantilla_propia"
on plantillas for insert
with check (
  tenant_id = (select current_tenant_id())
  and creado_por = (select auth.uid())
  and (not compartida or (select current_user_rol()) = 'lider')
);

drop policy if exists "editar_plantilla_propia_o_lider" on plantillas;
create policy "editar_plantilla_propia_o_lider"
on plantillas for update
using (tenant_id = (select current_tenant_id()) and (creado_por = (select auth.uid()) or (compartida and (select current_user_rol()) = 'lider')))
with check (tenant_id = (select current_tenant_id()) and (not compartida or (select current_user_rol()) = 'lider'));

drop policy if exists "borrar_plantilla_propia_o_lider" on plantillas;
create policy "borrar_plantilla_propia_o_lider"
on plantillas for delete
using (tenant_id = (select current_tenant_id()) and (creado_por = (select auth.uid()) or (compartida and (select current_user_rol()) = 'lider')));
