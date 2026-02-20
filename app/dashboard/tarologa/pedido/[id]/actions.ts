'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

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

    revalidatePath('/dashboard/tarologa')
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

    revalidatePath('/dashboard/tarologa')
    return { success: true }
}

export async function getOrder(orderId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: order } = await supabase
        .from('orders')
        .select('*, gigs(title), profiles!orders_client_id_fkey(full_name, email)')
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

    revalidatePath('/dashboard/tarologa')
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

    revalidatePath('/dashboard/tarologa')
    return { success: true }
}

