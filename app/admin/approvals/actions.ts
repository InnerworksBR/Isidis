'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createClient as createClientJs } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { sendReaderApproved, sendReaderRejected } from '@/lib/email'
import { getUserEmail } from '@/lib/supabase/get-user-email'

const getAdminClient = () => {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
    return createClientJs(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceRoleKey,
        { auth: { autoRefreshToken: false, persistSession: false } }
    )
}

export async function approveReader(readerId: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data: adminProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (adminProfile?.role !== 'ADMIN') throw new Error('Unauthorized')

    // Buscar nome antes de atualizar
    const { data: readerProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', readerId)
        .single()

    const supabaseAdmin = getAdminClient()
    const { error } = await supabaseAdmin
        .from('profiles')
        .update({ verification_status: 'APPROVED' })
        .eq('id', readerId)

    if (error) {
        console.error('Error approving reader:', error)
        throw new Error('Failed to approve reader')
    }

    // ── Email ────────────────────────────────────────────────────────────────
    try {
        const readerEmail = await getUserEmail(readerId)
        if (readerEmail) {
            await sendReaderApproved({
                readerEmail,
                readerName: readerProfile?.full_name || 'Cartomante',
            })
            console.log('[Admin] Email de aprovação enviado para', readerEmail)
        }
    } catch (emailErr) {
        console.error('[Admin] Falha ao enviar email de aprovação:', emailErr)
    }

    revalidatePath('/admin/approvals')
    revalidatePath(`/admin/approvals/${readerId}`)
    redirect('/admin/approvals')
}

export async function rejectReader(readerId: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data: adminProfile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (adminProfile?.role !== 'ADMIN') throw new Error('Unauthorized')

    // Buscar nome antes de atualizar
    const { data: readerProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', readerId)
        .single()

    const supabaseAdmin = getAdminClient()
    const { error } = await supabaseAdmin
        .from('profiles')
        .update({ verification_status: 'REJECTED' })
        .eq('id', readerId)

    if (error) {
        console.error('Error rejecting reader:', error)
        throw new Error('Failed to reject reader')
    }

    // ── Email ────────────────────────────────────────────────────────────────
    try {
        const readerEmail = await getUserEmail(readerId)
        if (readerEmail) {
            await sendReaderRejected({
                readerEmail,
                readerName: readerProfile?.full_name || 'Cartomante',
            })
            console.log('[Admin] Email de rejeição enviado para', readerEmail)
        }
    } catch (emailErr) {
        console.error('[Admin] Falha ao enviar email de rejeição:', emailErr)
    }

    revalidatePath('/admin/approvals')
    revalidatePath(`/admin/approvals/${readerId}`)
    redirect('/admin/approvals')
}
