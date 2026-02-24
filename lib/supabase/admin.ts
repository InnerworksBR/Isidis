import { createClient } from '@supabase/supabase-js'

/**
 * Supabase client created with the service role key.
 * This client bypasses Row Level Security (RLS) and should only be used in server-side context.
 */
export const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
)
