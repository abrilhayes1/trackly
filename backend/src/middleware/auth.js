const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Falta el token de autenticación' });
  }

  const token = authHeader.split(' ')[1];

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }

  // le dejamos al resto de la ruta el cliente ya autenticado y el usuario
  req.supabase = supabase;
  req.user = user;
  next();
}

module.exports = { requireAuth };