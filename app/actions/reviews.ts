'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function submitReview(formData: FormData) {
    const supabase = await createClient()

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Não autorizado' }

    // Parse form data
    const orderId = formData.get('order_id') as string
    const gigId = formData.get('gig_id') as string
    const readerId = formData.get('reader_id') as string
    const rating = parseInt(formData.get('rating') as string)
    const comment = formData.get('comment') as string

    // Validate inputs
    if (!rating || rating < 1 || rating > 5) {
        return { error: 'Avaliação inválida' }
    }

    // Security check: Ensure order belongs to user and is completed
    const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('id, status')
        .eq('id', orderId)
        .eq('client_id', user.id)
        .in('status', ['DELIVERED', 'COMPLETED']) // Must be delivered or completed
        .single()

    if (orderError || !order) {
        return { error: 'Pedido não encontrado ou não elegível para avaliação' }
    }

    // Insert review
    const { error: insertError } = await supabase
        .from('reviews')
        .insert({
            order_id: orderId,
            gig_id: gigId,
            reader_id: readerId,
            client_id: user.id,
            rating,
            comment
        })

    if (insertError) {
        // Check for unique constraint (already reviewed)
        if (insertError.code === '23505') {
            return { error: 'Você já avaliou este pedido' }
        }
        return { error: 'Falha ao enviar avaliação: ' + insertError.message }
    }

    revalidatePath(`/tarologa/${readerId}`)
    revalidatePath('/dashboard')

    return { success: true }
}
