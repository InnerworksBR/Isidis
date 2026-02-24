
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

    async function checkUserFunds() {
        const supabase = createClient(
            env.NEXT_PUBLIC_SUPABASE_URL,
            env.SUPABASE_SERVICE_ROLE_KEY
        );

        const userId = 'dc09821f-708d-4fb9-9ff3-3a89948c970a';
        const { data: wallet } = await supabase.from('wallets').select('*').eq('user_id', userId).single();

        if (wallet) {
            console.log(`Wallet ID: ${wallet.id}`);
            const { data: txs } = await supabase.from('transactions').select('*').eq('wallet_id', wallet.id);
            console.log('--- Transactions ---');
            txs.forEach(t => {
                console.log(`${t.id} | ${t.type} | ${t.amount} | ${t.status} | Order: ${t.order_id}`);
            });
        }
    }

    checkUserFunds();
} catch (err) { console.error(err); }
