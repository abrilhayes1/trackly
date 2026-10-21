# Cambios para actualizar en la documentación

Lista de lo que hoy hace Trackly distinto o de más respecto de `docs/documentacion.pdf`
(Parcial 1). Sirve para actualizar el documento antes de la próxima entrega. Cada punto dice
**qué sección tocar** y **qué cambió**.

## Requerimientos nuevos

### RF45 — Reportes personalizados *(nuevo, sección 4.9 Estadísticas)*
> El sistema debe permitir a cada usuario crear reportes eligiendo qué medir (cantidad de
> contactos, contactados, ganados, perdidos, tasa de contacto, tasa de conversión, o suma o promedio
> de un campo numérico del cierre), cómo agruparlo (origen, nivel de interés, asesor, estado, semana
> o mes de ingreso, o un campo del cierre), qué filtrar (período, estado, asesor, origen, interés y
> destacados) y cómo verlo (número, barras, columnas o tabla), con vista previa. Los reportes se
> guardan como privados; el líder puede además compartirlos con todo el equipo.

- Agregarlo también al **backlog (Anexo F)** como ítem de prioridad media, Etapa 2.
- Caso de uso sugerido: **CU18 — Crear reporte personalizado** (actor: Asesor y Líder).

### RF46 — Gestión de la cuenta propia *(nuevo, sección 4.1 Acceso y equipo)*
> El sistema debe permitir a cada usuario ver su perfil (foto, nombre, email, rol, equipo, fecha de
> ingreso y forma de ingreso) y sus números (leads activos, contactados, ganados, perdidos y tasa de
> conversión); cambiar su nombre y su foto, que se ven en todo el equipo; cambiar su contraseña si
> ingresa con email, y elegir el modo claro, oscuro o el del sistema. Si ingresa con Google y nunca
> eligió una foto, se usa la de su cuenta de Google.

- Prioridad media, Etapa 2. Caso de uso sugerido: **CU19 — Gestionar mi perfil** (actor: Asesor y Líder).
- El email, el rol y el equipo no se cambian desde acá (el rol lo define el líder).

### RF47 — Importar contactos desde una planilla *(nuevo, sección 4.2 Gestión de leads)*
> El sistema debe permitir importar contactos desde un archivo de Excel (.xlsx) o CSV. El sistema
> reconoce las columnas por su título (nombre, apellido, teléfono, email, origen, consulta) y deja
> corregirlas; muestra una vista previa que marca las filas con errores (sin nombre, sin teléfono ni
> email, email inválido) y las repetidas (mismo teléfono o email que un contacto del equipo o que
> otra fila del archivo), que no se importan. El asesor importa a su nombre; el líder puede asignarlos
> a sí mismo, a otra persona del equipo o dejarlos sin asignar. Los contactos entran activos, con una
> entrada en su historial, y al terminar se puede descargar la lista de los que no se importaron.

- Prioridad media, Etapa 2. Caso de uso sugerido: **CU20 — Importar contactos** (actor: Asesor y Líder).
- Hasta 2.000 contactos por archivo; el teléfono se compara por sus últimos 10 dígitos.

## Requerimientos que cambian

| Dónde | Antes | Ahora |
|---|---|---|
| **RNF04** (Rendimiento) | Cargar en menos de 2 s con hasta 5.000 leads | Mismo objetivo; se explica cómo se cumple: la app descarga **una sola lista de trabajo** (leads activos y vencidos) y la comparten todas las pantallas. Se vuelve a pedir solo cuando algo cambia o si pasó más de un minuto. Los ganados y perdidos no se descargan para los contadores: se cuentan en la base. Estadísticas y Reportes piden el historial con solo las columnas que usan, y solo al abrirse. En la base, las reglas de seguridad (RLS) se calculan una vez por consulta y no por fila, y hay índices en las tablas más consultadas (en una prueba con 10.000 leads, la consulta pasó de 21 ms a 1 ms). El backend valida la sesión con la clave pública del proyecto, sin consultar a Supabase en cada pedido, y los contadores de charlas se cuentan en la base. Casos exitosos y Cerrados perdidos se cargan de a 30 ("Ver más"), y cada pantalla se descarga recién la primera vez que se abre. |
| **RNF01** (Seguridad) | Datos aislados con RLS; sesiones con Supabase Auth | Igual, más **cierre de sesión por inactividad**: después de 8 horas sin usar la app (también si se cerró el navegador) hay que volver a ingresar. Supabase deja la sesión abierta sin límite y su límite por tiempo es de los planes pagos, por eso lo controla la app. |
| **RNF03** (Seguridad) | Permisos en backend y base; HTTPS | Igual, más **encabezados de seguridad** en todas las respuestas (sin iframes, sin adivinar tipos de archivo, HTTPS obligatorio) y **límite de pedidos**: 1.000 por minuto por IP en la API y 10 fotos por minuto. Los errores técnicos de la base no llegan al usuario: se muestran mensajes claros en castellano. |
| **RNF12** (Mantenibilidad) | Monorepo, componentes reutilizables y Git | Igual, más **tests automáticos** (10 del backend con el test runner de Node y 16 del frontend con Vitest: urgencia, alertas, contadores, agenda, reportes, estadísticas, validaciones, sesión, límite de pedidos), **formato unificado** con Prettier y un **chequeo automático en GitHub Actions** que en cada push corre tests, lint, formato y build. |
| **RNF11** (Responsividad) | La web se adapta de 360 a 1920 px | La web es de escritorio: funciona desde 1024 px (si la ventana es más angosta, aparece una barra para desplazarse). El celular se cubre con la app mobile (RF41 a RF44). |
| **RF37** (Estadísticas) | Dashboard con leads por origen, interés, evolución semanal y tasa de contacto | Igual, más los indicadores de ganados y **tasa de conversión** (ganados sobre cerrados), y filtros por período (30 días, 90 días o todo) y por asesor (líder). |
| **RF17 / RF18 / RF36** (Vencido, reclamo y archivo) | — | La vista **Archivo** tiene dos pestañas: *Vencidos* (se reclaman, con confirmación) y *Archivados* (se reactivan). |
| **RF05** (Onboarding) | 5 pasos | Mismos 5 pasos. El paso 1 pide además el nombre de la persona y el paso 2 pide también el aviso previo y los días hasta pasar a Archivo. |
| **RF01** (Login) | Email/contraseña y Google | Igual, más **"¿Olvidaste tu contraseña?"**: Supabase manda un enlace por email y, al volver, la persona elige una contraseña nueva antes de entrar. |
| **RF02** (Invitaciones) | El líder invita por email | El líder carga los emails; la persona entra sola al equipo cuando crea su cuenta con ese email. **Pendiente:** mandar el email de invitación (necesita configurar SMTP). |
| **RF06** (Campos de cierre) | Definir nombre, tipo y si es obligatorio | Igual. Los tipos son texto, número y lista de opciones; se pueden ordenar. Los equipos que ya existían arrancaron con carrera, modalidad, descuento e importe. |
| **RF29** (Eventos) | Con categoría | La categoría es opcional y se sugiere desde las categorías de origen. El menú muestra el nombre que eligió el equipo ("Charlas", "Webinars"...) y solo aparece si el equipo usa eventos. |
| **RF25 / RF27** (Agenda y recordatorios) | La agenda muestra los recordatorios del día | La Agenda junta los recordatorios manuales y los de las tarjetas de los leads, con tres vistas: 5 días, semana y mes (calendario). Al tocar un recordatorio se abre su detalle: los manuales se editan o se marcan como hechos, y los de un lead llevan a su tarjeta. Los recordatorios manuales se pueden crear para cualquier día desde hoy. Los atrasados se muestran en una franja arriba. Cada recordatorio se completa con un ✓: los manuales se marcan como hechos y los de un lead registran el contacto. El día y la hora del recordatorio de un lead se cambian desde la misma ventana. |
| **RF08 / RF04** (Estados) | — | El estado de un lead no se cambia a mano: cambia solo al cerrar, reclamar o reactivar, y cada cambio queda en el historial. |

## Detalles que conviene mencionar

- **Navegación (2.2):** los contadores del menú son: Mis leads (por vencer), Alertas de hoy,
  Agenda (recordatorios pendientes, manuales y de leads), Charlas (próximas), Archivo (vencidos), Casos exitosos,
  Cerrados perdidos y, para el líder, Panel del equipo (sin asignar).
- **Vistas del líder (2.1 / RF38):** hay una pantalla propia, **Panel del equipo**, con pestañas
  Asesores (resumen por asesor, RF40), Leads del equipo (reasignar, RF39) y Sin asignar.
- **Login (RF01):** además de email y Google, hay "Crear cuenta" desde la misma pantalla.
- **Modo oscuro (nuevo):** la web tiene modo claro y oscuro, con un botón en la barra superior. Si
  la persona no eligió, usa el del sistema operativo. Se puede mencionar en usabilidad (RNF07) o
  como mejora de interfaz; si se agrega como requerimiento, sería un RF nuevo de prioridad baja.
- **Destacados (RF10):** se marcan con una estrella en la tarjeta y aparecen arriba de todo en
  Mis leads.

## Stack (1.6)

| Componente | Antes | Ahora |
|---|---|---|
| Frontend web | React + Vite + Tailwind CSS | Igual, **publicado en Vercel** |
| Backend | Node.js + Express en Railway | Igual (Railway) |
| Base de datos | Supabase | Igual; además **pg_cron** para el proceso nocturno de vencimiento (CU16) y **Supabase Storage** para las fotos de perfil (la app las achica a unos 30 KB y las sube a través del backend, como pide RNF02) |
| Integraciones | WhatsApp, Gmail API, Outlook, Google auth | WhatsApp (wa.me) y Gmail (enlace para redactar); Google OAuth funcionando. Outlook y Gmail API quedan como mejora. |

## Pendientes que siguen en la documentación

- **RF28** — Email diario a las 8:00 (necesita SMTP).
- **RF02** — Envío del email de invitación (necesita SMTP).
- **RF41 a RF44** — App mobile (React Native + Expo, APK para Android).
