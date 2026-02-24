
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

    async function debugOrders() {
        const supabase = createClient(
            env.NEXT_PUBLIC_SUPABASE_URL,
            env.SUPABASE_SERVICE_ROLE_KEY
        );

        const { data: orders, error } = await supabase.from('orders').select('id, amount_total, status, created_at');
        if (error) { console.error(error); return; }

        const summary = orders.reduce((acc, o) => {
            acc[o.status] = acc[o.status] || { count: 0, sum: 0 };
            acc[o.status].count++;
            acc[o.status].sum += o.amount_total;
            return acc;
        }, {});

        console.log('--- Summary by Status ---');
        console.table(summary);

        const targetStatuses = ['PAID', 'DELIVERED', 'COMPLETED'];
        console.log('\n--- Orders in Target Statuses ---');
        orders.filter(o => targetStatuses.includes(o.status)).forEach(o => {
            console.log(`${o.id} | ${o.status} | ${o.amount_total} | ${o.created_at}`);
        });

        const rpcRes = await supabase.rpc('get_admin_financial_stats');
        console.log('\n--- RPC Result ---');
        console.log(rpcRes.data);
    }

    debugOrders();
} catch (err) { console.error(err); }
