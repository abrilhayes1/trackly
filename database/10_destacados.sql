-- ============================================================
-- LEADS DESTACADOS (RF10)
-- Correr después de 9_campos_cierre.sql.
-- (se puede ejecutar más de una vez sin duplicar nada)
-- ============================================================
-- Un lead destacado aparece arriba de todo en Mis leads, sin importar su urgencia.
-- Es independiente del estado (RF08): un lead vencido o cerrado puede seguir marcado.
alter table leads add column if not exists destacado boolean not null default false;
