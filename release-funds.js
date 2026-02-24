
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

    async function releaseFunds() {
        const supabase = createClient(
            env.NEXT_PUBLIC_SUPABASE_URL,
            env.SUPABASE_SERVICE_ROLE_KEY
        );

        const userId = 'dc09821f-708d-4fb9-9ff3-3a89948c970a';

        console.log(`--- Releasing Funds for User ${userId} ---`);

        // 1. Update orders from DELIVERED to COMPLETED
        const { data: updatedOrders, error: orderError } = await supabase
            .from('orders')
            .update({ status: 'COMPLETED' })
            .eq('reader_id', userId)
            .eq('status', 'DELIVERED')
            .select('id');

        if (orderError) {
            console.error('Error updating orders:', orderError.message);
            return;
        }

        console.log(`Success: Updated ${updatedOrders?.length || 0} orders to COMPLETED.`);
        if (updatedOrders) {
            updatedOrders.forEach(o => console.log(`- Order ${o.id} completed.`));
        }

        // 2. Verify and log current wallet balance/transactions
        const { data: wallet } = await supabase.from('wallets').select('*').eq('user_id', userId).single();
        if (wallet) {
            const { data: txs } = await supabase.from('transactions').select('*').eq('wallet_id', wallet.id);
            console.log('\n--- Final Transaction Status ---');
            txs.forEach(t => {
                console.log(`${t.id} | ${t.type} | ${t.amount} | ${t.status} | Order: ${t.order_id}`);
            });
        }
    }

    releaseFunds();
} catch (err) { console.error(err); }
