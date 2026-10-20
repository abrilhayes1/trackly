-- ============================================================
-- REPORTES PERSONALIZADOS (RF45, agregado a la documentación)
-- Correr después de 12_charlas.sql.
-- (se puede ejecutar más de una vez sin duplicar nada)
-- ============================================================
-- Cada reporte guarda su definición (qué medir, cómo agrupar, filtros y cómo verlo) en un jsonb.
-- Los números se calculan en la aplicación con los datos que ya ve el usuario.
-- Privado: solo lo ve quien lo creó. Compartido: lo ve todo el equipo (solo el líder comparte).
create table if not exists reportes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  nombre text not null check (char_length(trim(nombre)) between 1 and 80),
  definicion jsonb not null check (jsonb_typeof(definicion) = 'object'),
  creado_por uuid not null references profiles(id) on delete cascade,
  compartido boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reportes_tenant_idx on reportes (tenant_id);

alter table reportes enable row level security;
grant select, insert, update, delete on reportes to authenticated;

drop policy if exists "ver_reportes_propios_o_compartidos" on reportes;
create policy "ver_reportes_propios_o_compartidos"
on reportes for select
using (tenant_id = current_tenant_id() and (creado_por = auth.uid() or compartido));

-- crear: siempre a tu nombre; compartido solo si sos líder
drop policy if exists "crear_reporte_propio" on reportes;
create policy "crear_reporte_propio"
on reportes for insert
with check (
  tenant_id = current_tenant_id()
  and creado_por = auth.uid()
  and (not compartido or current_user_rol() = 'lider')
);

-- modificar y borrar: el que lo creó; el líder también los compartidos
drop policy if exists "editar_reporte_propio_o_lider" on reportes;
create policy "editar_reporte_propio_o_lider"
on reportes for update
using (tenant_id = current_tenant_id() and (creado_por = auth.uid() or (compartido and current_user_rol() = 'lider')))
with check (tenant_id = current_tenant_id() and (not compartido or current_user_rol() = 'lider'));

drop policy if exists "borrar_reporte_propio_o_lider" on reportes;
create policy "borrar_reporte_propio_o_lider"
on reportes for delete
using (tenant_id = current_tenant_id() and (creado_por = auth.uid() or (compartido and current_user_rol() = 'lider')));
