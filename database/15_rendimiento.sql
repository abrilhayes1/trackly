-- ============================================================
-- RENDIMIENTO (RNF04: menos de 2 segundos con hasta 5.000 leads)
-- Correr después de 14_perfil.sql.
-- (se puede ejecutar más de una vez sin duplicar nada)
-- ============================================================

-- 1) Reglas de seguridad (RLS) que se calculan una sola vez por consulta.
--    Escritas como "tenant_id = current_tenant_id()", Postgres puede llamar a la función una vez
--    POR FILA (5.000 leads = 5.000 llamadas). Envueltas en "(select ...)" se calculan una vez y se
--    reutilizan (es la recomendación de Supabase). Lo que ve cada usuario no cambia.
--    Se recorren todas las reglas del esquema public, también las que se crearon a mano al principio.
do $$
declare
  p record;
  v_using text;
  v_check text;
  v_sql text;
begin
  for p in
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public'
  loop
    v_using := p.qual;
    v_check := p.with_check;

    -- solo las llamadas que todavía no están envueltas (las envueltas se ven como "SELECT f() AS f")
    v_using := regexp_replace(v_using, '(?<!SELECT )current_tenant_id\(\)', '(select current_tenant_id())', 'g');
    v_using := regexp_replace(v_using, '(?<!SELECT )current_user_rol\(\)', '(select current_user_rol())', 'g');
    v_using := regexp_replace(v_using, '(?<!SELECT )auth\.uid\(\)', '(select auth.uid())', 'g');
    v_check := regexp_replace(v_check, '(?<!SELECT )current_tenant_id\(\)', '(select current_tenant_id())', 'g');
    v_check := regexp_replace(v_check, '(?<!SELECT )current_user_rol\(\)', '(select current_user_rol())', 'g');
    v_check := regexp_replace(v_check, '(?<!SELECT )auth\.uid\(\)', '(select auth.uid())', 'g');

    if v_using is distinct from p.qual or v_check is distinct from p.with_check then
      v_sql := format('alter policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
      if v_using is not null then
        v_sql := v_sql || format(' using (%s)', v_using);
      end if;
      if v_check is not null then
        v_sql := v_sql || format(' with check (%s)', v_check);
      end if;
      execute v_sql;
      raise notice 'Regla optimizada: %.%', p.tablename, p.policyname;
    end if;
  end loop;
end;
$$;

-- 2) Índices para las consultas de todos los días (si ya existe uno con el mismo nombre, no hace nada)
-- lista de trabajo y contadores: leads del equipo por estado, y los de cada asesor
create index if not exists leads_tenant_estado_idx on leads (tenant_id, estado);
create index if not exists leads_asesor_estado_idx on leads (asesor_id, estado);
-- historial al abrir la tarjeta de un lead
create index if not exists lead_historial_lead_fecha_idx on lead_historial (lead_id, created_at desc);
-- agenda: los recordatorios de cada asesor por día
create index if not exists recordatorios_asesor_fecha_idx on recordatorios (asesor_id, fecha);
-- charlas del equipo por fecha, y en qué charlas está un lead
create index if not exists charlas_tenant_fecha_idx on charlas (tenant_id, fecha);
create index if not exists charla_notificados_lead_idx on charla_notificados (lead_id);
-- miembros del equipo (las reglas y el panel buscan por equipo)
create index if not exists profiles_tenant_idx on profiles (tenant_id);

-- 3) Chequeo (solo lectura): cuántas reglas quedan sin envolver. Tiene que dar 0.
select count(*) as reglas_sin_optimizar
from pg_policies
where schemaname = 'public'
  and (coalesce(qual, '') ~ '(?<!SELECT )(current_tenant_id|current_user_rol)\(\)|(?<!SELECT )auth\.uid\(\)'
    or coalesce(with_check, '') ~ '(?<!SELECT )(current_tenant_id|current_user_rol)\(\)|(?<!SELECT )auth\.uid\(\)');
