'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { sendGigApproved, sendGigRejected } from '@/lib/email'

export async function updateGigStatus(gigId: string, status: 'APPROVED' | 'REJECTED') {
    const supabase = await createClient()

    // Auth check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'ADMIN') throw new Error('Forbidden')

    // Buscar dados do gig e do dono antes de atualizar
    const { data: gig } = await supabase
        .from('gigs')
        .select('title, owner_id, profiles!gigs_owner_id_fkey(full_name, email)')
        .eq('id', gigId)
        .single()

    // Update
    const { error } = await supabase
        .from('gigs')
        .update({ status })
        .eq('id', gigId)

    if (error) {
        console.error('Error updating gig status:', error)
        throw new Error('Failed to update status')
    }

    // ── Disparar email para a cartomante ──────────────────────────────────────
    try {
        const reader = gig?.profiles as any
        if (gig && reader?.email) {
            if (status === 'APPROVED') {
                await sendGigApproved({
                    readerEmail: reader.email,
                    readerName: reader.full_name || 'Cartomante',
                    gigTitle: gig.title,
                    gigId,
                })
            } else if (status === 'REJECTED') {
                await sendGigRejected({
                    readerEmail: reader.email,
                    readerName: reader.full_name || 'Cartomante',
                    gigTitle: gig.title,
                })
            }
        }
    } catch (emailErr) {
        console.error('[Admin] Falha ao enviar email de status do gig:', emailErr)
    }

    revalidatePath('/admin/gigs')
    revalidatePath('/dashboard/cartomante/gigs')
    revalidatePath('/')
}
