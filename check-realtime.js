const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

try {
    const envFile = fs.readFileSync('.env.local', 'utf8');
    const env = {};
    envFile.split('\n').forEach(line => {
        const parts = line.split('=');
        if (parts.length >= 2) {
            env[parts[0].trim()] = parts.slice(1).join('=').trim();
        }
    });

    async function checkRealtime() {
        const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseKey) {
            console.error("Missing URL or KEY");
            return;
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        console.log("Checking pg_publication_tables for supabase_realtime...");
        const { data, error } = await supabase.rpc('get_realtime_publications');

        // If RPC doesn't exist, try a straight query if possible, or just raw sql via a function.
        // We'll try querying pg_publication_tables directly first.
        const { data: pubData, error: pubError } = await supabase
            .from('pg_publication_tables')
            .select('*')
            .eq('pubname', 'supabase_realtime');

        if (pubError) {
            console.log("Could not read pg_publication_tables directly:", pubError.message);
        } else {
            console.log("Tables in supabase_realtime:", pubData);
        }
    }

    checkRealtime();
} catch (err) {
    console.error(err);
}
