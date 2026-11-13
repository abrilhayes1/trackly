# Trackly: todo lo que cambió respecto de la propuesta, ordenado por entregable de la tesis

> **Para quien lea esto (contexto):** Trackly es un CRM y agenda comercial para equipos de ventas B2C
> chicos (3 a 15 personas), proyecto final de la carrera Analista de Sistemas (Escuela Da Vinci). Hay
> dos documentos previos: la **Propuesta de Proyecto v2.0** (Seminario: RF01 a RF35, HU01 a HU14) y
> la **documentación del Parcial 1** (`docs/documentacion.pdf`, que renumeró y amplió los requerimientos
> hasta RF44 y casos de uso hasta CU17). **La numeración RF/CU de este archivo sigue la del Parcial 1**,
> salvo donde dice "Propuesta". Este documento lista lo que el sistema hace HOY (noviembre de 2026),
> distinto o de más, para actualizar cada entregable. Todo está implementado y funcionando salvo lo
> marcado como **Pendiente**.

---

## 0. Resumen en una pantalla

- **Plataformas:** web de escritorio (React, en Vercel) + backend (Express, en Railway) + base de datos
  Supabase (PostgreSQL con RLS, Auth, Storage y pg_cron) + **app mobile con casi toda la funcionalidad**
  (Expo / React Native), no de alcance reducido.
- **9 requerimientos funcionales nuevos (RF45 a RF53):** reportes personalizados, perfil propio,
  importar desde Excel/CSV, plantillas de mensajes, preferencias, contactos sin repetir con varios
  emails, página de bienvenida, términos y privacidad, licencias y miembros del equipo.
- **Cambios de modelo de negocio:** el plan equipo pasa de "usuarios ilimitados" a **por licencias**;
  el plan gratuito es 1 licencia. Los usuarios no se dan de baja solos: los desactiva el líder.
- **Roles:** quedaron **dos** (asesor y líder). El "administrador" de la propuesta no existe como rol
  en la app: lo que hacía (cargar licencias) lo hace el equipo de Trackly desde Supabase.
- **Onboarding:** 4 pasos (Tu equipo, Contactos, Eventos, Resumen). Se sacó el paso "Invitar".
- **Calidad:** 68 tests automáticos (54 web, 14 backend), chequeo en GitHub Actions en cada push,
  esquema completo de la base versionado, revisión de seguridad.

---

## 1) Requerimientos Funcionales

### 1.1 Nuevos

| RF | Nombre | Qué hace | Prioridad / Etapa |
|---|---|---|---|
| **RF45** | Reportes personalizados | Cada usuario arma reportes eligiendo **qué medir** (cantidad de contactos, contactados, ganados, perdidos, tasa de contacto, tasa de conversión, suma o promedio de un campo numérico del cierre), **cómo agrupar** (origen, interés, asesor, estado, semana o mes de ingreso, motivo de pérdida o un campo del cierre), **qué filtrar** (período, estado, asesor, origen, interés, destacados) y **cómo verlo** (número, barras, columnas o tabla), con vista previa. Se guardan privados; el líder puede compartirlos con el equipo. | Media / Etapa 2 |
| **RF46** | Gestión de la cuenta propia (Mi perfil) | Ver foto, nombre, email, rol, equipo, fecha y forma de ingreso, y sus números (activos, contactados, ganados, perdidos, conversión). Cambiar nombre y foto (se ven en todo el equipo), cambiar contraseña (si ingresa con email), elegir modo claro/oscuro/sistema. Si entra con Google y no eligió foto, usa la de Google. Email, rol y equipo no se cambian desde acá. | Media / Etapa 2 |
| **RF47** | Importar contactos desde Excel o CSV | Reconoce columnas por título (nombre, apellido, teléfono, email, origen, consulta) y deja corregirlas; vista previa que marca errores (sin nombre, sin teléfono ni email, email inválido) y repetidos (con el equipo o dentro del archivo), que no se importan. El asesor importa a su nombre; el líder elige a quién asignar o deja sin asignar. Hasta 2.000 filas. Se descarga la lista de los no importados. | Media / Etapa 2 |
| **RF48** | Plantillas de mensajes | Plantillas para WhatsApp, email o ambos, con nombre, asunto y texto con variables `{nombre}`, `{nombre_completo}`, `{mi_nombre}`, `{equipo}`. Personales; el líder puede compartirlas. Desde la tarjeta se elige una y se abre WhatsApp o Gmail con el mensaje escrito. | Media / Etapa 2 |
| **RF49** | Preferencias personales | Pantalla de inicio (Mis leads, Alertas o Agenda); botones para programar el próximo contacto (1 a 4, entre 1 y 30 días); hora de esos recordatorios (la misma o fija); contactos por sección en Mis leads (5, 7, 10, 15, todos); días visibles en la Agenda; tema. Se guardan en el dispositivo. | Baja / Etapa 2 |
| **RF50** | Contactos sin repetir y varios emails | En un equipo no puede haber dos contactos con el mismo teléfono (se comparan los últimos 10 dígitos) ni con un email en común, en ningún estado; se controla al crear, editar e importar y avisa con quién coincide. Un contacto tiene un email principal y hasta 10 más. | Alta / Etapa 2 |
| **RF51** | Página de bienvenida (landing) | Para quien no ingresó: explica qué hace Trackly con demostraciones animadas de la interfaz, selector "Soy asesor / Soy líder", calculadora de oportunidades, preguntas frecuentes y tres datos de la encuesta (aclarando "8 asesores"). Desde ahí se crea cuenta o se ingresa. Quien ya ingresó desde ese navegador va directo al login. Respeta "reducir movimiento". | Baja / Etapa 2 |
| **RF52** | Términos y condiciones y política de privacidad | Dos páginas públicas (`/?legal=terminos`, `/?legal=privacidad`). Para crear la cuenta hay que aceptarlos (casilla; con Google se avisa que continuar implica aceptarlos) y se guarda la fecha de aceptación. Política según **Ley 25.326**: el equipo es responsable de los datos de sus contactos y Trackly encargado del tratamiento; proveedores y transferencia internacional; seguridad; conservación; derechos de acceso, rectificación y supresión; aviso de la AAIP. | Alta / Etapa 2 |
| **RF53** | Licencias y miembros del equipo | Cada equipo tiene N licencias (activos + invitaciones pendientes ocupan una). Equipo nuevo = 1 licencia. El líder **desactiva** a quien se va (no puede entrar, libera la licencia, sus leads quedan a su nombre hasta reasignarlos; el panel avisa cuántos quedan), lo **reactiva** si hay licencia y **cambia roles** (siempre queda al menos un líder). Si a alguien lo invita otro equipo, puede **unirse con la misma cuenta** (aunque sea su mail personal): su perfil viejo queda como "histórico" en el equipo anterior con todo lo que hizo. Si era el único líder, primero nombra a otro. | Alta / Etapa 2 |

### 1.2 Que cambiaron

| RF | Antes | Ahora |
|---|---|---|
| **RF01** Login | Email/contraseña y Google | Pantalla dividida (panel violeta con logo, lema y datos de la encuesta + formulario). Crear cuenta desde la misma pantalla, pide **nombre y apellido** y **aceptar términos** (RF52), muestra "mínimo 6 caracteres". **"¿Olvidaste tu contraseña?"**: enlace por email y elegir contraseña nueva. Google queda abajo del formulario. |
| **RF02** Roles e invitaciones | Tres roles (asesor, líder, administrador); el líder invita | **Dos roles**: asesor y líder. El líder carga emails; la persona entra sola al equipo al crear su cuenta con ese email. Invitar está limitado por las licencias (RF53). **Pendiente:** mandar el email de invitación (necesita SMTP). |
| **RF05 / RF34 (Propuesta)** Onboarding | 5 pasos (con "Invitar") | **4 pasos**: Tu equipo (nombre del equipo, rubro y nombre de la persona), Contactos (terminología, vencimiento con aviso previo y días a Archivo, categorías de origen), Eventos, Resumen. Se sacó "Invitar" porque un equipo nuevo tiene 1 licencia. Un usuario desactivado puede crear su propio equipo desde acá. |
| **RF06** Configuración del equipo | Campos del cierre, plazos, categorías | Además: **motivos de pérdida** configurables; campos del cierre con tipo texto, número o lista y orden; **días corridos o hábiles** para el vencimiento; **miembros y licencias** (RF53). |
| **RF08 / RF04** Estados | — | El estado de un lead no se cambia a mano: cambia al cerrar, reclamar o reactivar, y cada cambio queda en el historial. |
| **RF09 / RF10** Mis leads | Leads por urgencia | Secciones: Por vencer, Sin contactar, **Sin próximo paso**, Esta semana, Al día. Cada sección muestra N contactos (RF49) con **"Ver todos"** y buscador. **Destacados** (estrella) arriba de todo. |
| **RF15 / RF16** Vencimiento | Plazo en días | Días **corridos o hábiles** (lunes a viernes), igual en el proceso nocturno y en la app. |
| **RF17 / RF18 / RF36** Archivo | — | Pestañas **Vencidos** (se reclaman, con confirmación) y **Archivados** (se reactivan). |
| **RF25 / RF27** Agenda y recordatorios | Recordatorios del día | Junta recordatorios manuales y de leads; vistas **5 días, semana y mes**; atrasados arriba; se completan con ✓; se editan desde la misma ventana. Al tocar **"Registré contacto hoy"** pregunta cuándo volver a contactar (Mañana, En 3 días, En 1 semana, Elegir fecha, No hace falta). |
| **RF29** Eventos | Con categoría | Categoría opcional, sugerida desde las categorías de origen. El menú muestra el nombre que eligió el equipo y solo aparece si usa eventos. |
| **RF37** Estadísticas | Origen, interés, evolución y tasa de contacto | Además: ganados y **tasa de conversión**; filtros por período (30, 90 días, todo) y asesor; gráfico **"¿Por qué se pierden?"**; para el líder, **comparación entre asesores** (ganados, conversión, tabla con ingresados, contactados, ganados, perdidos, vencidos e importe). |
| **RF30** Vistas del equipo para el líder | Leads, Alertas, Agenda, Archivo y cerrados en modo equipo con filtro por asesor | **Igual a la propuesta, en la web**: en Mis leads, Alertas de hoy y Agenda el líder elige **Todo el equipo**, **Yo** o una persona (la elección se recuerda entre pantallas) y cada contacto o recordatorio muestra de quién es. Archivo, Casos exitosos, Cerrados perdidos, Estadísticas y Reportes muestran todo el equipo con filtro por asesor. El líder también puede completar o editar recordatorios de su equipo. En la app mobile la vista de equipo está en el Panel del equipo. |
| **RF38** Panel del equipo | Indicadores de solo lectura | Pantalla propia con pestañas Asesores, Leads del equipo y Sin asignar; los indicadores se tocan y filtran la lista. Aviso de **leads a nombre de personas desactivadas** con filtro para reasignarlos. |
| **RF41 a RF44 / 1.5 / 4.11** App mobile | Alcance reducido (login, urgentes, notificaciones, tarjeta, estado) | La app mobile tiene **toda la funcionalidad de la web menos Estadísticas y Reportes**. Ver sección 6. |
| **RF33 (Propuesta)** Planes | Gratuito individual / Equipo pago con usuarios ilimitados | Gratuito = **1 licencia**; equipo = **por cantidad de licencias**, que hoy se cargan a mano. **Pendiente:** cobro y facturación. |

### 1.3 Detalles para mencionar

- **Modo oscuro** en web y app (botón en la barra; por defecto, el del sistema). Puede ir en RNF07 o como RF de prioridad baja.
- **Navegación con direcciones** (`#/agenda`, `#/leads/lead/<id>`): Atrás y Adelante del navegador funcionan, recargar no pierde la pantalla y se puede compartir el enlace a un contacto.
- **Contadores del menú:** Mis leads (por vencer), Alertas de hoy, Agenda (pendientes), Charlas (próximas), Archivo (vencidos), Casos exitosos, Cerrados perdidos y Panel del equipo (sin asignar).
- **Cuenta desactivada:** quien fue desactivado ve una pantalla con las invitaciones de otros equipos, "Crear mi propio equipo" y "Cerrar sesión".

### 1.4 Pendientes (siguen en la documentación, no implementados)

- **RF28** Email diario de las 8:00 (la opción aparece en Configuración pero todavía no envía nada; necesita SMTP).
- **RF02** Envío del email de invitación (necesita SMTP).
- **RF43** Notificaciones push en la app mobile.
- **RF41** Ingreso con Google en la app mobile (email y contraseña ya funciona).
- **Importar desde Excel** en la app mobile.
- **Cobro/facturación** de planes (RF33 de la Propuesta).

---

## 2) Requerimientos No Funcionales

| RNF | Antes | Ahora |
|---|---|---|
| **RNF01 / RNF03** Seguridad | RLS por equipo, Supabase Auth, HTTPS | Igual, más: **cierre de sesión por inactividad** (8 horas); **encabezados de seguridad** en todas las respuestas; **límite de pedidos** (1.000/min por IP; 10 fotos/min); errores técnicos traducidos a mensajes claros; el backend **nunca usa clave de servicio**: cada pedido usa el token del usuario y la base decide (RLS); las operaciones sensibles son funciones SQL `security definer` que validan equipo y rol; **triggers que protegen** rol, equipo, estado activo y licencias; un desactivado pierde el acceso a todo por RLS. Revisión de seguridad hecha (sin vulnerabilidades críticas). |
| **RNF04** Rendimiento | < 2 s con 5.000 leads | Una sola lista de trabajo compartida por todas las pantallas; RLS calculada una vez por consulta e índices (10.000 leads: de 21 ms a 1 ms); cerrados paginados de a 30; cada pantalla se descarga la primera vez que se abre. |
| **RNF07** Usabilidad | Interfaz clara | **Sistema de diseño común** web/app (mismos colores claro/oscuro, letra **Inter**, mismas etiquetas). Animaciones cortas (< 300 ms) según pautas de Emil Kowalski e Impeccable; respeta "reducir movimiento". |
| **RNF09** Trazabilidad | Toda acción queda en el historial; no se borra | Igual. Además, cuando alguien deja el equipo su historial no se toca (se desactiva, no se borra; o queda como perfil histórico). |
| **RNF11** Responsividad | Web de 360 a 1920 px | La web es **de escritorio** (desde 1024 px; las pantallas ocupan todo el ancho). El celular lo cubre la app mobile. |
| **RNF12** Mantenibilidad | Monorepo, Git | Más: **68 tests automáticos**, Prettier, ESLint, **GitHub Actions** en cada push (tests, lint, formato, build web y backend, compilación mobile); la app mobile **reutiliza la lógica de la web**; esquema de la base versionado. |
| **Nuevo: Legal** | — | Cumplimiento de la Ley 25.326 (RF52) y aceptación registrada de términos. |

---

## 3) Diagrama de Casos de Uso

**Actores:** Asesor, Líder (hereda de Asesor), Visitante (sin cuenta), Sistema/Tiempo (proceso nocturno), Supabase Auth y Google (externos). Se elimina el actor **Administrador** como usuario de la app (la carga de licencias la hace el equipo de Trackly fuera de la app; se puede dibujar como actor externo "Administrador de Trackly").

**Casos de uso nuevos a agregar al diagrama** (numeración sugerida a continuación de CU17):

| CU | Nombre | Actor |
|---|---|---|
| CU18 | Crear reporte personalizado | Asesor, Líder |
| CU19 | Gestionar mi perfil | Asesor, Líder |
| CU20 | Importar contactos | Asesor, Líder |
| CU21 | Usar una plantilla de mensaje | Asesor, Líder |
| CU22 | Gestionar plantillas (crear, editar, compartir) | Asesor, Líder (compartir: Líder) |
| CU23 | Ver página de bienvenida | Visitante |
| CU24 | Crear cuenta aceptando términos | Visitante |
| CU25 | Recuperar contraseña | Visitante / Asesor |
| CU26 | Gestionar miembros (desactivar, reactivar, cambiar rol) | Líder |
| CU27 | Aceptar invitación de otro equipo | Asesor, Líder |
| CU28 | Reasignar leads de un miembro desactivado | Líder (extiende "Reasignar lead") |
| CU29 | Configurar preferencias | Asesor, Líder |

**Relaciones a revisar:** "Invitar miembros" ahora **incluye** "Verificar licencias libres"; "Crear equipo (onboarding)" ya no incluye "Invitar"; "Registrar contacto" **extiende** "Programar próximo contacto".

---

## 4) Casos de Uso (especificación)

Para cada CU nuevo, flujo principal y alternativos clave:

- **CU20 Importar contactos:** subir archivo → reconoce columnas → el usuario corrige → vista previa con errores y repetidos → (líder) elige asignación → importa → resumen y descarga de no importados. Alternativos: archivo vacío o sin columnas reconocibles; más de 2.000 filas; todas repetidas.
- **CU24 Crear cuenta:** nombre, email, contraseña (mín. 6), tildar términos → si Supabase exige confirmar email, avisa "te mandamos un email" → al confirmar e ingresar, va al onboarding (o entra solo al equipo si lo invitaron). Alternativos: sin nombre, contraseña corta, sin aceptar términos, email ya registrado, email sin confirmar.
- **CU26 Gestionar miembros:** el líder ve "Usás X de Y licencias"; desactivar → confirmación con cantidad de leads a su nombre → la persona pierde acceso y se libera la licencia. Reactivar → solo si hay licencia libre. Cambiar rol → no puede quedar el equipo sin líder. Invitar → error si no quedan licencias.
- **CU27 Aceptar invitación de otro equipo:** franja "X te invitó" → confirmación explicando que deja el equipo actual y sus datos quedan ahí → la cuenta pasa al equipo nuevo. Alternativos: es el único líder del equipo actual (debe nombrar otro); rechazar la invitación; usuario desactivado acepta desde su pantalla.
- **CU25 Recuperar contraseña:** email → enlace → elegir contraseña nueva antes de entrar.
- **CU16 (proceso nocturno, actualizado):** todas las noches a las 00:05 (Argentina) `procesar_vencimientos` vence los leads según días corridos o hábiles y pasa a Archivo los vencidos sin reclamar.

---

## 5) Prototipo de Interfaz Web

Pantallas actuales (todas con modo claro y oscuro):

- **Públicas:** Landing (bienvenida), Login dividido (ingresar / crear cuenta / recuperar), Términos, Privacidad.
- **Onboarding** de 4 pasos; **Cuenta desactivada**.
- **App:** Mis leads, Alertas de hoy, Agenda (5 días / semana / mes), Charlas (lista y detalle), Archivo (Vencidos / Archivados), Casos exitosos, Cerrados perdidos, Estadísticas (con comparación entre asesores), Reportes personalizados, Mi perfil (datos, seguridad, plantillas, preferencias), Panel del equipo (Asesores / Leads del equipo / Sin asignar + detalle de asesor), Configuración (equipo, contactos, vencimiento, cierres, eventos, **miembros y licencias**).
- **Ventanas:** tarjeta del lead (contactar con plantillas, interés, recordatorio, historial, cierre ganado/perdido, charlas, emails), nuevo lead, importar desde Excel, recordatorio, confirmaciones, invitación de otro equipo.
- **Logo nuevo** (versión clara y oscura), favicon e ícono.
- **Prototipo navegable:** `docs/prototipos/trackly-prototipo.html`, la app real con datos de ejemplo en un solo archivo que se abre sin internet. Usuarios: `lider@demo.trackly`, `martin@demo.trackly`, `lucia@demo.trackly`, `diego@demo.trackly` (cualquier contraseña) o la barra "ver como". Se regenera con `npm run prototipo`.

---

## 6) Prototipo de Interfaz Mobile

La app (Expo Router) tiene:

- **Login** (email y contraseña).
- **Pestañas:** Mis leads (inicio), Alertas, Agenda, Más.
- **Pantallas:** tarjeta del lead (contactar, actualizar estado, notas, plantillas, emails, recordatorios, cierre, reclamar, charlas), Archivo, Casos exitosos / Cerrados perdidos, Charlas (lista, detalle, invitar, asistencia), Panel del equipo y detalle de asesor (reasignar), Configuración, Plantillas, Perfil completo (foto, nombre, contraseña, tema y preferencias).
- **Botón "+"**: nuevo recordatorio y nuevo lead.
- Aviso de **cuenta desactivada**.
- **No incluye:** Estadísticas y Reportes (quedan en la web), importar Excel, Google, notificaciones push (pendientes).

---

## 7) Diagrama de Clases de Dominio

Clases y atributos principales (entre paréntesis, el nombre técnico):

- **Equipo** (tenant): nombre, plan, **licencias**, creadoPor.
- **ConfiguraciónEquipo** (tenant_config): rubro, términos de contacto (singular/plural), vencimiento (habilitado, días, aviso previo, días a archivo, **días hábiles**), categorías de origen, eventos (habilitado, término), email diario, **campos del cierre** (lista configurable), **motivos de pérdida**.
- **Usuario / Perfil** (profiles): nombre, rol (asesor | líder), foto, **activo, desactivadoEn, desactivadoPor, histórico**.
- **Invitación**: email, rol, invitadoPor, creadaEn, aceptadaEn.
- **Lead / Contacto**: nombre, teléfono, email, **emails extra**, origen, consulta, interés, estado (activo, vencido, archivo, ganado, perdido), **destacado**, fechas (ingreso, último contacto, recordatorio, vencido, archivado).
- **EntradaHistorial**: texto, autor, fecha.
- **Recordatorio**: fecha, hora, contacto, nota, hecho, lead (opcional).
- **Cierre**: tipo (ganado | perdido), **datos** (según campos configurados), motivo, cerradoPor.
- **Charla / Evento**: nombre, categoría, fecha, link; **InvitaciónACharla**: asistió, notificadoPor.
- **Plantilla** (nuevo): nombre, canal, asunto, texto, compartida.
- **Reporte** (nuevo): nombre, definición, compartido.

Relaciones: Equipo 1—1 Configuración; Equipo 1—N Usuarios, Leads, Charlas, Recordatorios, Plantillas, Reportes, Invitaciones; Usuario 1—N Leads (asesor), 0..1 Lead sin asignar; Lead 1—N Historial, Recordatorios, 0..1 Cierre, N—M Charlas (vía InvitaciónACharla).

---

## 8) Diagrama Entidad-Relación / Tablas

**12 tablas** (esquema completo en `database/esquema_completo.sql`):

| Tabla | Columnas |
|---|---|
| tenants | id, nombre, plan, created_at, created_by, **licencias** |
| tenant_config | tenant_id, rubro, vencimiento_habilitado, dias_vencimiento_lead, dias_alerta_previa, dias_archivo, termino_contacto, termino_contacto_plural, categorias_origen[], eventos_habilitado, termino_evento, email_diario, **campos_cierre (jsonb), motivos_perdida[], dias_habiles** |
| profiles | id, tenant_id, nombre, rol, avatar_iniciales, created_at, **avatar_url, activo, desactivado_at, desactivado_por, historico** |
| invitaciones | id, tenant_id, email, rol, invitado_por, created_at, aceptada_at |
| leads | id, tenant_id, asesor_id, nombre, telefono, email, **emails_extra[]**, origen, consulta, interes, estado, fijado, **destacado**, fecha_ingreso, ultimo_contacto, recordatorio, created_at, updated_at, **vencido_at, archivado_at** |
| lead_historial | id, lead_id, texto, autor_id, created_at |
| recordatorios | id, tenant_id, asesor_id, lead_id, fecha, hora, contacto, nota, hecho, created_at |
| cierres | id, lead_id, tenant_id, tipo, producto, modalidad, descuento, importe, motivo, **datos (jsonb)**, cerrado_por, created_at, updated_at |
| charlas | id, tenant_id, nombre, carrera, fecha, meet_link, created_by, created_at |
| charla_notificados | id, charla_id, lead_id, asistio, notificado_at, notificado_por |
| **plantillas** (nueva) | id, tenant_id, creado_por, compartida, nombre, canal, asunto, texto, created_at, updated_at |
| **reportes** (nueva) | id, tenant_id, nombre, definicion (jsonb), creado_por, compartido, created_at, updated_at |

**Claves foráneas:** todas las tablas → tenants (tenant_id); leads.asesor_id, lead_historial.autor_id, recordatorios.asesor_id, cierres.cerrado_por, charlas.created_by, charla_notificados.notificado_por, plantillas.creado_por, reportes.creado_por, invitaciones.invitado_por y tenants.created_by → profiles; lead_historial, recordatorios, cierres, charla_notificados → leads; charla_notificados → charlas.

**Lógica en la base:** 47 funciones (cerrar/registrar cierre, reclamar, reactivar, reasignar, importar, crear equipo, invitar, licencias, desactivar/reactivar miembro, cambiar rol, mover de equipo, procesar vencimientos, etc.), 7 triggers (updated_at, validar cierre, contacto repetido, asesor activo, proteger perfil, proteger licencias), RLS en las 12 tablas (39 reglas) y una tarea programada (pg_cron, 03:05 UTC).

Nota: `cierres.producto/modalidad/descuento/importe` quedaron de la primera versión; los cierres nuevos usan `datos` (campos configurables). `leads.fijado` también quedó de una versión anterior (hoy se usa `destacado`).

---

## 9) Definición de los Casos de Prueba

**Automatizados (68):**
- **Web (Vitest, 54):** urgencia y secciones de Mis leads, alertas, contadores, agenda (días hábiles, ocultar días), reportes, estadísticas, comparación entre asesores, importación (columnas, repetidos, errores), plantillas (variables), cliente de la API (errores, sin conexión), **miembros y licencias**, **direcciones de navegación**.
- **Backend (node:test, 14):** validaciones (recordatorios, emails, reportes), traducción de errores de la base, encabezados de seguridad, límite de pedidos, validación de tokens y **rutas que exigen sesión**.

**Probados a mano / en base de prueba (para documentar como casos):**
- Licencias: equipo nuevo con 1 licencia no puede invitar; con 3 licencias, invitar 2 y la tercera da error; desactivar libera licencia; reactivar sin licencia da error.
- Desactivar: el desactivado no ve datos (lista vacía); no se le pueden asignar leads; no se puede desactivar a uno mismo.
- Cambio de equipo: los leads, notas, cierres y charlas quedan en el equipo anterior a nombre del perfil histórico; la cuenta queda activa en el equipo nuevo; único líder no puede irse; no se puede quitar el último líder.
- Protecciones: un usuario no puede cambiarse el rol, el estado activo ni las licencias de forma directa.
- Navegación: abrir contacto cambia la dirección, Atrás lo cierra, recargar mantiene la pantalla, enlace a contacto cerrado lo abre.
- Login: validaciones de crear cuenta (nombre, contraseña, términos), credenciales inválidas, volver a la landing.

---

## 10) Documento de Trazabilidad

Agregar filas: RF45→CU18→`pages/Reportes.jsx`, `lib/reportes.js`, `/api/reportes`, tabla reportes, tests reportes. RF46→CU19→`pages/Perfil.jsx`, `/api/me`, Storage avatares. RF47→CU20→`components/ImportarLeads.jsx`, `lib/importar.js`, `/api/leads/importar`, `importar_leads()`, tests importar. RF48→CU21/22→`components/PlantillasEditor.jsx`, `lib/plantillas.js`, `/api/plantillas`, tabla plantillas. RF49→CU29→`lib/preferencias.js`. RF50→trigger `controlar_contacto_repetido`. RF51→CU23→`pages/Landing.jsx`. RF52→CU24→`pages/Legal.jsx`, `pages/Login.jsx`. RF53→CU26/27/28→`pages/Configuracion.jsx`, `pages/PanelLider.jsx`, `components/Invitaciones.jsx`, `lib/miembros.js`, `/api/config/miembros`, `/api/me/invitaciones`, `database/19_licencias.sql`, tests miembros.

---

## 11) Diseño de la Arquitectura

- **Cliente web:** SPA React 19 + Vite + Tailwind 4, publicada en **Vercel**. Navegación por direcciones con hash (sin librería de ruteo). Pantallas internas cargadas bajo demanda.
- **App mobile:** Expo SDK 58 + Expo Router (React Native), reutiliza la lógica de `frontend/src/lib`.
- **Backend:** API REST Node.js + Express 5 en **Railway**, en capas: rutas → controladores → servicios → `lib`. Valida el token con la clave pública del proyecto y crea por pedido un cliente de Supabase **con el token del usuario** (la base aplica RLS); nunca usa clave de servicio.
- **Datos y servicios:** Supabase = PostgreSQL (RLS multi-equipo, funciones `security definer`, triggers), **Auth** (email/contraseña y Google OAuth, confirmación de email), **Storage** (fotos de perfil, bucket público de 1 MB) y **pg_cron** (vencimientos nocturnos).
- **Integraciones salientes:** WhatsApp (enlaces wa.me) y Gmail (enlace de redacción).
- **CI:** GitHub Actions (backend, frontend, mobile) en cada push a main.

---

## 12) Diagrama de Clases de Diseño

- **Backend:** `routes/*` (leads, onboarding, config, me, cierres, recordatorios, charlas, reportes, plantillas) → `controllers/*Controller` → `services/*Service` → `lib/` (errores, configEquipo, historial, recordatorios, reportes); `middleware/` (auth, errores, seguridad: encabezados y límite de pedidos).
- **Frontend:** `App` (sesión, perfil, contexto de configuración y de lista compartida, navegación) → `pages/*` → `components/*`; `lib/*` lógica pura testeada (urgencia, alertas, agenda, contadores, estadísticas, reportes, importar, plantillas, miembros, navegación, api, sesión, tema, preferencias). Contextos: `ConfigEquipoContext`, `LeadsEquipoContext`.
- **Mobile:** `app/*` (pantallas por archivo) → `components/*`; `lib/sesion.js` (proveedor de sesión y datos), `lib/api.js`, `lib/compartido.js` (reexporta la lógica de la web).

---

## 13) Diseño de Componentes

- **Web, pantallas (15):** Landing, Login, Legal, Onboarding, MisLeads, AlertasHoy, Agenda, Charlas, Archivo, CasosCerrados, Estadisticas, Reportes, Perfil, PanelLider, Configuracion.
- **Web, componentes:** Sidebar, Topbar, DetalleLead, LeadCard, NuevoLeadModal, ImportarLeads, RecordatorioModal, CierreLead, CharlasLead, PlantillasEditor, CamposEquipo, Graficos, ResultadosBusqueda, Avatar, Logo, CampoContrasena, CambioContrasena, **Confirmacion, Invitaciones** (nuevos), landing/ (Demos, Piezas, Calculadora, Preguntas).
- **Mobile:** pantallas login, (tabs) index/alertas/agenda/mas, lead/[id], archivo, cerrados/[tipo], charlas, charla/[id], panel, panel/[id], configuracion, plantillas, perfil; componentes Hoja, Formulario, ActualizarEstado, NuevoLead, NuevoRecordatorio, ElegirFechaHora, CharlasLead, Asistencia, Reasignar, BotonesContacto, FilaLead, Indicador, ListaEditable, FormCharla, Presionable, Pill, Texto, Icono, Encabezado, Avatar.

---

## 14) Diseño de las Interfaces entre Sistemas

**API REST propia** (todas con `Authorization: Bearer <token de Supabase>`, JSON):

- `/api/leads`: GET (lista; `?estado=activo,vencido`), GET `/buscar`, GET `/totales`, **GET `/:id`**, POST, POST `/importar`, PATCH `/:id`, GET/POST `/:id/historial`, POST `/:id/reclamar`, `/:id/reactivar`, `/:id/reasignar`.
- `/api/me`: GET (perfil; si está desactivado devuelve `{desactivado, equipo, invitaciones}`), PATCH (nombre), PUT/DELETE `/foto`, **POST `/invitaciones/:id/aceptar`, DELETE `/invitaciones/:id`**.
- `/api/config`: GET, PUT, GET `/equipo` (miembros, invitaciones, **licencias**), POST/DELETE `/invitaciones`, **POST `/miembros/:id/desactivar`, `/miembros/:id/reactivar`, PATCH `/miembros/:id`** (rol).
- `/api/onboarding` POST; `/api/cierres` GET, GET/PUT `/:leadId`; `/api/recordatorios` GET, POST, PATCH `/:id`; `/api/charlas` GET, POST, GET `/proximas`, GET `/lead/:leadId`, GET/PUT/DELETE `/:id`, POST `/:id/invitados`, PATCH `/invitados/:id`; `/api/reportes` y `/api/plantillas` GET, POST, PUT/DELETE `/:id`; `/api/health`.

**Externos:** Supabase Auth (login, registro con metadatos `full_name` y `terminos_aceptados`, recuperación, Google OAuth), Supabase PostgREST y RPC (funciones SQL), Supabase Storage, pg_cron, WhatsApp wa.me, Gmail compose. **Pendiente:** SMTP (Brevo o Resend) para emails.

---

## 15) Manual de Instalación (datos para escribirlo)

- **Requisitos:** Node.js 22, Git, cuentas en Supabase, Railway, Vercel y Google Cloud (para el login con Google); Expo Go en el celular para la app.
- **Base:** crear proyecto en Supabase → correr `database/esquema_completo.sql` en el SQL Editor (proyecto vacío) **o** los scripts 1 a 19 en orden (`database/LEEME.txt`). En Auth: activar confirmación de email, proveedor Google y las URLs de redirección (la de Vercel). Licencias: `update tenants set licencias = N where nombre = '...'`. Opcional: `seed_equipo_demo.sql`.
- **Backend** (`backend/`): variables `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `FRONTEND_URL` (URL de Vercel, para CORS), `PORT`; `npm ci`, `npm start` (desarrollo: `npm run dev`). En Railway, carpeta raíz `backend`.
- **Web** (`frontend/`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL` (URL de Railway); `npm ci`, `npm run dev`, `npm run build`. En Vercel, carpeta raíz `frontend`.
- **Mobile** (`mobile/`): `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_API_URL` en `mobile/.env`; `npm ci`, `npx expo start` y escanear el QR con Expo Go (o `w` para verla en el navegador).
- **Verificación:** `npm test` en backend y frontend; GitHub Actions corre todo en cada push.

---

## 16) Plan de Tareas Post Cursada

1. **Emails** (SMTP con Brevo o Resend): resumen diario (RF28) e invitaciones (RF02).
2. **App mobile:** notificaciones push (RF43), ingreso con Google (RF41), importar Excel, APK para Android, cierre de sesión por inactividad y sesión cifrada.
3. **Cobro de planes y licencias** (RF33) y panel de administración de Trackly (hoy se cargan a mano).
4. **Seguridad y datos:** cerrar escrituras directas a tablas (todo por funciones), borrar cuentas de prueba con contraseña publicada, ajustes menores de licencias, tests automáticos de la base en CI, migraciones con Supabase CLI.
5. **Escala:** paginar listas (> 1.000 contactos), actualizar la lista en memoria, búsqueda con índice trigram.
6. **Exportar a Excel** y **copias de respaldo** programadas.
7. **Accesibilidad:** foco en ventanas, etiquetas asociadas, contraste del texto secundario.
8. **Tutorial** de primer ingreso y rediseño del onboarding.
9. **Prototipo de la app mobile** en HTML (el de la web ya está).
10. Plan **Hobby de Railway** (el de prueba vence) y dominio propio.
