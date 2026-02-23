
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

    async function checkSchema() {
        const supabase = createClient(
            env.NEXT_PUBLIC_SUPABASE_URL,
            env.SUPABASE_SERVICE_ROLE_KEY
        );

        console.log('--- Checking profiles table ---');
        const { data: selectData, error: selectError } = await supabase
            .from('profiles')
            .select('*')
            .limit(1);

        if (selectError) {
            console.error('Error with select *:', selectError.message);
        } else {
            console.log('Available columns in profiles:', Object.keys(selectData[0] || {}));
        }

        console.log('\n--- Checking roles ---');
        const { data: roleData, error: roleError } = await supabase
            .from('profiles')
            .select('role')
            .limit(50);

        if (roleError) {
            console.error('Error fetching roles:', roleError.message);
        } else {
            const roles = [...new Set(roleData.map(r => r.role))];
            console.log('Existing roles in DB:', roles);
        }

        console.log('\n--- Checking triggers (all) ---');
        // Using a trick: Supabase might block direct access to pg_trigger via standard client, 
        // but sometimes you can access public tables that list triggers if set up.
        // If not, we try to infer from a common RPC if it exists.
        const { data: triggers, error: triggerError } = await supabase
            .from('pg_trigger')
            .select('tgname')
            .limit(10);

        if (triggerError) {
            console.log('Direct trigger query failed:', triggerError.message);
        } else {
            console.log('Triggers found:', triggers.map(t => t.tgname));
        }
    }

    checkSchema();
} catch (err) {
    console.error('Script Error:', err);
}
