# Trackly mobile

App de Trackly para Android (y iPhone con Expo Go), hecha con **React Native + Expo SDK 58** y
**Expo Router**. Usa el mismo backend (Railway) y la misma base (Supabase) que la web, y la misma
lógica de negocio: la urgencia, las alertas, la agenda y las plantillas salen de `frontend/src/lib`
(ver `metro.config.js` y `src/lib/compartido.js`), así el celular y la compu deciden lo mismo.

Tiene toda la funcionalidad de la web menos Estadísticas y Reportes, que quedan en la web.

## Pantallas

- `src/app/login.js`: ingreso con email y contraseña.
- `src/app/(tabs)/`: pestañas **Mis leads** (`index.js`), **Alertas** (`alertas.js`), **Agenda** (`agenda.js`) y **Más** (`mas.js`).
- `src/app/lead/[id].js`: tarjeta del contacto (contactar con plantillas, interés, seguimiento, recordatorios, emails, historial, cierre, reclamar, charlas).
- `src/app/archivo.js`, `src/app/cerrados/[tipo].js`: Archivo, Casos exitosos y Cerrados perdidos.
- `src/app/charlas.js`, `src/app/charla/[id].js`: charlas, invitados y asistencia.
- `src/app/panel.js`, `src/app/panel/[id].js`: Panel del equipo y detalle de cada asesor (líder).
- `src/app/configuracion.js`, `src/app/plantillas.js`, `src/app/perfil.js`: configuración, plantillas y perfil (foto, nombre, contraseña, tema y preferencias).

Componentes en `src/components` y sesión, API y tema en `src/lib`.

## Instalación y uso en la compu

**Requisitos:** Node.js 22 y, para probar, un celular con **Expo Go** (versión para el SDK 58) o el
emulador de Android Studio.

1. Copiar `.env.example` como `.env` y completar:

   | Variable | Qué es |
   |---|---|
   | `EXPO_PUBLIC_SUPABASE_URL` | URL del proyecto de Supabase (la misma que la web) |
   | `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Clave **anon public** de Supabase (la misma que la web) |
   | `EXPO_PUBLIC_API_URL` | Dirección del backend publicado. Para usar el de la compu desde el emulador de Android: `http://10.0.2.2:3000` |

2. Instalar y arrancar:

   ```bash
   cd mobile
   npm install
   npx expo start
   ```

3. Abrirla:
   - **En el celular:** escanear el QR con Expo Go (Android) o con la cámara (iPhone).
   - **En el emulador de Android Studio:** prender un emulador (Device Manager) y apretar `a`.
   - **En el navegador:** apretar `w` y achicar la ventana al tamaño de un celular.

## Generar el APK (Android)

Se arma en la nube con **EAS Build** (no hace falta Android Studio). La configuración está en `eas.json`.

1. Crear una cuenta en expo.dev e instalar la herramienta: `npm install -g eas-cli`, después `eas login`.
2. En esta carpeta, la primera vez: `eas init` (vincula la app con la cuenta).
3. Cargar las tres variables de arriba en EAS (no lee el `.env`):

   ```bash
   eas env:create --environment preview --name EXPO_PUBLIC_SUPABASE_URL --value "<url>" --visibility plaintext
   eas env:create --environment preview --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "<clave anon>" --visibility plaintext
   eas env:create --environment preview --name EXPO_PUBLIC_API_URL --value "<dirección del backend>" --visibility plaintext
   ```

4. Generarlo: `eas build -p android --profile preview`. Al terminar (10 a 20 minutos) da un link y un
   QR para descargar el APK; también queda en expo.dev → Builds. Se instala abriéndolo desde el celular
   Android (permitiendo instalar desde ese origen).

El APK es solo para Android. En iPhone se usa Expo Go.

## Prototipo

**https://trackly-six-delta.vercel.app/prototipo-mobile**: la app real con los datos de ejemplo del
prototipo web (el equipo Instituto Horizonte), sin Supabase ni backend. En la compu se ve dentro de un
marco de teléfono y en un celular, a pantalla completa. Se entra con `lider@demo.trackly`,
`martin@demo.trackly`, `lucia@demo.trackly` o `diego@demo.trackly` (cualquier contraseña), o con la
barra "ver como". Los cambios duran mientras la pestaña está abierta.

Para verlo en la compu sin internet: `npm run dev` en `frontend` y abrir `http://localhost:5173/prototipo-mobile/`.

Se genera con `npm run prototipo` (en esta carpeta): exporta la versión web de la app en modo
prototipo (en `metro.config.js`, `src/lib/supabase.js` y `src/lib/api.js` se cambian por los de
`frontend/src/demo`) y la copia a `frontend/public/prototipo-mobile`, que Vercel publica con la web.
No funciona abriendo el archivo con doble clic porque la app navega cambiando la dirección.

## Chequeos

- `npm run formato` / `npm run formato:revisar`: Prettier.
- `npm run compilar`: compila la versión web para detectar errores (lo corre GitHub en cada push).

## Pendiente

Notificaciones push, ingreso con Google, importar desde Excel y cierre de sesión por inactividad.
