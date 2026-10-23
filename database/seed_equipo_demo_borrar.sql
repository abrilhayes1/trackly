-- ============================================================
-- BORRAR EL EQUIPO DE PRUEBA (el que crea seed_equipo_demo.sql)
-- Borra el equipo "Instituto Horizonte (demo)", todos sus datos y sus 4 usuarios.
-- No toca ningún otro equipo.
-- ============================================================
do $$
declare
  v_tenant uuid;
  v_usuarios uuid[];
begin
  select p.tenant_id into v_tenant
    from profiles p join auth.users u on u.id = p.id
   where u.email = 'lider@demo.trackly';
  if v_tenant is null then
    raise notice 'No hay equipo de prueba para borrar';
    return;
  end if;
  select array_agg(id) into v_usuarios from profiles where tenant_id = v_tenant;

  delete from charla_notificados where charla_id in (select id from charlas where tenant_id = v_tenant);
  delete from charlas where tenant_id = v_tenant;
  delete from recordatorios where tenant_id = v_tenant;
  delete from plantillas where tenant_id = v_tenant;
  delete from reportes where tenant_id = v_tenant;
  delete from cierres where tenant_id = v_tenant;
  delete from lead_historial where lead_id in (select id from leads where tenant_id = v_tenant);
  delete from leads where tenant_id = v_tenant;
  delete from invitaciones where tenant_id = v_tenant;
  delete from tenant_config where tenant_id = v_tenant;
  delete from profiles where tenant_id = v_tenant;
  delete from tenants where id = v_tenant;
  delete from auth.identities where user_id = any(v_usuarios);
  delete from auth.users where id = any(v_usuarios);

  raise notice 'Equipo de prueba borrado';
end $$;
