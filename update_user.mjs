import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://sjwgovfexzqkhdsfcsyb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqd2dvdmZleHpxa2hkc2Zjc3liIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTE2NzcxNCwiZXhwIjoyMDg2NzQzNzE0fQ.HHPzHdK-UIZa8lOajqd5kusY8Bevg0kv5QkzFa5N_HE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const { data, error } = await supabase
        .from('profiles')
        .update({ tax_id: '40531655806', cellphone: '13991045249' })
        .eq('id', '23beaa98-035f-4e7c-aa7e-297334aaee17');

    if (error) {
        console.error('Error updating profile:', error);
    } else {
        console.log('Profile updated successfully:', data);
    }
}

main();
