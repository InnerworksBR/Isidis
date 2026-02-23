'use server'

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { sendReaderApproved, sendReaderRejected } from '@/lib/email'

export async function updateCartomanteStatus(userId: string, status: 'APPROVED' | 'REJECTED') {
    const supabase = await createClient()

    // Auth check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'ADMIN') throw new Error('Forbidden')

    // Buscar dados do cartomante antes de atualizar
    const { data: targetProfile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', userId)
        .single()

    // Update
    const { error } = await supabase
        .from('profiles')
        .update({ verification_status: status })
        .eq('id', userId)

    if (error) {
        console.error('Error updating cartomante status:', error)
        throw new Error('Failed to update status')
    }

    // ── Disparar email para o cartomante ──────────────────────────────────────
    try {
        if (targetProfile?.email) {
            if (status === 'APPROVED') {
                await sendReaderApproved({
                    readerEmail: targetProfile.email,
                    readerName: targetProfile.full_name || 'Cartomante',
                })
            } else if (status === 'REJECTED') {
                await sendReaderRejected({
                    readerEmail: targetProfile.email,
                    readerName: targetProfile.full_name || 'Cartomante',
                })
            }
        }
    } catch (emailErr) {
        console.error('[Admin] Falha ao enviar email de status do cartomante:', emailErr)
    }

    revalidatePath('/admin/cartomantes')
    revalidatePath('/admin/users')
}
