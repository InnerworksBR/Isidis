import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'



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
    // Usamos service role key aqui para bypass RLS — webhooks não têm contexto de usuário
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.error('CRITICAL: SUPABASE_SERVICE_ROLE_KEY is not set. Webhook will not function correctly.')
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    // Verificar secret do webhook
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

            // Buscar order pelo asaas_payment_id (que armazena o billing id do Abacate)
            const { data: order, error: findError } = await supabaseAdmin
                .from('orders')
                .select('id, reader_id, amount_reader_net, status')
                .eq('asaas_payment_id', billingId)
                .single()

            if (findError || !order) {
                console.warn('Webhook: Pedido não encontrado para billing:', billingId)
                // Retornar 200 mesmo assim para evitar retries infinitos
                return NextResponse.json({ received: true, warning: 'Order not found' })
            }

            // Evitar processamento duplicado
            if (order.status === 'PAID' || order.status === 'DELIVERED' || order.status === 'COMPLETED') {
                return NextResponse.json({ received: true, info: 'Already processed' })
            }

            // Atualizar status do pedido para PAID
            const { error: updateError } = await supabaseAdmin
                .from('orders')
                .update({ status: 'PAID' })
                .eq('id', order.id)

            if (updateError) {
                console.error('Webhook: Erro ao atualizar pedido:', updateError)
                return NextResponse.json({ error: 'DB update failed' }, { status: 500 })
            }

            // Criar wallet para a taróloga se não existir
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

            // Criar transação de crédito para a taróloga
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
        }

        return NextResponse.json({ received: true })
    } catch (error: any) {
        console.error('Webhook Error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
