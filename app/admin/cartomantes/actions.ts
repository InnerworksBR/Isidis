'use server'

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function updateCartomanteStatus(userId: string, status: 'APPROVED' | 'REJECTED') {
    const supabase = await createClient()

    // Auth check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'ADMIN') throw new Error('Forbidden')

    // Update
    const { error } = await supabase
        .from('profiles')
        .update({ verification_status: status })
        .eq('id', userId)

    if (error) {
        console.error('Error updating cartomante status:', error)
        throw new Error('Failed to update status')
    }

    revalidatePath('/admin/cartomantes')
    revalidatePath('/admin/users')
}
