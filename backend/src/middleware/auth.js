const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Cliente solo para validar tokens. getClaims revisa la firma del token con la clave pública del
// proyecto (se descarga una vez y queda guardada 10 minutos), así no hay que preguntarle a Supabase
// en cada pedido. Si el proyecto usa la clave secreta vieja (HS256), getClaims le pregunta a
// Supabase como antes, así que funciona igual en los dos casos.
const verificador = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Falta el token de autenticación' });
  }

  const token = authHeader.split(' ')[1];

  const { data, error } = await verificador.auth.getClaims(token);
  const claims = data?.claims;

  // tiene que ser el token de un usuario que inició sesión (no la clave pública anónima)
  if (error || !claims?.sub || claims.role !== 'authenticated') {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }

  // el resto de la ruta usa un cliente con el token del usuario, así la base aplica sus reglas (RLS)
  req.supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  req.user = {
    id: claims.sub,
    email: claims.email,
    user_metadata: claims.user_metadata || {},
    app_metadata: claims.app_metadata || {},
  };
  next();
}

module.exports = { requireAuth };
