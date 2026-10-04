-- ============================================================
-- CIERRE DE LA BASE: historial, charlas, notificados y recordatorios
-- (se puede ejecutar más de una vez sin duplicar nada)
-- ============================================================

-- ---------- 0) Permisos sobre las tablas ----------
-- (sin DELETE: nada de esto se borra; el historial tampoco se edita)
grant select, insert on lead_historial to authenticated;
grant select, insert, update on charlas, charla_notificados, recordatorios to authenticated;

-- ---------- 1) LEAD_HISTORIAL ----------
drop policy if exists "equipo_ve_historial_de_leads_del_tenant" on lead_historial;
create policy "equipo_ve_historial_de_leads_del_tenant"
on lead_historial for select
using (
  exists (
    select 1 from leads
    where leads.id = lead_historial.lead_id
      and leads.tenant_id = current_tenant_id()
  )
);

drop policy if exists "agrega_historial_si_puede_editar_el_lead" on lead_historial;
create policy "agrega_historial_si_puede_editar_el_lead"
on lead_historial for insert
with check (
  autor_id = auth.uid()
  and exists (
    select 1 from leads
    where leads.id = lead_historial.lead_id
      and leads.tenant_id = current_tenant_id()
      and (
        current_user_rol() = 'lider'
        or (leads.asesor_id = auth.uid() and leads.estado <> 'vencido')
        or leads.estado = 'vencido'
      )
  )
);

-- ---------- 2) CHARLAS: una charla = nombre + día ----------
create extension if not exists unaccent;

-- el search_path evita el error de Postgres 17+ al crear índices con esta función
create or replace function normalizar_texto(txt text)
returns text
language sql
immutable
set search_path = public, extensions
as $$
  select lower(trim(unaccent(txt)))
$$;

-- limpieza de intentos anteriores (reprogramar charlas ya no se usa)
drop trigger if exists trg_limpiar_notificados_al_reprogramar on charlas;
drop function if exists limpiar_notificados_si_cambia_fecha();
drop index if exists charlas_nombre_normalizado_unico;
drop index if exists charlas_nombre_normalizado_fecha_unico;

-- no puede haber dos charlas con el mismo nombre el mismo día (hora argentina),
-- sin importar mayúsculas, tildes o espacios
create unique index charlas_nombre_normalizado_fecha_unico
on charlas (
  tenant_id,
  normalizar_texto(nombre),
  ((fecha at time zone 'America/Argentina/Buenos_Aires')::date)
);

drop policy if exists "equipo_ve_charlas_del_tenant" on charlas;
drop policy if exists "equipo_crea_charlas" on charlas;
drop policy if exists "solo_lider_crea_charlas" on charlas;
drop policy if exists "creador_o_lider_edita_charla" on charlas;

create policy "equipo_ve_charlas_del_tenant"
on charlas for select
using (tenant_id = current_tenant_id());

create policy "solo_lider_crea_charlas"
on charlas for insert
with check (
  tenant_id = current_tenant_id()
  and created_by = auth.uid()
  and current_user_rol() = 'lider'
);

create policy "creador_o_lider_edita_charla"
on charlas for update
using (
  tenant_id = current_tenant_id()
  and (created_by = auth.uid() or current_user_rol() = 'lider')
)
with check (
  tenant_id = current_tenant_id()
  and (created_by = auth.uid() or current_user_rol() = 'lider')
);

-- ---------- 3) CHARLA_NOTIFICADOS ----------
drop policy if exists "equipo_ve_notificados_del_tenant" on charla_notificados;
drop policy if exists "equipo_notifica_leads_a_charlas" on charla_notificados;
drop policy if exists "equipo_marca_asistencia" on charla_notificados;
drop policy if exists "notificar_lead_propio_o_lider" on charla_notificados;
drop policy if exists "marcar_asistencia_lead_propio_o_lider" on charla_notificados;

-- ver: todo el equipo ve quién fue invitado a cada charla
create policy "equipo_ve_notificados_del_tenant"
on charla_notificados for select
using (
  exists (
    select 1 from charlas
    where charlas.id = charla_notificados.charla_id
      and charlas.tenant_id = current_tenant_id()
  )
);

-- invitar: la charla y el lead tienen que ser de tu equipo, y el lead tuyo (o ser líder)
create policy "notificar_lead_propio_o_lider"
on charla_notificados for insert
with check (
  exists (
    select 1 from charlas
    where charlas.id = charla_notificados.charla_id
      and charlas.tenant_id = current_tenant_id()
  )
  and exists (
    select 1 from leads
    where leads.id = charla_notificados.lead_id
      and leads.tenant_id = current_tenant_id()
      and (current_user_rol() = 'lider' or leads.asesor_id = auth.uid())
  )
);

-- marcar asistencia: igual que invitar
create policy "marcar_asistencia_lead_propio_o_lider"
on charla_notificados for update
using (
  exists (
    select 1 from charlas
    where charlas.id = charla_notificados.charla_id
      and charlas.tenant_id = current_tenant_id()
  )
  and exists (
    select 1 from leads
    where leads.id = charla_notificados.lead_id
      and leads.tenant_id = current_tenant_id()
      and (current_user_rol() = 'lider' or leads.asesor_id = auth.uid())
  )
)
with check (
  exists (
    select 1 from charlas
    where charlas.id = charla_notificados.charla_id
      and charlas.tenant_id = current_tenant_id()
  )
  and exists (
    select 1 from leads
    where leads.id = charla_notificados.lead_id
      and leads.tenant_id = current_tenant_id()
      and (current_user_rol() = 'lider' or leads.asesor_id = auth.uid())
  )
);

-- ---------- 4) RECORDATORIOS (agenda del día) ----------
drop policy if exists "ve_sus_recordatorios_o_lider_ve_del_equipo" on recordatorios;
drop policy if exists "crea_sus_propios_recordatorios" on recordatorios;
drop policy if exists "edita_su_recordatorio_o_lider_edita_del_equipo" on recordatorios;
drop policy if exists "ver_mis_recordatorios_o_lider" on recordatorios;
drop policy if exists "crear_mis_recordatorios" on recordatorios;
drop policy if exists "editar_mis_recordatorios_o_lider" on recordatorios;

create policy "ver_mis_recordatorios_o_lider"
on recordatorios for select
using (
  tenant_id = current_tenant_id()
  and (asesor_id = auth.uid() or current_user_rol() = 'lider')
);

-- crear: solo a tu nombre, y si está atado a un lead, que sea de tu equipo
create policy "crear_mis_recordatorios"
on recordatorios for insert
with check (
  tenant_id = current_tenant_id()
  and asesor_id = auth.uid()
  and (
    lead_id is null
    or exists (
      select 1 from leads
      where leads.id = recordatorios.lead_id
        and leads.tenant_id = current_tenant_id()
    )
  )
);

create policy "editar_mis_recordatorios_o_lider"
on recordatorios for update
using (
  tenant_id = current_tenant_id()
  and (asesor_id = auth.uid() or current_user_rol() = 'lider')
)
with check (
  tenant_id = current_tenant_id()
  and (asesor_id = auth.uid() or current_user_rol() = 'lider')
  and (
    lead_id is null
    or exists (
      select 1 from leads
      where leads.id = recordatorios.lead_id
        and leads.tenant_id = current_tenant_id()
    )
  )
);
