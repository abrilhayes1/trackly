select
  (select count(*) from information_schema.tables where table_schema = 'public' and table_name = 'cierres') as tabla_cierres,
  (select count(*) from pg_proc where proname = 'cerrar_lead') as funcion_cerrar_lead,
  (select count(*) from pg_trigger where tgname = 'trg_leads_validar_cierre') as regla_estado,
  (select count(*) from pg_policies where tablename = 'cierres') as politicas_cierres,
  (select count(*) from pg_policies where tablename = 'lead_historial') as politicas_historial;
