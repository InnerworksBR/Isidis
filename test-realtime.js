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

    async function testRealtime() {
        const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

        console.log("Subscribing to realtime on notifications...");
        const channel = supabase.channel('test_realtime')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
                console.log("RECEIVED REALTIME EVENT!", payload);
                process.exit(0);
            })
            .subscribe(async (status) => {
                console.log("Subscription status:", status);
                if (status === 'SUBSCRIBED') {
                    console.log("Inserting a test notification...");
                    // Try to find a user first
                    const { data: users } = await supabase.from('profiles').select('id').limit(1);
                    if (users && users.length > 0) {
                        const { error } = await supabase.from('notifications').insert({
                            user_id: users[0].id,
                            type: 'SYSTEM',
                            title: 'TEST REALTIME',
                            message: 'This is a test',
                            read: false
                        });
                        if (error) {
                            console.error("Insert error:", error);
                            process.exit(1);
                        } else {
                            console.log("Insert successful, waiting for realtime event...");
                            setTimeout(() => {
                                console.log("Timeout waiting for event. Realtime might not be enabled for this table.");
                                process.exit(1);
                            }, 5000);
                        }
                    } else {
                        console.log("No users found to attach notification.");
                        process.exit(1);
                    }
                }
            });
    }

    testRealtime();
} catch (err) {
    console.error(err);
}
