-- Programa el proceso diario de vencimiento.
-- Antes de correr esto hay que activar pg_cron: en Supabase, Database > Extensions > pg_cron (el interruptor),
-- o con la línea de abajo.
-- pg_cron trabaja en hora UTC: 03:05 UTC = 00:05 en Argentina.
-- Si lo corrés de nuevo, actualiza la tarea (no la duplica).
create extension if not exists pg_cron;

select cron.schedule(
  'marcar-leads-vencidos',
  '5 3 * * *',
  'select marcar_leads_vencidos()'
);

-- Para ver que quedó programada:   select jobname, schedule, command from cron.job;
-- Para ver cómo le fue cada noche: select status, return_message, start_time from cron.job_run_details order by start_time desc limit 5;
-- Para desprogramarla:             select cron.unschedule('marcar-leads-vencidos');
