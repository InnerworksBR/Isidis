'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function toggleFavoriteOrder(orderId: string, isFavorite: boolean) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new Error('Unauthorized')
    }

    try {
        const { error } = await supabase
            .from('orders')
            .update({ is_favorite: isFavorite })
            .eq('id', orderId)
            .or(`client_id.eq.${user.id},reader_id.eq.${user.id}`)

        if (error) {
            console.error('Error toggling favorite:', error)
            throw new Error('Failed to update favorite status')
        }

        revalidatePath('/dashboard/minhas-tiragens')
        return { success: true }
    } catch (err) {
        console.error('Error in toggleFavoriteOrder:', err)
        return { success: false, error: 'Internal Server Error' }
    }
}
