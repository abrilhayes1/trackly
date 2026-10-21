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

## Requerimientos que cambian

| Dónde | Antes | Ahora |
|---|---|---|
| **RNF11** (Responsividad) | La web se adapta de 360 a 1920 px | La web es de escritorio: funciona desde 1024 px (si la ventana es más angosta, aparece una barra para desplazarse). El celular se cubre con la app mobile (RF41 a RF44). |
| **RF37** (Estadísticas) | Dashboard con leads por origen, interés, evolución semanal y tasa de contacto | Igual, más los indicadores de ganados y **tasa de conversión** (ganados sobre cerrados), y filtros por período (30 días, 90 días o todo) y por asesor (líder). |
| **RF17 / RF18 / RF36** (Vencido, reclamo y archivo) | — | La vista **Archivo** tiene dos pestañas: *Vencidos* (se reclaman, con confirmación) y *Archivados* (se reactivan). |
| **RF05** (Onboarding) | 5 pasos | Mismos 5 pasos. El paso 1 pide además el nombre de la persona y el paso 2 pide también el aviso previo y los días hasta pasar a Archivo. |
| **RF02** (Invitaciones) | El líder invita por email | El líder carga los emails; la persona entra sola al equipo cuando crea su cuenta con ese email. **Pendiente:** mandar el email de invitación (necesita configurar SMTP). |
| **RF06** (Campos de cierre) | Definir nombre, tipo y si es obligatorio | Igual. Los tipos son texto, número y lista de opciones; se pueden ordenar. Los equipos que ya existían arrancaron con carrera, modalidad, descuento e importe. |
| **RF29** (Eventos) | Con categoría | La categoría es opcional y se sugiere desde las categorías de origen. El menú muestra el nombre que eligió el equipo ("Charlas", "Webinars"...) y solo aparece si el equipo usa eventos. |
| **RF25 / RF27** (Agenda y recordatorios) | La agenda muestra los recordatorios del día | La Agenda junta los recordatorios manuales y los de las tarjetas de los leads, con tres vistas: 5 días, semana y mes (calendario). Al tocar un recordatorio se abre su detalle: los manuales se editan o se marcan como hechos, y los de un lead llevan a su tarjeta. Los recordatorios manuales se pueden crear para cualquier día desde hoy. Los atrasados se muestran en una franja arriba. |
| **RF08 / RF04** (Estados) | — | El estado de un lead no se cambia a mano: cambia solo al cerrar, reclamar o reactivar, y cada cambio queda en el historial. |

## Detalles que conviene mencionar

- **Navegación (2.2):** los contadores del menú son: Mis leads (por vencer), Alertas de hoy,
  Agenda (recordatorios pendientes, manuales y de leads), Charlas (próximas), Archivo (vencidos), Casos exitosos,
  Cerrados perdidos y, para el líder, Panel del equipo (sin asignar).
- **Vistas del líder (2.1 / RF38):** hay una pantalla propia, **Panel del equipo**, con pestañas
  Asesores (resumen por asesor, RF40), Leads del equipo (reasignar, RF39) y Sin asignar.
- **Login (RF01):** además de email y Google, hay "Crear cuenta" desde la misma pantalla.
- **Destacados (RF10):** se marcan con una estrella en la tarjeta y aparecen arriba de todo en
  Mis leads.

## Stack (1.6)

| Componente | Antes | Ahora |
|---|---|---|
| Frontend web | React + Vite + Tailwind CSS | Igual, **publicado en Vercel** |
| Backend | Node.js + Express en Railway | Igual (Railway) |
| Base de datos | Supabase | Igual; además **pg_cron** para el proceso nocturno de vencimiento (CU16) |
| Integraciones | WhatsApp, Gmail API, Outlook, Google auth | WhatsApp (wa.me) y Gmail (enlace para redactar); Google OAuth funcionando. Outlook y Gmail API quedan como mejora. |

## Pendientes que siguen en la documentación

- **RF28** — Email diario a las 8:00 (necesita SMTP).
- **RF02** — Envío del email de invitación (necesita SMTP).
- **RF41 a RF44** — App mobile (React Native + Expo, APK para Android).
