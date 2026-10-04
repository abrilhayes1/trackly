-- ============================================================
-- CIERRES DE LEADS (ganado / perdido)
-- ============================================================

-- 1) Tabla: una fila por lead cerrado
create table cierres (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null unique references leads(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  tipo text not null check (tipo in ('ganado', 'perdido')),
  producto text,
  modalidad text check (modalidad in ('presencial', 'virtual', 'hibrida')),
  descuento int check (descuento in (0, 20, 30, 50, 70)),
  importe numeric(12, 2) check (importe >= 0),
  motivo text,
  cerrado_por uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- un cierre ganado siempre trae sus datos; uno perdido solo puede traer motivo
  constraint cierre_coherente check (
    (tipo = 'ganado' and producto is not null and modalidad is not null
       and descuento is not null and importe is not null and motivo is null)
    or
    (tipo = 'perdido' and producto is null and modalidad is null
       and descuento is null and importe is null)
  )
);

create index cierres_tenant_tipo_idx on cierres (tenant_id, tipo);

alter table cierres enable row level security;

-- no se otorga DELETE: un cierre no se borra, se modifica (queda todo en el historial)
grant select, insert, update on cierres to authenticated;

-- 2) updated_at automático
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_cierres_updated_at on cierres;
create trigger trg_cierres_updated_at
before update on cierres
for each row
execute function set_updated_at();

-- 3) Permisos (usan los "porteros" current_tenant_id() y current_user_rol())

-- ver: el líder ve todos los del equipo; el asesor solo los de sus leads
create policy "ver_cierres_propios_o_lider"
on cierres for select
using (
  tenant_id = current_tenant_id()
  and (
    current_user_rol() = 'lider'
    or exists (
      select 1 from leads
      where leads.id = cierres.lead_id and leads.asesor_id = auth.uid()
    )
  )
);

-- crear: el líder o el asesor dueño del lead
create policy "cerrar_lead_propio_o_lider"
on cierres for insert
with check (
  tenant_id = current_tenant_id()
  and cerrado_por = auth.uid()
  and exists (
    select 1 from leads
    where leads.id = cierres.lead_id
      and leads.tenant_id = current_tenant_id()
      and (current_user_rol() = 'lider' or leads.asesor_id = auth.uid())
  )
);

-- modificar: igual que crear
create policy "modificar_cierre_propio_o_lider"
on cierres for update
using (
  tenant_id = current_tenant_id()
  and exists (
    select 1 from leads
    where leads.id = cierres.lead_id
      and (current_user_rol() = 'lider' or leads.asesor_id = auth.uid())
  )
)
with check (
  tenant_id = current_tenant_id()
  and exists (
    select 1 from leads
    where leads.id = cierres.lead_id
      and (current_user_rol() = 'lider' or leads.asesor_id = auth.uid())
  )
);

-- 4) Regla de oro: un lead no puede pasar a "ganado" o "perdido" sin tener su cierre
create or replace function validar_estado_cierre()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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
$$;

drop trigger if exists trg_leads_validar_cierre on leads;
create trigger trg_leads_validar_cierre
before update on leads
for each row
execute function validar_estado_cierre();

-- 5) Función que cierra un lead: guarda el cierre, cambia el estado y escribe el
--    historial como UNA sola operación (si algo falla, no queda nada a medias).
create or replace function cerrar_lead(
  p_lead_id uuid,
  p_tipo text,
  p_producto text,
  p_modalidad text,
  p_descuento int,
  p_importe numeric,
  p_motivo text,
  p_historial text
)
returns cierres
language plpgsql
security invoker
set search_path = public
as $$
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
$$;

grant execute on function cerrar_lead(uuid, text, text, text, int, numeric, text, text) to authenticated;
