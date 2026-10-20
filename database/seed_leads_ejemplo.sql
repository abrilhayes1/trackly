-- ============================================================
-- LEADS DE EJEMPLO para probar la app (opcional)
-- 1) Cambiá el email de abajo por el tuyo (el de tu usuario líder o asesor).
-- 2) Corré todo el script en el SQL Editor de Supabase.
-- Carga leads en TU equipo: por vencer, sin contactar, al día, con recordatorio, destacados,
-- vencidos, archivados y sin asesor (para el panel del líder). Si ya los cargaste, no repite.
-- Para borrarlos: delete from leads where email like '%@ejemplo.trackly';
-- ============================================================
do $$
declare
  v_email text := 'TU_EMAIL@ejemplo.com';   -- <<< CAMBIAR
  v_yo uuid;
  v_tenant uuid;
  v_otro uuid;
begin
  select p.id, p.tenant_id into v_yo, v_tenant
    from profiles p join auth.users u on u.id = p.id
   where lower(u.email) = lower(v_email);

  if v_yo is null then
    raise exception 'No encontré un usuario con equipo para el email %', v_email;
  end if;

  if exists (select 1 from leads where tenant_id = v_tenant and email like '%@ejemplo.trackly') then
    raise notice 'Los leads de ejemplo ya estaban cargados en tu equipo';
    return;
  end if;

  -- otro miembro del equipo, si hay (para que el líder vea leads de distintos asesores)
  select id into v_otro from profiles where tenant_id = v_tenant and id <> v_yo limit 1;

  insert into leads (tenant_id, asesor_id, nombre, telefono, email, origen, consulta, interes, estado,
                     fecha_ingreso, ultimo_contacto, recordatorio, destacado, updated_at)
  values
    -- tuyos, activos
    (v_tenant, v_yo, 'Ferreyra, Lucas', '11 4123 5566', 'lucas@ejemplo.trackly', 'Web',
     'Quiere saber precios y horarios del turno noche.', 'muy_interesado', 'activo',
     now() - interval '20 days', now() - interval '13 days', null, false, now()),
    (v_tenant, v_yo, 'Torres, Camila', '11 5234 7788', 'camila@ejemplo.trackly', 'Instagram',
     'Consulta por becas y descuentos.', 'interesado', 'activo',
     now() - interval '18 days', now() - interval '12 days', null, true, now()),
    (v_tenant, v_yo, 'Soria, Emilio', '11 6345 1122', 'emilio@ejemplo.trackly', 'Referido',
     'Duda entre modalidad virtual y presencial.', 'duda', 'activo',
     now() - interval '10 days', now() - interval '5 days', null, false, now()),
    (v_tenant, v_yo, 'Navarro, Pilar', '11 7456 3344', 'pilar@ejemplo.trackly', 'Web',
     'Pidió que la llamen por la tarde.', null, 'activo',
     now() - interval '3 hours', null, null, true, now()),
    (v_tenant, v_yo, 'Gil, Tomás', '11 8567 9900', 'tomas@ejemplo.trackly', 'Instagram',
     'Quiere el plan de estudios.', 'interesado', 'activo',
     now() - interval '2 days', null, null, false, now()),
    (v_tenant, v_yo, 'Méndez, Sofía', '11 9678 2211', 'sofia@ejemplo.trackly', 'Referido',
     'Va a confirmar la inscripción esta semana.', 'muy_interesado', 'activo',
     now() - interval '6 days', now() - interval '1 day', now() + interval '2 hours', false, now()),
    (v_tenant, v_yo, 'Ríos, Martina', '11 4789 6655', 'martina@ejemplo.trackly', 'Web',
     'No respondió los últimos mensajes.', 'frio', 'activo',
     now() - interval '9 days', now() - interval '4 days', null, false, now()),
    (v_tenant, v_yo, 'Paz, Joaquín', '11 5890 4433', 'joaquin@ejemplo.trackly', 'Instagram',
     'Lo tiene que hablar con la familia.', 'poco_interesado', 'activo',
     now() - interval '7 days', now() - interval '2 days', now() - interval '1 day', false, now()),
    -- vencidos y archivados (cualquier asesor los puede reclamar o reactivar)
    (v_tenant, coalesce(v_otro, v_yo), 'Romero, Lucía', '11 6901 7766', 'lucia@ejemplo.trackly', 'Web',
     'Había pedido información del curso intensivo.', 'interesado', 'vencido',
     now() - interval '30 days', now() - interval '17 days', null, false, now()),
    (v_tenant, v_yo, 'Castro, Diego', '11 7012 8877', 'diego@ejemplo.trackly', 'Referido',
     'Consultó por cambio de carrera.', 'duda', 'vencido',
     now() - interval '50 days', now() - interval '40 days', null, false, now()),
    (v_tenant, v_yo, 'Luna, Valentina', '11 8123 9988', 'valentina@ejemplo.trackly', 'Instagram',
     'Consulta vieja, nunca respondió.', 'frio', 'archivo',
     now() - interval '80 days', now() - interval '70 days', null, false, now());

  -- fechas de vencimiento y archivo (las columnas del script 7)
  update leads set vencido_at = now() - interval '3 days'
   where tenant_id = v_tenant and email = 'lucia@ejemplo.trackly';
  update leads set vencido_at = now() - interval '26 days'
   where tenant_id = v_tenant and email = 'diego@ejemplo.trackly';
  update leads set vencido_at = now() - interval '40 days', archivado_at = now() - interval '5 days'
   where tenant_id = v_tenant and email = 'valentina@ejemplo.trackly';

  -- leads del otro asesor, si hay
  if v_otro is not null then
    insert into leads (tenant_id, asesor_id, nombre, telefono, email, origen, consulta, interes, estado,
                       fecha_ingreso, ultimo_contacto, updated_at)
    values
      (v_tenant, v_otro, 'Acuña, Federico', '11 4234 1010', 'federico@ejemplo.trackly', 'Web',
       'Quiere visitar la sede.', 'interesado', 'activo',
       now() - interval '8 days', now() - interval '3 days', now()),
      (v_tenant, v_otro, 'Benítez, Julia', '11 5345 2020', 'julia@ejemplo.trackly', 'Instagram',
       'Pregunta por la fecha de inicio.', 'muy_interesado', 'activo',
       now() - interval '14 days', now() - interval '12 days', now());
  end if;

  -- sin asesor (para "Sin asignar" del panel del líder); si la base no lo permite, se saltea
  begin
    insert into leads (tenant_id, asesor_id, nombre, telefono, email, origen, consulta, interes, estado,
                       fecha_ingreso, updated_at)
    values
      (v_tenant, null, 'Herrera, Bruno', '11 6456 3030', 'bruno@ejemplo.trackly', 'Web',
       'Llegó por el formulario de la web.', null, 'activo', now() - interval '1 day', now()),
      (v_tenant, null, 'Vega, Micaela', '11 7567 4040', 'micaela@ejemplo.trackly', 'Instagram',
       'Escribió por mensaje directo.', null, 'activo', now() - interval '5 hours', now());
  exception when not_null_violation then
    raise notice 'La base no permite leads sin asesor: se saltearon los "sin asignar"';
  end;

  raise notice 'Listo: leads de ejemplo cargados en tu equipo';
end $$;
