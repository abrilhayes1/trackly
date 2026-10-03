const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function main() {
    const { data, error } = await supabase.auth.signInWithPassword({
        email: 'lider@davinci.test',
        password: 'Test1234!'
    });

    if (error) {
        console.error('Error al loguear:', error.message);
        return;
    }

    console.log('Login OK. Token:');
    console.log(data.session.access_token);
}

main();