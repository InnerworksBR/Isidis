'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createClient as createClientJs } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'

// Helper to get admin client
const getAdminClient = () => {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
        throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
    }
    return createClientJs(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceRoleKey,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    )
}

export async function approveReader(readerId: string) {
    const supabase = await createClient()

    // 1. Check if user is admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data: adminProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (adminProfile?.role !== 'ADMIN') {
        throw new Error('Unauthorized')
    }

    // 2. Update status using Service Role (Bypass RLS)
    const supabaseAdmin = getAdminClient()
    const { error } = await supabaseAdmin
        .from('profiles')
        .update({ verification_status: 'APPROVED' })
        .eq('id', readerId)

    if (error) {
        console.error('Error approving reader:', error)
        throw new Error('Failed to approve reader')
    }

    revalidatePath('/admin/approvals')
    revalidatePath(`/admin/approvals/${readerId}`)
    redirect('/admin/approvals')
}

export async function rejectReader(readerId: string) {
    const supabase = await createClient()

    // 1. Check if user is admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data: adminProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (adminProfile?.role !== 'ADMIN') {
        throw new Error('Unauthorized')
    }

    // 2. Update status using Service Role (Bypass RLS)
    const supabaseAdmin = getAdminClient()
    const { error } = await supabaseAdmin
        .from('profiles')
        .update({ verification_status: 'REJECTED' })
        .eq('id', readerId)

    if (error) {
        console.error('Error rejecting reader:', error)
        throw new Error('Failed to reject reader')
    }

    revalidatePath('/admin/approvals')
    revalidatePath(`/admin/approvals/${readerId}`)
    redirect('/admin/approvals')
}
