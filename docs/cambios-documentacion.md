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

### RF48 — Plantillas de mensajes *(nuevo, sección 4.3 Contacto)*
> El sistema debe permitir crear plantillas de mensajes para WhatsApp, email o ambos, con un nombre,
> un asunto (para email) y un texto donde se pueden usar datos que se completan solos: {nombre},
> {nombre_completo}, {mi_nombre} y {equipo}. Cada usuario tiene sus plantillas; el líder puede
> compartirlas con todo el equipo. Desde la tarjeta de un contacto se elige una plantilla y se abre
> WhatsApp o Gmail con el mensaje ya escrito.

- Prioridad media, Etapa 2. Caso de uso sugerido: **CU21 — Usar una plantilla de mensaje** (actor: Asesor y Líder).

### RF49 — Preferencias personales *(nuevo, sección 4.1, dentro de Mi perfil)*
> Cada usuario puede elegir: la pantalla con la que abre la app (Mis leads, Alertas o Agenda), los
> botones para programar el próximo contacto (de 1 a 4, entre 1 y 30 días), si esos recordatorios
> quedan a la misma hora o a una hora fija, cuántos contactos se ven por sección en Mis leads, el modo
> claro u oscuro y qué días de la semana muestra la Agenda (se puede ocultar cualquiera; un día oculto
> con recordatorios se muestra igual). Se guardan en el navegador.

### RF50 — Contactos sin repetir y varios emails *(nuevo, sección 4.2 Gestión de leads)*
> En un mismo equipo no puede haber dos contactos con el mismo teléfono ni con un email en común, en
> ningún estado. El sistema lo controla al crear, editar o importar contactos y avisa con qué contacto
> coincide. Un contacto puede tener varios emails (uno principal y hasta 10 más): se agregan y quitan
> desde su tarjeta, y al enviar un correo se elige a cuál.

### RF51 — Página de bienvenida *(nuevo, sección 4.1 Acceso y equipo)*
> El sistema debe mostrar, a quien todavía no ingresó, una página de bienvenida que explique qué hace
> Trackly: cómo prioriza los contactos, cómo avisa antes de que venzan, el contacto por WhatsApp con
> plantillas, el panel del líder, la adaptación a cada rubro, la app mobile y las estadísticas, con
> demostraciones animadas de la propia interfaz y tres datos de la encuesta (Anexo A). Desde ahí se
> crea una cuenta o se ingresa. Quien ya ingresó alguna vez desde ese navegador va directo al login.

- Prioridad baja, Etapa 2. Se adapta al celular y al modo oscuro, y respeta la opción del sistema
  de "reducir movimiento".

### RF52 — Términos y condiciones y política de privacidad *(nuevo, sección 4.1 Acceso y equipo)*

- Dos páginas públicas, sin iniciar sesión: `/?legal=terminos` y `/?legal=privacidad` (`pages/Legal.jsx`). Se enlazan desde el registro y desde el pie de la landing.
- La política sigue la **Ley 25.326**: el equipo es responsable de los datos de sus contactos y Trackly es encargado del tratamiento; dice dónde se guardan (Supabase, Vercel, Railway; puede haber transferencia internacional), cómo se protegen, cuánto tiempo se guardan, los derechos de acceso, rectificación y supresión, y el aviso de la AAIP como órgano de control.
- Para crear la cuenta hay que tildar la aceptación; con Google se avisa que continuar implica aceptarlos.
- Explican el modelo de cuentas de empresa: el acceso lo administra el equipo, cada persona ocupa una licencia y las bajas las decide el equipo.

### RF53 — Licencias y miembros del equipo *(nuevo, sección 4.1 Acceso y equipo)*

- **Licencias:** cada equipo tiene una cantidad de licencias. Ocupan licencia los miembros activos y las invitaciones pendientes. Un equipo nuevo arranca con **1 licencia** (plan gratuito individual); las demás las carga a mano el administrador de Trackly.
- **Desactivar en vez de borrar:** el líder desactiva a quien se va. Esa persona no puede entrar más, su licencia queda libre y sus leads siguen a su nombre hasta que el líder los reasigna (el Panel del equipo avisa cuántos quedan). El historial no se toca (RNF09). Se puede reactivar si hay licencia libre.
- **Cambiar de equipo con la misma cuenta:** si otro equipo invita a alguien (aunque use su mail personal), al aceptar su perfil viejo queda como "histórico" en el equipo anterior, con todo lo que hizo, y su cuenta pasa al equipo nuevo. Si era la única persona líder de su equipo, primero tiene que nombrar a otra.
- **Roles:** el líder puede pasar a alguien de asesor a líder y al revés; siempre queda al menos una persona líder.
- Los usuarios no se dan de baja solos: la baja la decide el equipo.

## Requerimientos que cambian

| Dónde | Antes | Ahora |
|---|---|---|
| **RNF04** (Rendimiento) | Cargar en menos de 2 s con hasta 5.000 leads | Mismo objetivo; se explica cómo se cumple: la app descarga **una sola lista de trabajo** (leads activos y vencidos) y la comparten todas las pantallas. Se vuelve a pedir solo cuando algo cambia o si pasó más de un minuto. Los ganados y perdidos no se descargan para los contadores: se cuentan en la base. Estadísticas y Reportes piden el historial con solo las columnas que usan, y solo al abrirse. En la base, las reglas de seguridad (RLS) se calculan una vez por consulta y no por fila, y hay índices en las tablas más consultadas (en una prueba con 10.000 leads, la consulta pasó de 21 ms a 1 ms). El backend valida la sesión con la clave pública del proyecto, sin consultar a Supabase en cada pedido, y los contadores de charlas se cuentan en la base. Casos exitosos y Cerrados perdidos se cargan de a 30 ("Ver más"), y cada pantalla se descarga recién la primera vez que se abre. |
| **RNF01** (Seguridad) | Datos aislados con RLS; sesiones con Supabase Auth | Igual, más **cierre de sesión por inactividad**: después de 8 horas sin usar la app (también si se cerró el navegador) hay que volver a ingresar. Supabase deja la sesión abierta sin límite y su límite por tiempo es de los planes pagos, por eso lo controla la app. |
| **RNF03** (Seguridad) | Permisos en backend y base; HTTPS | Igual, más **encabezados de seguridad** en todas las respuestas (sin iframes, sin adivinar tipos de archivo, HTTPS obligatorio) y **límite de pedidos**: 1.000 por minuto por IP en la API y 10 fotos por minuto. Los errores técnicos de la base no llegan al usuario: se muestran mensajes claros en castellano. |
| **RNF12** (Mantenibilidad) | Monorepo, componentes reutilizables y Git | Igual, más **tests automáticos** (14 del backend con el test runner de Node y 50 del frontend con Vitest: urgencia, alertas, contadores, agenda, reportes, estadísticas, comparación entre asesores, miembros y licencias, validaciones, sesión, límite de pedidos, historial y mensajes de error), **formato unificado** con Prettier y un **chequeo automático en GitHub Actions** que en cada push corre tests, lint, formato y build de la web y el backend, y compila la app mobile. La app mobile **reutiliza la lógica de la web** (urgencia, alertas, agenda, plantillas): el mismo código decide qué está por vencer en la compu y en el celular. |
| **RNF11** (Responsividad) | La web se adapta de 360 a 1920 px | La web es de escritorio: funciona desde 1024 px (si la ventana es más angosta, aparece una barra para desplazarse). El celular se cubre con la app mobile (RF41 a RF44). |
| **RNF07** (Usabilidad) | Interfaz clara y consistente | Igual, más un **sistema de diseño común** a la web y la app: los mismos colores (claro y oscuro), la misma letra (**Inter**) y las mismas etiquetas. El movimiento sigue pautas de diseño de interfaces (Emil Kowalski e Impeccable): los botones responden al tocarlos, las ventanas aparecen con una transición corta, las animaciones duran menos de 300 ms y, si la persona pidió "reducir movimiento" en su sistema, no hay escalas ni desplazamientos. |
| **RF37** (Estadísticas) | Dashboard con leads por origen, interés, evolución semanal y tasa de contacto | Igual, más los indicadores de ganados y **tasa de conversión** (ganados sobre cerrados), y filtros por período (30 días, 90 días o todo) y por asesor (líder). |
| **RF17 / RF18 / RF36** (Vencido, reclamo y archivo) | — | La vista **Archivo** tiene dos pestañas: *Vencidos* (se reclaman, con confirmación) y *Archivados* (se reactivan). |
| **RF05** (Onboarding) | 5 pasos | **4 pasos**: Tu equipo, Contactos, Eventos y Resumen (se sacó "Invitar": un equipo nuevo tiene 1 licencia). El paso 1 pide además el nombre de la persona y el paso 2 pide también el aviso previo y los días hasta pasar a Archivo. |
| **RF01** (Login) | Email/contraseña y Google | Pantalla dividida: a la izquierda un panel violeta con el logo, el lema y tres datos de la encuesta; a la derecha el formulario, con Google abajo. **"¿Olvidaste tu contraseña?"**: Supabase manda un enlace por email y, al volver, la persona elige una contraseña nueva antes de entrar. **Crear cuenta** pide nombre y apellido (pasa al onboarding), muestra el requisito de mínimo 6 caracteres y exige aceptar los **términos y condiciones y la política de privacidad**; la fecha de aceptación queda guardada en la cuenta (`terminos_aceptados`). |
| **RF02** (Invitaciones) | El líder invita por email | El líder carga los emails; la persona entra sola al equipo cuando crea su cuenta con ese email. **Pendiente:** mandar el email de invitación (necesita configurar SMTP). |
| **RF06** (Campos de cierre) | Definir nombre, tipo y si es obligatorio | Igual. Los tipos son texto, número y lista de opciones; se pueden ordenar. Los equipos que ya existían arrancaron con carrera, modalidad, descuento e importe. |
| **RF29** (Eventos) | Con categoría | La categoría es opcional y se sugiere desde las categorías de origen. El menú muestra el nombre que eligió el equipo ("Charlas", "Webinars"...) y solo aparece si el equipo usa eventos. |
| **RF25 / RF27** (Agenda y recordatorios) | La agenda muestra los recordatorios del día | La Agenda junta los recordatorios manuales y los de las tarjetas de los leads, con tres vistas: 5 días, semana y mes (calendario). Al tocar un recordatorio se abre su detalle: los manuales se editan o se marcan como hechos, y los de un lead llevan a su tarjeta. Los recordatorios manuales se pueden crear para cualquier día desde hoy. Los atrasados se muestran en una franja arriba. Cada recordatorio se completa con un ✓: los manuales se marcan como hechos y los de un lead registran el contacto. El día y la hora del recordatorio de un lead se cambian desde la misma ventana. |
| **RF09 / RF10** (Mis leads) | Leads ordenados por urgencia | Secciones: Por vencer, Sin contactar, **Sin próximo paso** (contactados sin un recordatorio pendiente), Esta semana y Al día (contactados con próximo contacto programado). Cada sección muestra **7 contactos** (se cambia en Mi perfil: 5, 7, 10, 15 o todos) y un botón **"Ver todos"** que abre la lista completa con buscador. Las tarjetas de arriba también abren cada sección. |
| **RF25** (Recordatorio del lead) | Programar un recordatorio | Igual, más: al tocar **"Registré contacto hoy"** la tarjeta pregunta *"¿Cuándo lo volvés a contactar?"* con botones rápidos (Mañana, En 3 días, En 1 semana, Elegir fecha, No hace falta). Si un contacto queda sin próximo paso, la tarjeta lo avisa con los mismos botones. |
| **RF06** (Configuración del equipo) | Campos del cierre, plazos, categorías | Igual, más **motivos de pérdida**: la lista que se ofrece al cerrar como perdido (con "Otro" para escribir). Los equipos existentes arrancan con Precio, Eligió otra opción, No respondió, Horarios y Ya no le interesa. |
| **RF15 / RF16** (Vencimiento) | Plazo en días | El líder elige si el plazo cuenta **días corridos o solo hábiles** (lunes a viernes; los feriados cuentan). Vale para el aviso previo, el vencimiento y el paso a Archivo, y el proceso nocturno usa la misma cuenta que la app. |
| **RF37** (Estadísticas) | — | Nuevo gráfico **"¿Por qué se pierden?"**: los perdidos del período por motivo. Los reportes personalizados (RF45) también se pueden agrupar por **motivo de pérdida**. |
| **RF37** (Estadísticas) | — | Para el líder, **comparación entre asesores**: ganados y tasa de conversión por asesor, y una tabla con ingresados, contactados, ganados, perdidos, conversión, vencidos e importe de cada persona en el período. |
| **RF38** (Panel del equipo) | Indicadores de solo lectura | Los indicadores se tocan y muestran la lista correspondiente (por ejemplo, los vencidos de un asesor). |
| **1.5 / 4.11** (App mobile) | Alcance reducido: login, panel de urgentes, notificaciones, tarjeta y actualización de estado | La app mobile tiene **toda la funcionalidad de la web menos Estadísticas y Reportes** (que quedan en la web): Mis leads, Alertas, Agenda, tarjeta completa con cierre, Archivo, casos cerrados, charlas, panel del equipo, configuración, plantillas y perfil. |
| **RF08 / RF04** (Estados) | — | El estado de un lead no se cambia a mano: cambia solo al cerrar, reclamar o reactivar, y cada cambio queda en el historial. |

## Para corregir en la propuesta

- **4.5 Modelo de negocio y RF33:** el plan equipo dice "usuarios ilimitados"; pasa a ser **por cantidad de licencias** (cada persona activa o invitada ocupa una). El plan gratuito es 1 licencia.
- **RF02:** habla de tres roles (asesor, líder y administrador). En la app hay dos; el "administrador" que carga las licencias es, por ahora, el equipo de Trackly desde Supabase.
- **RF34:** el onboarding quedó en cuatro pasos (equipo, contactos, eventos y resumen), como dice la propuesta: se sacó el paso de invitar, porque con 1 licencia no hay a quién.
- **2.2 Encuesta:** las cifras se publican aclarando que fueron 8 respuestas.

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
| App mobile | React Native + Expo | Igual: **Expo SDK 58 con Expo Router**, para Android (y iPhone con Expo Go). Usa el mismo backend y la misma base que la web |
| Diseño y animación | — | Letra **Inter** en web y app; **Motion** (ex Framer Motion) para las animaciones de la página de bienvenida; animaciones nativas de React Native en la app |
| Integraciones | WhatsApp, Gmail API, Outlook, Google auth | WhatsApp (wa.me) y Gmail (enlace para redactar); Google OAuth funcionando. Outlook y Gmail API quedan como mejora. |

## Pendientes que siguen en la documentación

- **RF28** — Email diario a las 8:00 (necesita SMTP).
- **RF02** — Envío del email de invitación (necesita SMTP).
- **RF43** — Notificaciones de la app mobile (resumen de las 8:00, "vence hoy" y recordatorio 15 minutos antes).
- **RF41** — Ingreso con Google en la app mobile (con email y contraseña ya funciona).
- **APK** de la app mobile para instalarla en Android.
- **Importar desde Excel** en la app mobile (en la web ya funciona).
