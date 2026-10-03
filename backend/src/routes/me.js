const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, async (req, res) => {
  const { data, error } = await req.supabase
    .from('profiles')
    .select('nombre, rol, avatar_iniciales, tenants(nombre)')
    .eq('id', req.user.id)
    .maybeSingle();

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  // devuelve null si el usuario todavía no completó el onboarding
  res.json(data);
});

module.exports = router;