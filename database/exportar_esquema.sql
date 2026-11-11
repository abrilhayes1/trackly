-- ============================================================
-- EXPORTAR LA ESTRUCTURA DE LA BASE (solo lectura: no cambia nada)
-- Devuelve, como SQL, todo lo que hay en la base: tablas, restricciones, índices, RLS, reglas,
-- permisos, funciones y triggers (sin datos). Sirve para guardar en el repo lo que se creó a mano
-- en Supabase y poder reconstruir la base.
-- Uso: correrla en el SQL Editor y descargar el resultado como CSV.
-- ============================================================
select orden, objeto, sql from (
  -- 1) tablas
  select 1 as orden, c.relname::text as objeto,
         'create table if not exists public.' || quote_ident(c.relname) || E' (\n' ||
         string_agg('  ' || quote_ident(a.attname) || ' ' || format_type(a.atttypid, a.atttypmod)
                    || case when a.attnotnull then ' not null' else '' end
                    || coalesce(' default ' || pg_get_expr(d.adbin, d.adrelid), ''), E',\n' order by a.attnum)
         || E'\n);' as sql
    from pg_class c
    join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
    left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
   where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
   group by c.relname
  union all
  -- 3) claves primarias, únicas y checks; 4) referencias entre tablas (después)
  select case when contype = 'f' then 4 else 3 end, conrelid::regclass::text,
         'alter table ' || conrelid::regclass || ' add constraint ' || quote_ident(conname) || ' ' || pg_get_constraintdef(oid) || ';'
    from pg_constraint
   where connamespace = 'public'::regnamespace and contype in ('p', 'u', 'c', 'f')
  union all
  -- 5) índices (menos los que ya crean las restricciones)
  select 5, tablename::text, indexdef || ';'
    from pg_indexes
   where schemaname = 'public'
     and indexname not in (select conname from pg_constraint where connamespace = 'public'::regnamespace)
  union all
  -- 6) tablas con seguridad por fila (RLS)
  select 6, relname::text, 'alter table public.' || quote_ident(relname) || ' enable row level security;'
    from pg_class
   where relnamespace = 'public'::regnamespace and relkind = 'r' and relrowsecurity
  union all
  -- 7) reglas de seguridad (también las de las fotos en Storage)
  select 7, schemaname || '.' || tablename,
         format('create policy %I on %I.%I as %s for %s to %s%s%s;', policyname, schemaname, tablename, permissive, cmd,
                array_to_string(roles, ', '),
                coalesce(' using (' || qual || ')', ''), coalesce(' with check (' || with_check || ')', ''))
    from pg_policies
   where schemaname in ('public', 'storage')
  union all
  -- 8) permisos directos sobre las tablas para la app
  select 8, table_name::text,
         format('grant %s on public.%I to %I;', string_agg(privilege_type, ', ' order by privilege_type), table_name, grantee)
    from information_schema.role_table_grants
   where table_schema = 'public' and grantee in ('anon', 'authenticated')
   group by table_name, grantee
  union all
  -- 2) funciones (menos las de extensiones)
  select 2, p.proname::text, pg_get_functiondef(p.oid) || ';'
    from pg_proc p
   where p.pronamespace = 'public'::regnamespace and p.prokind = 'f'
     and not exists (select 1 from pg_depend dep where dep.objid = p.oid and dep.deptype = 'e')
  union all
  -- 9) triggers
  select 9, tgrelid::regclass::text, pg_get_triggerdef(oid) || ';'
    from pg_trigger
   where not tgisinternal and tgrelid in (select oid from pg_class where relnamespace = 'public'::regnamespace)
) todo
order by orden, objeto;

-- tareas programadas (vencimiento de cada noche): correr aparte
-- select jobname, schedule, command from cron.job;
