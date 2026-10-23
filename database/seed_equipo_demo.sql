-- ============================================================
-- EQUIPO DE PRUEBA: un líder, 3 asesores y contactos en todos los estados
-- Corré todo el script en el SQL Editor de Supabase (después de los scripts 1 a 18).
-- Crea un equipo nuevo, aparte del tuyo, con 4 usuarios que entran con email y contraseña:
--   lider@demo.trackly     (Carolina Méndez, líder)
--   martin@demo.trackly    (Martín Suárez, asesor)
--   lucia@demo.trackly     (Lucía Fernández, asesora)
--   diego@demo.trackly     (Diego Romero, asesor)
--   Contraseña de los 4: Demo2026!
-- Carga ~50 contactos (nuevos, por vencer, al día, con recordatorios, sin próximo paso, vencidos,
-- archivados, ganados, perdidos y sin asignar), su historial, charlas con invitados y asistencia,
-- recordatorios de la agenda y plantillas de mensajes. Si ya está cargado, no repite nada.
-- Para borrarlo: seed_equipo_demo_borrar.sql
-- ============================================================
do $$
declare
  v_clave text := 'Demo2026!';
  v_tenant uuid;
  v_lider uuid := gen_random_uuid();
  v_martin uuid := gen_random_uuid();
  v_lucia uuid := gen_random_uuid();
  v_diego uuid := gen_random_uuid();
  v_usuarios uuid[];
  v_u record;
  s record;
  v_n int := 0;
  v_lead uuid;
  v_asesor uuid;
  v_contacto timestamptz;
  v_vencido timestamptz;
  v_charla uuid;
  v_carreras text[] := array['Diseño Gráfico', 'Analista de Sistemas', 'Diseño de Interiores',
                             'Administración de Empresas', 'Marketing Digital', 'Fotografía'];
  v_modalidades text[] := array['Presencial', 'Virtual', 'Híbrida'];
  v_descuentos text[] := array['Sin descuento', '20%', '30%', 'Sin descuento', '50%'];
  v_motivos text[] := array['Precio', 'Eligió otra opción', 'No respondió', 'Horarios', 'Ya no le interesa'];
  v_origenes text[] := array['Instagram', 'Web', 'Referido', 'Facebook', 'Feria educativa'];
begin
  if exists (select 1 from auth.users where email = 'lider@demo.trackly') then
    raise notice 'El equipo de prueba ya estaba cargado (lider@demo.trackly ya existe)';
    return;
  end if;

  -- 1) Usuarios (entran con email y contraseña, sin confirmar el email)
  for v_u in
    select * from (values
      (v_lider, 'lider@demo.trackly', 'Carolina Méndez', 'lider'),
      (v_martin, 'martin@demo.trackly', 'Martín Suárez', 'asesor'),
      (v_lucia, 'lucia@demo.trackly', 'Lucía Fernández', 'asesor'),
      (v_diego, 'diego@demo.trackly', 'Diego Romero', 'asesor')
    ) as t(id, email, nombre, rol)
  loop
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                            raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                            confirmation_token, recovery_token, email_change, email_change_token_new)
    values ('00000000-0000-0000-0000-000000000000', v_u.id, 'authenticated', 'authenticated', v_u.email,
            extensions.crypt(v_clave, extensions.gen_salt('bf')), now(),
            '{"provider": "email", "providers": ["email"]}', jsonb_build_object('name', v_u.nombre),
            now() - interval '100 days', now(), '', '', '', '');
    insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), v_u.id, v_u.id::text, 'email',
            jsonb_build_object('sub', v_u.id::text, 'email', v_u.email, 'email_verified', true),
            now(), now() - interval '100 days', now());
  end loop;

  -- 2) Equipo, perfiles y configuración
  insert into tenants (nombre, plan, created_by)
  values ('Instituto Horizonte (demo)', 'individual', v_lider)
  returning id into v_tenant;

  insert into profiles (id, tenant_id, nombre, rol) values
    (v_lider, v_tenant, 'Carolina Méndez', 'lider'),
    (v_martin, v_tenant, 'Martín Suárez', 'asesor'),
    (v_lucia, v_tenant, 'Lucía Fernández', 'asesor'),
    (v_diego, v_tenant, 'Diego Romero', 'asesor');
  v_usuarios := array[v_lider, v_martin, v_lucia, v_diego];

  insert into tenant_config (tenant_id, rubro, vencimiento_habilitado, dias_vencimiento_lead, dias_alerta_previa,
                             dias_archivo, termino_contacto, termino_contacto_plural, categorias_origen,
                             eventos_habilitado, termino_evento, email_diario, campos_cierre)
  values (v_tenant, 'educacion', true, 14, 3, 30, 'Lead', 'Leads', v_origenes, true, 'Charla informativa', false,
          '[{"id": "producto", "nombre": "Carrera", "tipo": "lista", "obligatorio": true,
             "opciones": ["Diseño Gráfico", "Analista de Sistemas", "Diseño de Interiores",
                          "Administración de Empresas", "Marketing Digital", "Fotografía"]},
            {"id": "modalidad", "nombre": "Modalidad", "tipo": "lista", "obligatorio": true,
             "opciones": ["Presencial", "Virtual", "Híbrida"]},
            {"id": "descuento", "nombre": "Descuento", "tipo": "lista", "obligatorio": false,
             "opciones": ["Sin descuento", "20%", "30%", "50%", "70%"]},
            {"id": "importe", "nombre": "Importe ($)", "tipo": "numero", "obligatorio": true}]');

  insert into invitaciones (tenant_id, email, invitado_por)
  values (v_tenant, 'sofia@demo.trackly', v_lider);

  -- 3) Contactos. Cada fila: a quién (1 líder, 2 Martín, 3 Lucía, 4 Diego, 0 sin asignar), estado,
  --    interés, días desde que ingresó, días desde el último contacto (null = sin contactar),
  --    horas hasta el recordatorio (negativo = atrasado), destacado
  for s in
    select * from (values
      -- Martín: el que más cierra
      (2, 'Valentina Ruiz',      'activo',  null,              0.1, null, null, false, 'Quiere saber horarios del turno noche.'),
      (2, 'Tomás Herrera',       'activo',  null,              2,   null, null, false, 'Pide el plan de estudios de Sistemas.'),
      (2, 'Camila Ortiz',        'activo',  'muy_interesado',  20,  12.5, null, true,  'Consulta por becas para Diseño Gráfico.'),
      (2, 'Facundo Sosa',        'activo',  'interesado',      9,   1,    26,   false, 'Va a venir a conocer la sede.'),
      (2, 'Agustina Molina',     'activo',  'duda',            6,   3,    -20,  false, 'Duda entre virtual y presencial.'),
      (2, 'Joaquín Acosta',      'activo',  'muy_interesado',  4,   0.2,  4,    true,  'Quiere inscribirse esta semana.'),
      (2, 'Milagros Vega',       'activo',  'poco_interesado', 15,  2,    null, false, 'Lo tiene que hablar con la familia.'),
      (2, 'Nicolás Paz',         'vencido', 'interesado',      40,  18,   null, false, 'Había pedido info del curso intensivo.'),
      (2, 'Rocío Castro',        'archivo', 'frio',            90,  70,   null, false, 'Consulta vieja, nunca respondió.'),
      (2, 'Bruno Medina',        'ganado',  'muy_interesado',  45,  10,   null, false, 'Se inscribió en Diseño Gráfico.'),
      (2, 'Julieta Romero',      'ganado',  'interesado',      70,  30,   null, false, 'Se inscribió con beca.'),
      (2, 'Lautaro Giménez',     'ganado',  'muy_interesado',  25,  5,    null, false, 'Quería empezar en marzo.'),
      (2, 'Paula Navarro',       'perdido', 'poco_interesado', 50,  20,   null, false, 'Le pareció caro.'),
      -- Lucía: equipo promedio
      (3, 'Santiago Luna',       'activo',  null,              0.3, null, null, false, 'Escribió por Instagram.'),
      (3, 'Martina Ríos',        'activo',  'interesado',      18,  13.2, null, false, 'Pidió que la llamen a la tarde.'),
      (3, 'Ignacio Benítez',     'activo',  'muy_interesado',  7,   1,    2,    true,  'Quiere visitar la sede el sábado.'),
      (3, 'Florencia Cabrera',   'activo',  'interesado',      12,  4,    50,   false, 'Pregunta por la fecha de inicio.'),
      (3, 'Mateo Domínguez',     'activo',  'frio',            30,  8,    72,   false, 'No contesta los mensajes.'),
      (3, 'Sofía Peralta',       'activo',  'duda',            10,  2,    null, false, 'Compara con otra institución.'),
      (3, 'Emilia Godoy',        'activo',  'interesado',      3,   0.5,  -3,   false, 'Pidió cuotas sin interés.'),
      (3, 'Gonzalo Aguirre',     'vencido', 'duda',            50,  40,   null, false, 'Consultó por cambio de carrera.'),
      (3, 'Victoria Silva',      'archivo', 'frio',            110, 85,   null, false, 'No respondió nunca.'),
      (3, 'Franco Rojas',        'ganado',  'interesado',      60,  15,   null, false, 'Se anotó en Marketing Digital.'),
      (3, 'Antonella Morales',   'perdido', 'no_interesado',   35,  6,    null, false, 'Eligió otra institución.'),
      (3, 'Thiago Correa',       'perdido', 'poco_interesado', 80,  45,   null, false, 'No le cerraban los horarios.'),
      -- Diego: le cuesta más (más vencidos y perdidos)
      (4, 'Lucas Fernández',     'activo',  null,              1,   null, null, false, 'Llegó por el formulario de la web.'),
      (4, 'Abril Quiroga',       'activo',  null,              5,   null, null, false, 'Pregunta si hay modalidad a distancia.'),
      (4, 'Benjamín Ojeda',      'activo',  'interesado',      22,  12,   null, false, 'Quiere saber el costo de la matrícula.'),
      (4, 'Catalina Ponce',      'activo',  'duda',            8,   5,    -48,  false, 'Pide hablar con un docente.'),
      (4, 'Dante Villalba',      'activo',  'muy_interesado',  3,   1,    20,   true,  'Viene recomendado por un alumno.'),
      (4, 'Guadalupe Ferreyra',  'vencido', 'interesado',      35,  20,   null, false, 'Quería info de Fotografía.'),
      (4, 'Bautista Sánchez',    'vencido', 'frio',            28,  16,   null, false, 'Dejó de responder.'),
      (4, 'Josefina Álvarez',    'archivo', 'poco_interesado', 100, 60,   null, false, 'Consulta del año pasado.'),
      (4, 'Lorenzo Gutiérrez',   'ganado',  'interesado',      55,  25,   null, false, 'Se inscribió en Analista de Sistemas.'),
      (4, 'Renata Blanco',       'perdido', 'no_interesado',   40,  10,   null, false, 'Ya no le interesa.'),
      (4, 'Tobías Ramírez',      'perdido', 'duda',            65,  30,   null, false, 'No respondió más.'),
      (4, 'Olivia Herrera',      'perdido', 'poco_interesado', 20,  9,    null, false, 'Le pareció caro.'),
      -- la líder también tiene algunos
      (1, 'Federico Arias',      'activo',  'muy_interesado',  5,   1,    30,   true,  'Empresa que quiere capacitar a su equipo.'),
      (1, 'Micaela Torres',      'ganado',  'muy_interesado',  30,  8,    null, false, 'Inscripción corporativa.'),
      -- sin asignar (para el panel del líder)
      (0, 'Ezequiel Moreno',     'activo',  null,              0.2, null, null, false, 'Escribió por mensaje directo.'),
      (0, 'Daniela Campos',      'activo',  null,              1.5, null, null, false, 'Dejó sus datos en la feria.'),
      (0, 'Hernán Vargas',       'activo',  null,              3,   null, null, false, 'Pidió información general.')
    ) as t(quien, nombre, estado, interes, ingreso, contacto, recordatorio, destacado, consulta)
  loop
    v_n := v_n + 1;
    v_asesor := case when s.quien = 0 then null else v_usuarios[s.quien] end;
    v_contacto := case when s.contacto is not null then now() - make_interval(secs => s.contacto * 86400) end;

    insert into leads (tenant_id, asesor_id, nombre, telefono, email, emails_extra, origen, consulta, interes, estado,
                       fecha_ingreso, ultimo_contacto, recordatorio, destacado, updated_at)
    values (
      v_tenant, v_asesor, s.nombre,
      '11 ' || (4100 + v_n) || ' ' || lpad(((v_n * 379) % 10000)::text, 4, '0'),
      -- uno de cada cinco sin email; Camila tiene un segundo email
      case when v_n % 5 <> 0 then
        translate(lower(replace(s.nombre, ' ', '.')), 'áéíóúñ', 'aeioun') || '@demo.trackly' end,
      case when s.nombre = 'Camila Ortiz' then array['camila.trabajo@demo.trackly'] else '{}' end,
      v_origenes[1 + v_n % 5], s.consulta, null, 'activo',
      now() - make_interval(secs => s.ingreso * 86400), v_contacto,
      case when s.recordatorio is not null then now() + make_interval(secs => s.recordatorio * 3600) end,
      s.destacado, now()
    )
    returning id into v_lead;
    -- el interés va aparte (así sirve tanto si la columna es texto como si es una lista fija)
    if s.interes is not null then
      execute format('update leads set interes = %L where id = %L', s.interes, v_lead);
    end if;

    insert into lead_historial (lead_id, texto, autor_id, created_at)
    values (v_lead, 'Ingresó desde ' || v_origenes[1 + v_n % 5] || '.', v_asesor, now() - make_interval(secs => s.ingreso * 86400));
    if v_contacto is not null then
      insert into lead_historial (lead_id, texto, autor_id, created_at) values
        (v_lead, 'Primer contacto por WhatsApp: le pasé la info que pidió.', v_asesor,
         now() - make_interval(secs => (s.contacto + (s.ingreso - s.contacto) / 2) * 86400)),
        (v_lead, 'Último contacto registrado.', v_asesor, v_contacto);
    end if;

    if s.estado in ('vencido', 'archivo') then
      v_vencido := coalesce(v_contacto, now()) + interval '14 days';
      update leads set estado = 'vencido', vencido_at = v_vencido where id = v_lead;
      insert into lead_historial (lead_id, texto, autor_id, created_at)
      values (v_lead, 'Venció por falta de contacto (plazo de 14 días). Quedó disponible para que cualquier asesor lo reclame.', null, v_vencido);
    end if;
    if s.estado = 'archivo' then
      update leads set estado = 'archivo', archivado_at = v_vencido + interval '30 days' where id = v_lead;
      insert into lead_historial (lead_id, texto, autor_id, created_at)
      values (v_lead, 'Pasó a Archivo: estuvo 30 días vencido sin que nadie lo reclamara.', null, v_vencido + interval '30 days');
    end if;
    if s.estado = 'ganado' then
      insert into cierres (lead_id, tenant_id, tipo, datos, cerrado_por, created_at, updated_at)
      values (v_lead, v_tenant, 'ganado',
              jsonb_build_object('producto', v_carreras[1 + v_n % 6], 'modalidad', v_modalidades[1 + v_n % 3],
                                 'descuento', v_descuentos[1 + v_n % 5], 'importe', 150000 + (v_n % 7) * 25000),
              v_asesor, v_contacto, v_contacto);
      update leads set estado = 'ganado' where id = v_lead;
      insert into lead_historial (lead_id, texto, autor_id, created_at)
      values (v_lead, 'Cerrado como ganado: ' || v_carreras[1 + v_n % 6] || '.', v_asesor, v_contacto);
    end if;
    if s.estado = 'perdido' then
      insert into cierres (lead_id, tenant_id, tipo, motivo, cerrado_por, created_at, updated_at)
      values (v_lead, v_tenant, 'perdido', v_motivos[1 + v_n % 5], v_asesor, v_contacto, v_contacto);
      update leads set estado = 'perdido' where id = v_lead;
      insert into lead_historial (lead_id, texto, autor_id, created_at)
      values (v_lead, 'Cerrado como perdido. Motivo: ' || v_motivos[1 + v_n % 5] || '.', v_asesor, v_contacto);
    end if;
  end loop;

  -- 4) Charlas: dos que ya pasaron (con asistencia) y una próxima
  insert into charlas (tenant_id, nombre, carrera, fecha, meet_link, created_by)
  values (v_tenant, 'Charla de Diseño Gráfico', 'Diseño Gráfico', date_trunc('day', now()) - interval '10 days' + interval '19 hours',
          'https://meet.google.com/abc-defg-hij', v_lider)
  returning id into v_charla;
  insert into charla_notificados (charla_id, lead_id, notificado_por, asistio)
  select v_charla, id, asesor_id, nombre in ('Camila Ortiz', 'Bruno Medina', 'Ignacio Benítez')
    from leads where tenant_id = v_tenant and nombre in ('Camila Ortiz', 'Bruno Medina', 'Ignacio Benítez', 'Paula Navarro', 'Martina Ríos');

  insert into charlas (tenant_id, nombre, carrera, fecha, meet_link, created_by)
  values (v_tenant, 'Open house', null, date_trunc('day', now()) - interval '3 days' + interval '18 hours', null, v_lider)
  returning id into v_charla;
  insert into charla_notificados (charla_id, lead_id, notificado_por, asistio)
  select v_charla, id, asesor_id, case when nombre = 'Dante Villalba' then true when nombre = 'Benjamín Ojeda' then false end
    from leads where tenant_id = v_tenant and nombre in ('Dante Villalba', 'Benjamín Ojeda', 'Facundo Sosa', 'Florencia Cabrera');

  insert into charlas (tenant_id, nombre, carrera, fecha, meet_link, created_by)
  values (v_tenant, 'Charla de Analista de Sistemas', 'Analista de Sistemas', date_trunc('day', now()) + interval '5 days' + interval '19 hours',
          'https://meet.google.com/xyz-abcd-efg', v_lider)
  returning id into v_charla;
  insert into charla_notificados (charla_id, lead_id, notificado_por)
  select v_charla, id, asesor_id
    from leads where tenant_id = v_tenant and nombre in ('Tomás Herrera', 'Joaquín Acosta', 'Sofía Peralta', 'Catalina Ponce');

  -- 5) Recordatorios de la agenda (aparte de los de cada contacto)
  insert into recordatorios (tenant_id, asesor_id, fecha, hora, contacto, nota, hecho) values
    (v_tenant, v_lider, (now() at time zone 'America/Argentina/Buenos_Aires')::date, '10:00', 'Reunión de equipo', 'Revisar números del mes', false),
    (v_tenant, v_lider, (now() at time zone 'America/Argentina/Buenos_Aires')::date + 2, '15:30', 'Proveedor de folletería', null, false),
    (v_tenant, v_martin, (now() at time zone 'America/Argentina/Buenos_Aires')::date + 1, '11:00', 'Padre de Valentina Ruiz', 'Quiere hablar de la cuota', false),
    (v_tenant, v_lucia, (now() at time zone 'America/Argentina/Buenos_Aires')::date - 1, '16:00', 'Llamar a la feria educativa', null, false),
    (v_tenant, v_lucia, (now() at time zone 'America/Argentina/Buenos_Aires')::date - 2, '09:30', 'Mandar fotos de la sede', null, true),
    (v_tenant, v_diego, (now() at time zone 'America/Argentina/Buenos_Aires')::date, '17:00', 'Seguimiento de inscriptos', null, false);

  -- 6) Plantillas de mensajes: dos del equipo y una propia
  insert into plantillas (tenant_id, creado_por, compartida, nombre, canal, asunto, texto) values
    (v_tenant, v_lider, true, 'Primer contacto', 'ambos', 'Tu consulta en {equipo}',
     'Hola {nombre}, soy {mi_nombre} de {equipo}. Te escribo por tu consulta. ¿Te puedo llamar hoy?'),
    (v_tenant, v_lider, true, 'Invitación a charla', 'whatsapp', null,
     'Hola {nombre}! Este jueves tenemos una charla informativa. ¿Te reservo un lugar?'),
    (v_tenant, v_martin, false, 'Seguimiento', 'whatsapp', null,
     'Hola {nombre}, ¿pudiste ver la info que te mandé? Cualquier duda, avisame.');

  raise notice 'Listo: equipo "Instituto Horizonte (demo)" con % contactos', v_n;
end $$;
