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

## Último trabajo: calidad, puntos 8 a 11 de la revisión

- **Errores claros:** `lib/errores.js` → `traducirErrorDeBase`. Los mensajes propios (castellano, de las
  funciones SQL y del backend) pasan tal cual. Los técnicos de Postgres, PostgREST o Storage (inglés)
  se registran en el servidor y al usuario le llega un texto según el código: 42501 → 403, 23505 /
  23503 / 23514 → 409, P0002 / PGRST116 → 404, sin conexión → 503. `lanzarErrorDeBase` quedó como
  alias. En el frontend, `apiFetch` da mensajes claros sin conexión, si la respuesta no es JSON y
  para 401, 413, 429, 502 y 503.
- **Seguridad del servidor** (`middleware/seguridad.js`, sin librerías):
  - encabezados tipo helmet y `x-powered-by` apagado;
  - `limitarPedidos` en memoria por IP: 1.000 por minuto en `/api` y 10 por minuto en
    `PUT /api/me/foto`, con 429 y `Retry-After`;
  - `trust proxy` para Railway.
  - La app se arma en `src/app.js` e `index.js` solo la arranca.
- **Formato:** Prettier 3 en los dos (`.prettierrc.json`, ancho 140; el frontend sin punto y coma).
  Comandos `npm run formato` y `npm run formato:revisar`. El lint del frontend quedó sin errores ni
  avisos.
- **Tests** (`npm test` en cada carpeta):
  - Backend: `backend/test/` con `node --test` (validaciones, errores; el servidor con un Supabase
    falso que firma tokens ES256: encabezados, 401, token válido / vencido / falso / anónimo, JWKS
    descargado una vez, 429).
  - Frontend: `frontend/src/lib/__tests__/` con Vitest (agenda, urgencia, alertas, contadores,
    reportes, estadísticas).
- **GitHub Actions** (`.github/workflows/chequeo.yml`): en cada push a main y en cada PR corre formato
  y tests del backend, y lint, formato, tests y build del frontend.
- `middleware/auth.js` crea el cliente que valida tokens con el primer pedido, así se puede cargar
  la app sin variables de entorno (tests).

## Anterior: rendimiento, puntos 5 a 7 de la revisión

- **Casos exitosos / Cerrados perdidos paginados:** `GET /api/cierres?tipo=…&limite=30&desde=N` (y
  `&asesor=<id>` para el líder, con `leads!inner`) devuelve `{ cierres, hayMas }`; se pide uno de más
  para saber si hay otra página. La pantalla muestra 30 y un botón "Ver más"; los asesores del filtro
  salen de `/api/config/equipo`. `?campos=analisis` devuelve solo `lead_id, tipo, datos` (Reportes).
  Sin parámetros responde como antes (lista completa).
- **Historial para análisis compartido** (`lib/analisis.js`, `leadsParaAnalisis(clave)`): Estadísticas,
  Reportes y Mi perfil reutilizan el mismo pedido de `?campos=analisis` durante un minuto mientras no
  cambie nada (clave = usuario + `cambios`).
- **Pantallas bajo demanda:** en `App.jsx`, todo menos Mis leads y Alertas se carga con
  `React.lazy` (con `Suspense` y "Cargando..."). Carga inicial: ~169 KB → ~143 KB comprimidos; lo que
  queda es React y supabase-js.

## Anterior: rendimiento, puntos 1 a 4 de la revisión

- **`database/15_rendimiento.sql`**:
  - Recorre `pg_policies` (esquema public, también las reglas creadas a mano al principio) y
    envuelve `current_tenant_id()`, `current_user_rol()` y `auth.uid()` en `(select …)`, así se
    calculan una vez por consulta.
  - Crea índices: leads (tenant_id, estado) y (asesor_id, estado), lead_historial (lead_id,
    created_at), recordatorios (asesor_id, fecha), charlas (tenant_id, fecha),
    charla_notificados (lead_id) y profiles (tenant_id).
  - Al final cuenta las reglas sin envolver (tiene que dar 0). Se puede correr más de una vez.
  - Probado en Postgres local con 10.000 leads: 20,8 ms → 1,1 ms, mismo resultado.
- **Sesión** (`middleware/auth.js`): `getClaims` con un cliente compartido valida la firma del token
  con el JWKS del proyecto (cache global de 10 min), sin pedir `getUser` a Supabase en cada pedido.
  Si el proyecto firma con HS256 (clave vieja), `getClaims` cae en `getUser` como antes. Exige
  `sub` y `role = authenticated`. `req.user` = { id, email, user_metadata, app_metadata } desde el
  token. Contra: un cierre de sesión en otro lado se nota recién cuando vence el token (máx. 1 h).
- **Charlas en el menú:** `GET /api/charlas/proximas` → `{ proximas }` con `count` en la base (3 h
  de margen). App ya no baja `/api/charlas` en cada cambio de pantalla.

## Anterior: cierre de sesión por inactividad (RNF01)

- `lib/sesion.js`: guarda la última actividad en `localStorage` (`trackly-ultima-actividad`) y con
  más de `HORAS_INACTIVIDAD` (8) sin uso cierra la sesión y el login muestra "Por seguridad, tu
  sesión se cerró…". Cuenta para todas las pestañas y entre visitas (cerrar el navegador y volver al
  otro día).
- Al abrir la app (`getSession`) se revisa antes de mostrar nada. Con la app abierta,
  `vigilarActividad` cuenta clics, teclas y rueda del mouse (guarda como mucho una vez por minuto) y
  revisa cada minuto y al volver a la pestaña; antes de contar una actividad revisa si ya venció (por
  si la compu estuvo suspendida).
- `SIGNED_IN` marca la actividad y `SIGNED_OUT` la borra. Una sesión guardada vencida se ignora en
  `onAuthStateChange`.
- Para cambiar las horas: `HORAS_INACTIVIDAD` en `lib/sesion.js`.

## Anterior: Mi perfil (RF46, nuevo) y recuperar contraseña

- **Pantalla Mi perfil** (`pages/Perfil.jsx`, vista `perfil`): se abre tocando tu nombre abajo a la
  izquierda del menú. Muestra:
  - foto, nombre, rol, equipo, email, "en el equipo desde" y si ingresás con Google o con email;
  - Mis números: activos y contactados (de la lista compartida), ganados, perdidos y tasa de
    conversión (de `?campos=analisis`, solo los propios);
  - Datos personales: cambiar el nombre (el email no se cambia);
  - Seguridad: cambiar la contraseña (`components/CambioContrasena.jsx`, con
    `supabase.auth.updateUser`); si entra solo con Google, un texto;
  - Preferencias: modo claro, oscuro o según el sistema (`lib/tema.js` → `preferenciaTema`,
    `aplicarTema`, `alCambiarTema`; el botón de la barra superior se sincroniza).
- **Foto:** `lib/foto.js` la recorta cuadrada y la achica a 256 px JPG en el navegador. `PUT /api/me/foto`
  (cuerpo = imagen cruda, máximo 1 MB, se revisan los primeros bytes) la sube al bucket `avatares` en
  `avatares/<id>/<fecha>.jpg`, la guarda con la RPC `cambiar_mi_foto` y borra las anteriores.
  `DELETE /api/me/foto` la quita (`avatar_url = ''`). Con `avatar_url = null` y login con Google,
  `GET /api/me` toma la foto de Google. `components/Avatar.jsx` muestra la foto o las iniciales (también
  si la foto no carga) en el menú, el Panel del equipo, los filtros de Estadísticas y Configuración.
- **Nombre:** `PATCH /api/me { nombre }` → RPC `cambiar_mi_nombre` (2 a 80 caracteres; borra
  `avatar_iniciales` para recalcularlas).
- **SQL:** `database/14_perfil.sql` (columna `profiles.avatar_url`, RPCs `cambiar_mi_nombre` y
  `cambiar_mi_foto`, bucket público `avatares` con políticas por carpeta). Probado en Postgres local.
  `configService.equipo` y `meService` leen `profiles` con `*`, así no fallan si el script todavía
  no se corrió.
- **Login:** "¿Olvidaste tu contraseña?" (modo `recuperar`) → `resetPasswordForEmail` con
  `redirectTo` = la URL de la app; al volver, el evento `PASSWORD_RECOVERY` muestra la pantalla para
  elegir la contraseña nueva. Usa el email de Supabase (límite de pocos por hora sin SMTP propio).

## Anterior: modo oscuro

- Botón sol / luna en la barra superior; se recuerda en el navegador y, si nunca se eligió, sigue al
  sistema. Detalle en **Estilos**.
- Se reemplazaron los colores fijos que quedaban (aviso de lead ajeno en la tarjeta, resaltado del
  buscador, íconos del menú, fondo del login, fondo de las ventanas) por tokens.

## Anterior: menos descargas de datos (RNF04)

Antes cada pantalla pedía `GET /api/leads` completo (todos los estados y columnas) y App lo volvía a
pedir en cada cambio de vista para los contadores. Ahora:
- **Lista de trabajo compartida** (`lib/leadsEquipo.js`, `LeadsEquipoContext`): App pide
  `GET /api/leads?estado=activo,vencido` una vez y de nuevo solo cuando cambia algo (`cambios`) o, al
  navegar, si tiene más de un minuto (`VIGENCIA_LISTA_MS`). La usan Mis leads, Alertas, Agenda, el
  detalle de una charla, el Panel del líder y los contadores (`useLeadsEquipo()`). Su `listo` también
  espera a que haya cargado la configuración.
- **Contadores de cerrados:** `GET /api/leads/totales` → `{ ganados, perdidos }` con `count` en la
  base (`head: true`, sin filas). El asesor cuenta los suyos; el líder, los del equipo.
- **Estadísticas y Reportes:** `GET /api/leads?campos=analisis` (todas las filas, solo id, estado,
  asesor_id, fecha_ingreso, ultimo_contacto, origen, interes y destacado).
- **Configuración:** las pantallas usan `useConfigEquipo()` en vez de pedir `/api/config` cada vez.
- Archivo sigue pidiendo `?estado=vencido,archivo` (los archivados no están en la lista de trabajo).
- Medido en el navegador con datos de prueba: recorrer 5 pantallas pide la lista una sola vez (antes,
  2 veces por cada clic).
- Pendiente posible: estadísticas calculadas en la base (RPC) y paginar ganados y perdidos.

## Anterior: Agenda con vistas (RF25 / RF27)

- La Agenda junta los recordatorios manuales (punto violeta) y los que se ponen en la tarjeta de un
  lead (`leads.recordatorio`, punto azul). Los de un lead se dan por hechos cuando se registra un
  contacto posterior.
- Tres vistas, con flechas ‹ Hoy › para moverse: **Días** (5 días desde el elegido), **Semana**
  (lunes a domingo) y **Mes** (calendario de 6 semanas; tocar un día lo abre en la vista Días). La
  vista elegida se recuerda en el navegador.
- Arriba, una franja roja con los atrasados (días anteriores sin hacer).
- Al tocar un recordatorio se abre una ventana (`components/RecordatorioModal.jsx`): los manuales se
  editan (día, hora, contacto, nota) y se marcan como hechos; los de un lead muestran el detalle y
  un botón para abrir su tarjeta. "+ Nuevo recordatorio" o "+ Agregar" en un día crean uno para
  cualquier fecha desde hoy.
- Backend: `GET /api/recordatorios?fecha=desde&hasta=hasta` devuelve el rango más los atrasados sin
  hacer; `PATCH /api/recordatorios/:id` acepta `{ hecho }` o los datos completos para editar. No
  hace falta SQL nuevo.
- Cada recordatorio en las vistas Días y Semana tiene un círculo ✓ para completarlo sin abrirlo.
  En los manuales marca o desmarca "hecho"; en los de un lead registra el contacto de hoy (si el
  recordatorio todavía no llegó, además lo quita). En la ventana del recordatorio de un lead se
  cambian el día y la hora (se guardan en `leads.recordatorio`) y está el botón "✓ Registré el contacto".
- Contador del menú de Agenda: manuales pendientes de hoy o atrasados más los recordatorios de
  leads de hoy o atrasados.

## Anterior: Reportes personalizados (RF45, nuevo)

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
  - acento `accent` #534AB7 y `accent-dark` #3C3489 (fondo al pasar el mouse); `accent-text` #3C3489
    para texto en color de acento (pestañas activas).
  - `bg-app` (fondo del body) y `overlay` (fondo oscuro detrás de una ventana).
  - radios `--radius-md` 8px y `--radius-lg` 12px.
- Hay pares de color `*-bg / *-text / *-border` para green, lime, amber, red y purple. También hay
  puntos de urgencia (`dot-red`, `dot-amber`, `dot-blue`) y avatar (`avatar-bg`, `avatar-text`).
- El interés usa estos colores (`lib/interes.js`): muy interesado → green, interesado → lime,
  duda → amber, poco interesado y frío → tertiary, no interesado → red.
- El estilo de las pantallas es compacto: textos de 11 a 13px, títulos `text-base font-semibold`,
  tarjetas `border border-border-tertiary rounded-(--radius-lg)` y chips redondeados
  (`rounded-full`) con el activo en `bg-accent text-white`.
- **Modo oscuro:** `:root[data-tema="oscuro"]` en `index.css` redefine los mismos tokens, así
  que los componentes no cambian. El botón sol / luna de la barra superior (`Topbar.jsx`,
  `lib/tema.js`) lo alterna y lo guarda en el navegador (`trackly-tema`). Si nunca se eligió, sigue
  al sistema. Un script en `index.html` lo aplica antes de pintar para que no haya destello. Regla:
  **no usar colores fijos** (#hex, `rgba`) en los componentes, siempre tokens o `var(--color-…)`.

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
