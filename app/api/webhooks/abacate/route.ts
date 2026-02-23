import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
    sendOrderPaidToReader,
    sendOrderPaidToClient,
} from '@/lib/email'
import { getUserEmail } from '@/lib/supabase/get-user-email'

interface AbacateWebhookPayload {
    event: string
    data: {
        id: string
        status: string
        metadata?: {
            order_id?: string
        }
        [key: string]: any
    }
}

export async function POST(request: Request) {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.error('CRITICAL: SUPABASE_SERVICE_ROLE_KEY is not set.')
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    const secret = request.headers.get('x-webhook-secret')
    const expectedSecret = process.env.ABACATE_WEBHOOK_SECRET

    if (expectedSecret && secret !== expectedSecret) {
        console.error('Webhook: Secret inválido')
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const payload: AbacateWebhookPayload = await request.json()
        console.log('Webhook recebido:', payload.event, payload.data?.id)

        if (payload.event === 'billing.paid' || payload.data?.status === 'PAID') {
            const billingId = payload.data.id

            // Buscar order com dados de perfil (sem tentar buscar email de profiles)
            const { data: order, error: findError } = await supabaseAdmin
                .from('orders')
                .select(`
                    id, reader_id, client_id, amount_reader_net, status,
                    gigs(title),
                    reader:profiles!orders_reader_id_fkey(full_name),
                    client:profiles!orders_client_id_fkey(full_name)
                `)
                .eq('asaas_payment_id', billingId)
                .single()

            if (findError || !order) {
                console.warn('Webhook: Pedido não encontrado para billing:', billingId)
                return NextResponse.json({ received: true, warning: 'Order not found' })
            }

            if (order.status === 'PAID' || order.status === 'DELIVERED' || order.status === 'COMPLETED') {
                return NextResponse.json({ received: true, info: 'Already processed' })
            }

            // Atualizar status para PAID
            const { error: updateError } = await supabaseAdmin
                .from('orders')
                .update({ status: 'PAID' })
                .eq('id', order.id)

            if (updateError) {
                console.error('Webhook: Erro ao atualizar pedido:', updateError)
                return NextResponse.json({ error: 'DB update failed' }, { status: 500 })
            }

            // Criar wallet e transação para a cartomante
            const { data: existingWallet } = await supabaseAdmin
                .from('wallets')
                .select('id')
                .eq('user_id', order.reader_id)
                .single()

            let walletId = existingWallet?.id

            if (!walletId) {
                const { data: newWallet } = await supabaseAdmin
                    .from('wallets')
                    .insert({ user_id: order.reader_id })
                    .select('id')
                    .single()
                walletId = newWallet?.id
            }

            if (walletId) {
                await supabaseAdmin
                    .from('transactions')
                    .insert({
                        wallet_id: walletId,
                        amount: order.amount_reader_net,
                        type: 'SALE_CREDIT',
                        status: 'PENDING',
                        order_id: order.id,
                    })
            }

            console.log('Webhook: Pedido', order.id, 'atualizado para PAID')

            // ── Disparar emails usando auth.users para buscar emails ───────────────
            try {
                const [readerEmail, clientEmail] = await Promise.all([
                    getUserEmail(order.reader_id),
                    getUserEmail(order.client_id),
                ])

                const reader = order.reader as any
                const client = order.client as any
                const gig = order.gigs as any
                const gigTitle = gig?.title || 'Leitura de Tarot'

                console.log('Webhook: Emails encontrados — reader:', readerEmail, ' client:', clientEmail)

                await Promise.all([
                    readerEmail && sendOrderPaidToReader({
                        readerEmail,
                        readerName: reader?.full_name || 'Cartomante',
                        orderId: order.id,
                        gigTitle,
                        clientName: client?.full_name || 'Cliente',
                        amount: order.amount_reader_net,
                    }),
                    clientEmail && sendOrderPaidToClient({
                        clientEmail,
                        clientName: client?.full_name || 'Cliente',
                        orderId: order.id,
                        gigTitle,
                        readerName: reader?.full_name || 'Sua cartomante',
                    }),
                ])
                console.log('Webhook: Emails de confirmação enviados para pedido', order.id)
            } catch (emailErr) {
                console.error('Webhook: Falha ao enviar emails:', emailErr)
            }
        }

        return NextResponse.json({ received: true })
    } catch (error: any) {
        console.error('Webhook Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
