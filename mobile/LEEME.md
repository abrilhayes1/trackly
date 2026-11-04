# Trackly mobile

App para Android hecha con React Native + Expo (RF41 a RF44). Usa el mismo servidor (Railway) y la
misma base (Supabase) que la web, y la misma lógica: los grupos de urgencia, las alertas y las
etiquetas salen de `frontend/src/lib` (ver `metro.config.js` y `src/lib/compartido.js`).

## Pantallas

- `src/app/login.js`: ingreso con email y contraseña.
- `src/app/(tabs)/index.js`: Mis leads (contadores, recordatorios de hoy, leads por urgencia, buscador).
- `src/app/(tabs)/alertas.js`: Alertas de hoy (vencen hoy, por vencer, recordatorios).
- `src/app/(tabs)/perfil.js`: Perfil y cerrar sesión.
- `src/app/lead/[id].js`: tarjeta del lead (contactar, interés, seguimiento, historial).

## Levantarla en la compu (con el emulador de Android Studio)

1. Copiá `.env.example` como `.env` y completá `EXPO_PUBLIC_SUPABASE_ANON_KEY` (la misma clave que
   `VITE_SUPABASE_ANON_KEY` de `frontend/.env`).
2. En Android Studio: Device Manager → prendé un emulador.
3. En esta carpeta:
   ```powershell
   npm install
   npx expo start
   ```
   y apretá `a` para abrirla en el emulador.

También se puede abrir en un celular con la app **Expo Go** escaneando el QR (tiene que ser la versión
de Expo Go para el SDK 58).

Para usar el servidor de tu compu en vez del publicado, en `.env` poné
`EXPO_PUBLIC_API_URL=http://10.0.2.2:3000` (10.0.2.2 es "la compu" vista desde el emulador).

## Chequeos

- `npm run formato` / `npm run formato:revisar`
- `npm run compilar`: compila la versión web para detectar errores (lo corre GitHub en cada push).
