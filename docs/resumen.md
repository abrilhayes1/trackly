# Trackly: resumen del proyecto

> Estado del proyecto y decisiones tomadas, para retomar el trabajo con contexto. Al día con `main`
> (octubre 2026).

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
lead (ganado/perdido), Casos exitosos, Cerrados perdidos y **Archivo** (vencidos para reclamar y archivados para reactivar).

## Estados de un lead

`activo`, `vencido`, `archivo`, `ganado` y `perdido`.
- Para pasar a `ganado` o `perdido` hay que registrar un cierre (función `cerrar_lead`). Un trigger
  lo exige.
- Ciclo sin contacto, según la documentación (RF17, RF18, RF36):
  - **activo → vencido** cuando pasaron `tenant_config.dias_vencimiento_lead` días (de 24 h) desde
    `ultimo_contacto`, o desde `fecha_ingreso` si nunca lo contactaron. Cualquier asesor del equipo
    lo puede **reclamar** (CU06).
  - **vencido → archivo** si nadie lo reclama en `tenant_config.dias_archivo` días. Cualquier asesor
    lo puede **reactivar** (CU10).
  - El vencimiento se puede apagar por equipo (`vencimiento_habilitado`). El aviso previo es
    `dias_alerta_previa`.

## Último trabajo: vencido → archivo, reclamo y reactivación

- `database/7_archivo_y_reclamo.sql` (corre después del 5 y el 6):
  - Columnas nuevas: `tenant_config.dias_archivo`, `leads.vencido_at` y `leads.archivado_at`.
  - `procesar_vencimientos()` es el proceso nocturno (CU16): archiva los vencidos que nadie reclamó
    y vence los activos que pasaron el plazo. Deja una línea en el historial sin autor. Reemplaza a
    `marcar_leads_vencidos()`, y la tarea de pg_cron pasa a llamarla (00:05 en Argentina).
  - `reclamar_lead(id)` (solo vencidos) y `reactivar_lead(id)` (solo archivados) dejan el lead
    activo, a nombre de quien lo toma y con `ultimo_contacto = now()`. Escriben el historial. Son
    `security definer`: validan a mano que el lead sea del mismo equipo, así no dependen de la
    política de edición de `leads`. Bloquean la fila: si dos asesores reclaman a la vez, el segundo
    recibe "Este lead ya no está disponible".
  - Probado en un Postgres local: vencer, archivar, reclamar a la vez, otro equipo y sin sesión.
- Backend: `POST /api/leads/:id/reclamar` y `POST /api/leads/:id/reactivar` (409 si otro llegó
  antes, 404 si no existe). El onboarding pide `diasArchivo` si el vencimiento está prendido.
- Frontend: `pages/Archivo.jsx` tiene dos pestañas. En **Vencidos** se reclama con confirmación y
  se ve cuántos días quedan antes de archivarse. En **Archivados** se reactiva.

## Pendientes

- Verificar en Supabase:
  1. ¿`lead_historial.autor_id` acepta `null`? Si no, el proceso nocturno falla.
  2. ¿`leads` tiene una sola clave foránea hacia `profiles`? Si tiene más de una, el
     `asesor:profiles(nombre)` da un error de ambigüedad y hay que nombrar la FK.
  3. `PATCH /api/leads/:id` todavía deja cambiar `estado` directo, porque está en
     `CAMPOS_EDITABLES`. Con eso se pueden saltear `reclamar_lead` y `reactivar_lead`.
- Del MVP según la documentación (`docs/documentacion.pdf`): inicio con Google (RF01), invitar
  miembros (RF02), onboarding de 5 pasos y terminología configurable (RF05, RF06), campos de cierre
  configurables por el líder (RF06; hoy son fijos) y una pantalla para editar la configuración del
  equipo, incluido `dias_archivo` (RF07).
- Etapa 2: destacados, charlas, email diario, estadísticas, panel del líder (reasignar, sin
  asignar, resumen por asesor), contadores en el menú y app mobile.

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

## Prototipo

El diseño de referencia es `docs/prototipos/trackly_prototipo_4_1.html`: un HTML con todo en línea
que se abre en el navegador. Usa los mismos colores que `index.css`.

- **Pantallas del prototipo que todavía no están hechas**: Charlas informativas (con detalle de
  charla e invitados), Estadísticas, Panel de líder (pestañas Asesores, Leads del equipo y Sin
  asignar, con reasignación de leads), detalle de un asesor, Onboarding y los badges con números en
  el menú lateral.
- **Patrones del prototipo**:
  - Filtros de interés (`.fbtn`): el seleccionado va en oscuro (`bg-text-primary`).
  - Filtro por asesor (`.af-chip`): solo para el líder, con "Todo el equipo" y avatares; el
    seleccionado va en violeta (`bg-accent`).
  - En las listas del líder, el dueño del lead se muestra con un mini avatar y su nombre.
- **Archivo sigue el estilo del prototipo, pero separa Vencidos y Archivados en pestañas** (el
  prototipo los mezcla y la documentación los distingue). Otras diferencias a propósito:
  - Los asesores también pueden filtrar por dueño.
  - Al reclamar o reactivar, el conteo de días empieza desde ahora. El prototipo dice "como sin contactar",
    pero si se tomara así el lead volvería a vencer esa misma noche.
