const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Faltan las variables SUPABASE_URL o SUPABASE_ANON_KEY en el .env');
}

// Cliente "básico" — lo vamos a usar más adelante para crear
// un cliente distinto por cada request, con el token del usuario logueado
function crearClienteConToken(token) {
    return createClient(supabaseUrl, supabaseAnonKey, {
        global: {
            headers: { Authorization: `Bearer ${token}` }
        }
    });
}

module.exports = { crearClienteConToken };