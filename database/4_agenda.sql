-- Agenda: el contacto del recordatorio (nombre, teléfono o usuario) como texto libre.
-- Se puede ejecutar más de una vez sin problema.
alter table recordatorios
  add column if not exists contacto text check (char_length(contacto) between 1 and 120);
