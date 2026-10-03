const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, async (req, res) => {
    const { data, error } = await req.supabase
        .from('tenant_config')
        .select('*')
        .maybeSingle();

    if (error) {
        return res.status(400).json({ error: error.message });
    }

    res.json(data);
});

module.exports = router;