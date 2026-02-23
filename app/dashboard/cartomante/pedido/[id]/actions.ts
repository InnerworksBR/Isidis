'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { sendReadingDelivered } from '@/lib/email'
import { getUserEmail } from '@/lib/supabase/get-user-email'

export interface ReadingCard {
    cardId: number
    name: string
    numeral: string
    position: string
    interpretation: string
    audioBase64: string | null
    image?: string
}

export interface ReadingContent {
    spreadName: string
    cards: ReadingCard[]
}

export async function saveDraft(orderId: string, content: ReadingContent) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Não autenticado.' }

    const { error } = await supabase
        .from('orders')
        .update({ delivery_content: content })
        .eq('id', orderId)
        .eq('reader_id', user.id)

    if (error) {
        console.error('[Reading] Save draft failed:', error.message)
        return { error: 'Erro ao salvar rascunho.' }
    }

    revalidatePath('/dashboard/cartomante')
    return { success: true }
}

export async function sendReading(orderId: string, content: ReadingContent) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Não autenticado.' }

    if (!content.cards || content.cards.length === 0) {
        return { error: 'Adicione pelo menos uma carta à leitura.' }
    }

    const hasInterpretation = content.cards.some(c => c.interpretation.trim() || c.audioBase64)
    if (!hasInterpretation) {
        return { error: 'Adicione pelo menos uma interpretação (texto ou áudio).' }
    }

    // Buscar dados do pedido ANTES de atualizar
    const { data: order } = await supabase
        .from('orders')
        .select(`
            id, client_id,
            gigs(title),
            reader:profiles!orders_reader_id_fkey(full_name),
            client:profiles!orders_client_id_fkey(full_name)
        `)
        .eq('id', orderId)
        .eq('reader_id', user.id)
        .single()

    const { error } = await supabase
        .from('orders')
        .update({
            delivery_content: content,
            status: 'DELIVERED',
        })
        .eq('id', orderId)
        .eq('reader_id', user.id)

    if (error) {
        console.error('[Reading] Send failed:', error.message)
        return { error: 'Erro ao enviar leitura.' }
    }

    // ── Disparar email para o cliente ─────────────────────────────────────────
    try {
        if (order?.client_id) {
            const clientEmail = await getUserEmail(order.client_id)
            const client = order.client as any
            const gig = order.gigs as any
            const reader = order.reader as any

            if (clientEmail) {
                await sendReadingDelivered({
                    clientEmail,
                    clientName: client?.full_name || 'Cliente',
                    orderId,
                    gigTitle: gig?.title || 'Leitura de Tarot',
                    readerName: reader?.full_name || 'Sua cartomante',
                })
                console.log('[Reading] Email de entrega enviado para', clientEmail)
            }
        }
    } catch (emailErr) {
        console.error('[Reading] Falha ao enviar email de entrega:', emailErr)
    }

    revalidatePath('/dashboard/cartomante')
    return { success: true }
}

export async function getOrder(orderId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: order } = await supabase
        .from('orders')
        .select('*, gigs(title), profiles!orders_client_id_fkey(full_name)')
        .eq('id', orderId)
        .eq('reader_id', user.id)
        .single()

    return order
}

// ─── Physical Reading Mode ────────────────────────────────────────────

export interface SpreadSection {
    id: string
    title: string
    photoUrl: string | null
    audioUrl: string | null
    interpretation: string
}

export interface PhysicalReadingContent {
    mode: 'physical'
    readingTitle: string
    sections: SpreadSection[]
}

export async function savePhysicalDraft(orderId: string, content: PhysicalReadingContent) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Não autenticado.' }

    const { error } = await supabase
        .from('orders')
        .update({ delivery_content: content })
        .eq('id', orderId)
        .eq('reader_id', user.id)

    if (error) {
        console.error('[Physical Reading] Save draft failed:', error.message)
        return { error: 'Erro ao salvar rascunho.' }
    }

    revalidatePath('/dashboard/cartomante')
    return { success: true }
}

export async function sendPhysicalReading(orderId: string, content: PhysicalReadingContent) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Não autenticado.' }

    if (!content.sections || content.sections.length === 0) {
        return { error: 'Adicione pelo menos uma tiragem.' }
    }

    const hasContent = content.sections.some(
        s => (s.photoUrl || s.interpretation.trim() || s.audioUrl)
    )
    if (!hasContent) {
        return { error: 'Adicione pelo menos uma foto, áudio ou interpretação.' }
    }

    // Buscar dados do pedido ANTES de atualizar
    const { data: order } = await supabase
        .from('orders')
        .select(`
            id, client_id,
            gigs(title),
            reader:profiles!orders_reader_id_fkey(full_name),
            client:profiles!orders_client_id_fkey(full_name)
        `)
        .eq('id', orderId)
        .eq('reader_id', user.id)
        .single()

    const { error } = await supabase
        .from('orders')
        .update({
            delivery_content: content,
            status: 'DELIVERED',
        })
        .eq('id', orderId)
        .eq('reader_id', user.id)

    if (error) {
        console.error('[Physical Reading] Send failed:', error.message)
        return { error: 'Erro ao enviar leitura.' }
    }

    // ── Disparar email para o cliente ─────────────────────────────────────────
    try {
        if (order?.client_id) {
            const clientEmail = await getUserEmail(order.client_id)
            const client = order.client as any
            const gig = order.gigs as any
            const reader = order.reader as any

            if (clientEmail) {
                await sendReadingDelivered({
                    clientEmail,
                    clientName: client?.full_name || 'Cliente',
                    orderId,
                    gigTitle: gig?.title || 'Leitura de Tarot',
                    readerName: reader?.full_name || 'Sua cartomante',
                })
                console.log('[Physical Reading] Email de entrega enviado para', clientEmail)
            }
        }
    } catch (emailErr) {
        console.error('[Physical Reading] Falha ao enviar email de entrega:', emailErr)
    }

    revalidatePath('/dashboard/cartomante')
    return { success: true }
}
