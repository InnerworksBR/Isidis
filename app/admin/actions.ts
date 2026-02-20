'use server'

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function updateGigStatus(gigId: string, status: 'APPROVED' | 'REJECTED') {
    const supabase = await createClient()

    // Auth check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Unauthorized')

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'ADMIN') throw new Error('Forbidden')

    // Update
    const { error } = await supabase
        .from('gigs')
        .update({ status })
        .eq('id', gigId)

    if (error) {
        console.error('Error updating gig status:', error)
        throw new Error('Failed to update status')
    }

    revalidatePath('/admin/gigs')
    revalidatePath('/dashboard/tarologa/gigs') // Update reader dashboard
    revalidatePath('/') // Update public marketplace
}
