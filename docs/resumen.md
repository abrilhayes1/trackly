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

## Publicación

- **Frontend:** Vercel, en https://trackly-six-delta.vercel.app, con Root Directory = `frontend`.
  Variables (tipo Config): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` y `VITE_API_URL`.
  Vite mete las variables al construir, así que si se cambia alguna hay que hacer Redeploy. Si
  falta alguna, la app muestra cuál en vez de quedar en blanco (`src/main.jsx`).
- **Backend:** Railway, en https://trackly-production-6424.up.railway.app, con Root Directory =
  `backend` y `npm start`. Variables: `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `FRONTEND_URL` (CORS: solo
  acepta pedidos desde esa dirección).
- **Supabase:** en Authentication > URL Configuration, el Site URL y los Redirect URLs apuntan a
  la dirección de Vercel.
- Cada push a `main` publica solo en Vercel y en Railway.
- **Login con Google (RF01):** cliente OAuth "Web application" en Google Cloud (proyecto Trackly),
  cargado en Supabase > Authentication > Sign In / Providers > Google. Orígenes autorizados: la
  dirección de Vercel y `http://localhost:5173`. Mientras la app de Google esté en modo prueba,
  solo entran los emails cargados como Test users.
- **App mobile (pendiente):** React Native + Expo en una carpeta `mobile/` del mismo repo. Usa el
  mismo backend de Railway. Se distribuye como APK con EAS Build (Google Play es opcional).

## Escritorio, no celular

La web está pensada para la compu, como Salesforce o HubSpot. Tiene un ancho mínimo de 1024 px: en
una ventana más angosta aparece la barra para desplazarse hacia el costado. El celular lo cubre la
app mobile (RF41 a RF44). El RNF11 de la documentación hay que corregirlo para que diga esto, porque
hoy pide de 360 a 1920 px.

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

## Último trabajo: Reportes personalizados (RF45, nuevo)

- `database/13_reportes.sql`: tabla `reportes` (nombre, `definicion` jsonb, creado_por, compartido)
  con RLS. Cada uno ve los suyos más los compartidos. Solo el líder comparte y edita los
  compartidos.
- Backend `/api/reportes` (listar, crear, editar, borrar). `lib/reportes.js` valida la definición.
- Frontend: Estadísticas tiene las pestañas Resumen y Reportes. `pages/Reportes.jsx` tiene el
  constructor con vista previa en vivo. `lib/reportes.js` calcula cada reporte con `/api/leads` y
  `/api/cierres`. Los gráficos se comparten en `components/Graficos.jsx` (las columnas se miden
  con el ancho real de la tarjeta).
- Los cambios a pasar a la documentación están en `docs/cambios-documentacion.md`.

## Anterior: Estadísticas (RF37 · CU11)

- `pages/Estadisticas.jsx` y `lib/estadisticas.js`, en el menú "Estadísticas". No necesita cambios en
  la base: se calcula con `/api/leads`.
- Filtros en una fila arriba: período (30 días, 90 días o todo) y, para el líder, asesor. El asesor
  ve solo lo suyo.
- Indicadores: ingresados, tasa de contacto (contactado = tiene contacto registrado o ya se cerró),
  ganados y tasa de conversión (ganados sobre cerrados). Todo sobre los leads ingresados en el
  período.
- Gráficos de una serie en el color de acento (`#534AB7`, validado con las pautas de dataviz):
  barras por origen (las 6 principales y "Otros") y por nivel de interés, y columnas por semana.
  Tienen tooltip al pasar el mouse y "Ver tabla".

## Anterior: Charlas / eventos (RF29 a RF34 · CU08, CU13)

- Tablas que ya existían: `charlas` (nombre, `carrera` = categoría, fecha, `meet_link`, created_by)
  y `charla_notificados` (charla_id, lead_id, asistio, notificado_at).
- `database/12_charlas.sql`:
  - Agrega `charla_notificados.notificado_por` (quién invitó, RF32) y que un lead esté una sola
    vez por charla.
  - Funciones `guardar_charla`, `eliminar_charla`, `invitar_a_charla` y `marcar_asistencia`. Crear,
    editar y eliminar es solo para el líder, con un mensaje claro si se repite el nombre el mismo
    día (RF30). El asesor invita y marca la asistencia solo de sus leads; el líder, de cualquiera.
    Las invitaciones y la asistencia quedan en el historial del lead.
- Backend: `/api/charlas` (listar, crear, editar, eliminar, detalle, invitar), `PATCH
  /api/charlas/invitados/:id` (asistencia) y `GET /api/charlas/lead/:leadId`.
- Frontend:
  - `pages/Charlas.jsx`: próximas y pasadas, formulario, detalle con el enlace, los números, el
    filtro por quién invitó (RF34, solo el líder) y "Invitar".
  - `components/CharlasLead.jsx`: la sección de charlas en la tarjeta del lead, con un buscador por
    nombre o categoría (RF33).
  - El menú muestra "Charlas" (o el nombre que eligió el equipo) solo si el equipo usa eventos
    (Configuración > Eventos), con un contador de próximas.
  - Recorrido probado en el navegador con el backend simulado.

## Anterior: Panel del líder (RF38, RF39, RF40 · CU14, CU15)

- `database/11_reasignacion.sql`: `reasignar_lead(lead, asesor)` es solo para el líder y solo para
  leads activos del equipo. Bloquea la fila y deja en el historial "Asignado a…" o "Reasignado de… a…".
- Backend: `POST /api/leads/:id/reasignar` con `{ asesorId }`.
- Frontend `pages/PanelLider.jsx`, en el menú "Panel del equipo" (solo para el líder, con el
  contador de sin asignar):
  - Indicadores: miembros, activos, sin asignar y vencidos sin gestión.
  - Pestaña Asesores: el resumen de cada uno (asignados, contactados, por vencer y vencidos). Al
    tocarlo se ve su detalle con sus leads.
  - Pestaña Leads del equipo: tabla con asesor, estado de urgencia, interés y "Reasignar...".
  - Pestaña Sin asignar: "Asignar a...".
  - La urgencia se calcula con la misma regla que Mis leads. Recorrido probado en el navegador.

## Anterior: contadores del menú y leads destacados (RF10)

- Contadores en el menú lateral (`lib/contadores.js`): Mis leads (por vencer), Alertas de hoy,
  Agenda (recordatorios pendientes), Archivo (vencidos para reclamar), Casos exitosos y Cerrados
  perdidos. Usan las mismas reglas que cada pantalla. Se recalculan al navegar y al modificar un
  lead.
- Destacados: `database/10_destacados.sql` agrega `leads.destacado`. Se marca con la estrella de la
  tarjeta del lead y queda en el historial. En Mis leads aparecen arriba de todo, en "★ Destacados".
- `PATCH /api/leads/:id` ya no deja cambiar `estado` directo: solo cambia al cerrar, reclamar o
  reactivar.

## Anterior: campos de cierre configurables (RF06)

- `database/9_campos_cierre.sql` (va después del 8):
  - `tenant_config.campos_cierre`: lista de campos del cierre ganado, con `id`, `nombre`, `tipo`
    (texto, numero o lista), `obligatorio` y `opciones` (solo en las listas). Los equipos que ya
    existían quedan con los 4 campos de antes (carrera, modalidad, descuento e importe). Los nuevos
    arrancan con "Producto o servicio" e "Importe".
  - `cierres.datos` guarda los valores (`{"importe": 15000, ...}`). Los cierres viejos se pasaron a
    este formato. Las columnas producto, modalidad, descuento e importe quedan en la tabla pero ya
    no se usan.
  - `registrar_cierre(lead, tipo, datos, motivo)` reemplaza a `cerrar_lead`: valida los datos contra
    los campos del equipo (`limpiar_datos_cierre`), guarda, cambia el estado y escribe el historial
    en una sola operación. `guardar_config_equipo` ahora también guarda `campos_cierre`.
  - Probado en un Postgres local: migración de un cierre viejo, validaciones, ganado → perdido →
    ganado, asesor con lead ajeno y la configuración de los campos.
- Backend: `PUT /api/cierres/:leadId` recibe `{ tipo, datos, motivo }`. Se borró `lib/cierres.js`.
- Frontend: en la tarjeta del lead, el formulario de cierre se arma con los campos del equipo.
  Casos exitosos muestra esos valores. En Configuración hay una tarjeta "Cierre ganado" para
  agregar, ordenar y quitar campos. Recorrido probado en el navegador con el backend simulado.

## Anterior: onboarding, configuración del equipo e invitaciones

- `database/8_configuracion_equipo.sql` (va después del 7):
  - Columnas nuevas en `tenant_config`: `termino_contacto` y `termino_contacto_plural` (por
    defecto Lead/Leads), `categorias_origen`, `eventos_habilitado`, `termino_evento` y
    `email_diario`.
  - Tabla `invitaciones`: el líder carga emails y, cuando esa persona crea su cuenta e inicia
    sesión, `aceptar_invitacion()` la suma sola al equipo como asesor. Todavía no se manda ningún
    email: eso queda para cuando se configure el envío de correos.
  - `crear_equipo(p)` hace todo el onboarding en una sola operación (equipo, perfil del líder,
    configuración e invitaciones). `guardar_config_equipo(p)` e `invitar_miembros(emails)` son
    solo para el líder. Todas validan los datos en la base (`validar_config_equipo`).
  - Probado en un Postgres local: validaciones, onboarding repetido, invitado que entra solo,
    asesor que intenta cambiar la configuración.
- Backend: `POST /api/onboarding`, `PUT /api/config`, `GET /api/config/equipo`,
  `POST /api/config/invitaciones` y `DELETE /api/config/invitaciones/:id`. `GET /api/me` acepta la
  invitación pendiente antes de responder. La validación compartida está en
  `backend/src/lib/configEquipo.js`.
- Frontend:
  - El login tiene "Crear cuenta" (RF01).
  - `pages/Onboarding.jsx`: los 5 pasos del prototipo. Se muestra a quien inicia sesión sin equipo.
  - `pages/Configuracion.jsx`: lo mismo editable, más los miembros y las invitaciones. En el menú
    aparece solo para el líder.
  - `lib/configEquipo.js` comparte la configuración en toda la app (`useConfigEquipo`,
    `useTerminos`). La terminología se aplica en el menú, Mis leads, el alta, Archivo y los
    cierres. Las categorías de origen aparecen como lista en el alta.
  - Recorrido probado en el navegador con el backend simulado.

## Anterior: vencido → archivo, reclamo y reactivación

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
- Verificado en Supabase: `lead_historial.autor_id` acepta vacío y `leads` tiene una sola FK a
  `profiles`.
- Backend: `POST /api/leads/:id/reclamar` y `POST /api/leads/:id/reactivar` (409 si otro llegó
  antes, 404 si no existe). El onboarding pide `diasArchivo` si el vencimiento está prendido.
- Frontend: `pages/Archivo.jsx` tiene dos pestañas. En **Vencidos** se reclama con confirmación y
  se ve cuántos días quedan antes de archivarse. En **Archivados** se reactiva.

## Pendientes

- Del MVP según la documentación (`docs/documentacion.pdf`): solo falta mandar el email de invitación
  (RF02). Necesita configurar un servicio de email (SMTP) en Supabase. Mientras tanto, la invitación
  funciona igual si la persona se registra con ese email.
- Etapa 2: email diario y app mobile.

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
