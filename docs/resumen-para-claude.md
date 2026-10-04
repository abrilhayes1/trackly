# Trackly: resumen para retomar en otro chat

> Pegá este archivo en un chat nuevo de Claude para darle contexto. Está al día con la rama
> `claude/optimistic-franklin-9g352l` (octubre 2026).

## Qué es

Trackly es un CRM chico para equipos de asesores que siguen leads (personas interesadas en un
producto o curso). Cada equipo es un *tenant*, con un rol `lider` y asesores. Todo está en español.

## Stack

- **Frontend**: React 19 + Vite + Tailwind CSS 4 (`frontend/`). No usa router: `App.jsx` cambia de
  pantalla con un estado `vista`.
- **Backend**: Node + Express (`backend/src/`), en capas `routes → controllers → services`. Los
  services no saben nada de HTTP y lanzan `ErrorHttp`.
- **Base**: Supabase (Postgres) con RLS por tenant (`current_tenant_id()`, `current_user_rol()`).
  Los scripts SQL están en `database/` y se corren a mano en el SQL Editor, en el orden de
  `database/LEEME.txt`.

## Pantallas hechas

Login, Mis leads (ordenados por urgencia), Nuevo lead, Detalle del lead (interés, seguimiento,
historial automático y manual), Buscador global, Alertas de hoy, Agenda (recordatorios), Cierre de
lead (ganado/perdido), Casos exitosos, Cerrados perdidos y **Archivo** (la más nueva).

## Estados de un lead

`activo`, `vencido`, `archivo`, `ganado` y `perdido`.
- Para pasar a `ganado` o `perdido` hay que registrar un cierre (función `cerrar_lead`). Un trigger
  lo exige.
- Un lead **vence** cuando pasaron `tenant_config.dias_vencimiento_lead` días (de 24 h) desde
  `ultimo_contacto`, o desde `fecha_ingreso` si nunca lo contactaron. El vencimiento se puede
  apagar por equipo (`vencimiento_habilitado`). El aviso previo es `dias_alerta_previa`.

## Último trabajo: vencimiento automático + Archivo + reactivación

- `database/5_vencimiento.sql`:
  - `marcar_leads_vencidos()` pasa a `vencido` los leads activos que pasaron el plazo de su equipo
    y escribe una línea en el historial con `autor_id = null`. Solo la puede ejecutar el sistema.
  - `reactivar_lead(p_lead_id)`: un lead vencido o archivado vuelve a `activo`, queda a nombre de
    quien lo reactiva, pone `ultimo_contacto = now()` y escribe una línea en el historial. Bloquea
    la fila (`for update`), así que si dos asesores reactivan a la vez, el segundo recibe un error
    y no le pisa el lead al primero. Esto se probó en un Postgres local.
- `database/6_programar_vencimiento.sql` programa la función con pg_cron todos los días a las
  03:05 UTC (00:05 en Argentina).
- Backend:
  - `GET /api/leads?estado=vencido,archivo` filtra por estado y trae el nombre del asesor
    (`asesor:profiles(nombre)`).
  - `POST /api/leads/:id/reactivar` devuelve 403 si no hay permiso, 404 si el lead no existe y
    400 si el lead no está vencido ni archivado.
- Frontend: la pantalla `pages/Archivo.jsx`, con filtros por interés y por asesor y el botón
  Reactivar. Los cálculos están en `lib/archivo.js`.

## Pendientes para verificar en Supabase

No se pueden ver desde el repo porque el esquema base y algunas políticas se crearon en Supabase.

1. ¿`lead_historial.autor_id` acepta `null`? Si no, el proceso nocturno falla.
2. ¿La política UPDATE de `leads` deja a un asesor modificar un lead `vencido` **y** `archivo` de
   otro asesor? Si no, reactivar ese lead da "No tenés permiso".
3. ¿`leads` tiene una sola clave foránea hacia `profiles`? Si tiene más de una, el
   `asesor:profiles(nombre)` da un error de ambigüedad y hay que nombrar la FK.
4. `PATCH /api/leads/:id` todavía deja cambiar `estado` directo, porque está en
   `CAMPOS_EDITABLES`. Con eso se puede saltear `reactivar_lead`. Hay que decidir si se saca.

## Estilos (Tailwind 4, `frontend/src/index.css`)

- Tokens en `@theme`:
  - fondos `bg-primary` #FFFFFF, `bg-secondary` #F7F6F2 y `bg-tertiary` #F1EFE8; body #E8E6DF.
  - texto `text-primary` #2C2C2A, `text-secondary` #6B6A65 y `text-tertiary` #9B9A94.
  - bordes `border-tertiary` #E5E3DC, `border-secondary` #CFCDC4 y `border-primary` #B0AEA4.
  - acento `accent` #534AB7 y `accent-dark` #3C3489.
  - radios `--radius-md` 8px y `--radius-lg` 12px.
- Hay pares de color `*-bg / *-text / *-border` para green, lime, amber, red y purple. También hay
  puntos de urgencia (`dot-red`, `dot-amber`, `dot-blue`) y avatar (`avatar-bg`, `avatar-text`).
- El interés usa estos colores (`lib/interes.js`): muy interesado → green, interesado → lime,
  duda → amber, poco interesado y frío → tertiary, no interesado → red.
- El estilo de las pantallas es compacto: textos de 11 a 13px, títulos `text-base font-semibold`,
  tarjetas `border border-border-tertiary rounded-(--radius-lg)` y chips redondeados
  (`rounded-full`) con el activo en `bg-accent text-white`.
