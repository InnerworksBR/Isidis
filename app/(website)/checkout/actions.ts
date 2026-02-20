'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createBilling } from '@/services/abacate'

const PLATFORM_FEE_PERCENT = 15

import { GigAddOn } from '@/types'

export async function createCheckoutSession(gigId: string, selectedAddOnIds: string[] = []) {
    const supabase = await createClient()

    // 1. Verify authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect('/login?next=/checkout/' + gigId)
    }

    // 2. Fetch gig from database
    const { data: gig, error: gigError } = await supabase
        .from('gigs')
        .select('id, title, price, owner_id, add_ons')
        .eq('id', gigId)
        .single()

    if (gigError || !gig) {
        console.error('[Checkout] Gig not found:', gigId, gigError?.message)
        return { error: 'Serviço não encontrado.' }
    }

    // Prevent buyer from purchasing their own gig
    if (gig.owner_id === user.id) {
        return { error: 'Você não pode comprar seu próprio serviço.' }
    }

    // 3. Fetch reader profile with limits
    const { data: reader } = await supabase
        .from('profiles')
        .select('full_name, max_orders_per_day, max_simultaneous_orders')
        .eq('id', gig.owner_id)
        .single()

    if (reader) {
        // Enforce Daily Limit
        if (reader.max_orders_per_day > 0) {
            const today = new Date()
            today.setHours(0, 0, 0, 0)

            const { count: dailyCount } = await supabase
                .from('orders')
                .select('*', { count: 'exact', head: true })
                .eq('reader_id', gig.owner_id)
                .gte('created_at', today.toISOString())
                .neq('status', 'CANCELED')

            if ((dailyCount || 0) >= reader.max_orders_per_day) {
                return { error: 'Esta taróloga já atingiu o limite de atendimentos para hoje. Tente novamente amanhã! ✨' }
            }
        }

        // Enforce Simultaneous Limit
        if (reader.max_simultaneous_orders > 0) {
            const { count: activeCount } = await supabase
                .from('orders')
                .select('*', { count: 'exact', head: true })
                .eq('reader_id', gig.owner_id)
                .in('status', ['PAID', 'DELIVERED']) // Only confirmed and in-progress

            if ((activeCount || 0) >= reader.max_simultaneous_orders) {
                return { error: 'A fila desta taróloga está cheia no momento. Aguarde uma vaga abrir! 🔮' }
            }
        }
    }

    // 4. Ensure buyer profile exists (upsert to fix FK constraint for old users)
    await supabase
        .from('profiles')
        .upsert({
            id: user.id,
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Cliente',
            role: user.user_metadata?.role || 'CLIENT',
        }, { onConflict: 'id', ignoreDuplicates: true })

    // 5. Fetch buyer profile (needed for Abacate Pay customer field)
    const { data: buyerProfile } = await supabase
        .from('profiles')
        .select('full_name, cellphone, tax_id')
        .eq('id', user.id)
        .single()

    // 6. Validate required customer fields for Abacate Pay
    if (!buyerProfile?.cellphone || !buyerProfile?.tax_id) {
        return {
            error: 'Complete seu perfil com CPF e celular antes de realizar o pagamento. Acesse Configurações para atualizar seus dados.',
            needsProfile: true
        }
    }

    let amountTotal = gig.price // in cents

    // Calculate add-ons total
    const selectedAddOns = (gig.add_ons || []).filter((addon: GigAddOn) => selectedAddOnIds.includes(addon.id))
    const addOnsTotal = selectedAddOns.reduce((sum: number, addon: GigAddOn) => sum + (addon.price * 100), 0)

    amountTotal += addOnsTotal
    const amountPlatformFee = Math.round(amountTotal * PLATFORM_FEE_PERCENT / 100)
    const amountReaderNet = amountTotal - amountPlatformFee

    const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    try {
        // 7. Create order in Supabase
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert({
                client_id: user.id,
                gig_id: gig.id,
                reader_id: gig.owner_id,
                status: 'PENDING_PAYMENT',
                amount_total: amountTotal,
                amount_platform_fee: amountPlatformFee,
                amount_reader_net: amountReaderNet,
                selected_addons: selectedAddOnIds,
            })
            .select('id')
            .single()

        if (orderError || !order) {
            console.error('[Checkout] Order creation failed:', orderError?.message)
            return { error: 'Erro ao criar pedido. Tente novamente.' }
        }

        // 8. Call Abacate Pay to create PIX billing
        const billingResponse = await createBilling({
            frequency: 'ONE_TIME',
            methods: ['PIX'],
            products: [
                {
                    externalId: order.id,
                    name: `Leitura com ${reader?.full_name || 'Taróloga'} — ${gig.title}`,
                    quantity: 1,
                    price: gig.price,
                },
                ...selectedAddOns.map((addon: GigAddOn) => ({
                    externalId: `${order.id}-${addon.id}`,
                    name: `Extra: ${addon.title}`,
                    quantity: 1,
                    price: Math.round(addon.price * 100)
                }))
            ],
            customer: {
                name: buyerProfile.full_name || 'Cliente',
                email: user.email!,
                cellphone: buyerProfile.cellphone,
                taxId: buyerProfile.tax_id,
            },
            returnUrl: `${siteUrl}/tarologa/${gig.owner_id}`,
            completionUrl: `${siteUrl}/checkout/success?order_id=${order.id}`,
        })

        if (!billingResponse.data) {
            console.error('[Checkout] Abacate Pay returned empty response')
            return { error: 'Erro na resposta do gateway de pagamento. Tente novamente.' }
        }

        const billing = billingResponse.data

        // 9. Save billing ID to order
        await supabase
            .from('orders')
            .update({ asaas_payment_id: billing.id })
            .eq('id', order.id)

        return {
            url: billing.url,
            orderId: order.id,
            pix: billing.pix
        }
    } catch (error: any) {
        console.error('[Checkout] Error:', error.message)
        return { error: error.message || 'Erro ao processar pagamento. Tente novamente.' }
    }
}

export async function saveOrderRequirements(orderId: string, answers: Record<string, string>) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Não autorizado' }

    // Verify ownership
    const { data: order } = await supabase
        .from('orders')
        .select('id, client_id')
        .eq('id', orderId)
        .single()

    if (!order || order.client_id !== user.id) {
        return { error: 'Pedido não encontrado ou acesso negado' }
    }

    const { error } = await supabase
        .from('orders')
        .update({ requirements_answers: answers })
        .eq('id', orderId)

    if (error) {
        console.error('Error saving requirements:', error)
        return { error: 'Erro ao salvar respostas' }
    }

    return { success: true }
}

export async function createPixPayment(gigId: string, selectedAddOnIds: string[] = []) {
    const supabase = await createClient()

    // 1. Verify authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        redirect('/login?next=/checkout/' + gigId)
    }

    // 2. Fetch gig from database
    const { data: gig, error: gigError } = await supabase
        .from('gigs')
        .select('id, title, price, owner_id, add_ons')
        .eq('id', gigId)
        .single()

    if (gigError || !gig) {
        console.error('[Checkout] Gig not found:', gigId, gigError?.message)
        return { error: 'Serviço não encontrado.' }
    }

    // Prevent buyer from purchasing their own gig
    if (gig.owner_id === user.id) {
        return { error: 'Você não pode comprar seu próprio serviço.' }
    }

    // 3. Fetch reader profile
    const { data: reader } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', gig.owner_id)
        .single()

    // 4. Fetch buyer profile
    const { data: buyerProfile } = await supabase
        .from('profiles')
        .select('full_name, cellphone, tax_id')
        .eq('id', user.id)
        .single()

    if (!buyerProfile?.cellphone || !buyerProfile?.tax_id) {
        return {
            error: 'Complete seu perfil com CPF e celular antes de realizar o pagamento.',
            needsProfile: true
        }
    }

    let amountTotal = gig.price // in cents
    const selectedAddOns = (gig.add_ons || []).filter((addon: GigAddOn) => selectedAddOnIds.includes(addon.id))
    const addOnsTotal = selectedAddOns.reduce((sum: number, addon: GigAddOn) => sum + Math.round(addon.price * 100), 0)

    amountTotal += addOnsTotal
    const amountPlatformFee = Math.round(amountTotal * PLATFORM_FEE_PERCENT / 100)
    const amountReaderNet = amountTotal - amountPlatformFee

    try {
        // 5. Create order in Supabase
        const { data: order, error: orderError } = await supabase
            .from('orders')
            .insert({
                client_id: user.id,
                gig_id: gig.id,
                reader_id: gig.owner_id,
                status: 'PENDING_PAYMENT',
                amount_total: amountTotal,
                amount_platform_fee: amountPlatformFee,
                amount_reader_net: amountReaderNet,
                selected_addons: selectedAddOnIds,
            })
            .select('id')
            .single()

        if (orderError || !order) {
            console.error('[Checkout] Order creation failed:', orderError?.message)
            return { error: 'Erro ao criar pedido.' }
        }

        // PIX description limit is roughly 35-40 chars. Abacate says 37.
        const cleanTitle = gig.title.substring(0, 20)
        const pixDescription = `Isidis: ${cleanTitle}`.substring(0, 37)

        // 6. Call Abacate Pay to create direct PIX
        const pixResponse = await import('@/services/abacate').then(m => m.createPixQrCode({
            amount: amountTotal,
            description: pixDescription,
            customer: {
                name: buyerProfile.full_name || 'Cliente',
                email: user.email!,
                cellphone: buyerProfile.cellphone,
                taxId: buyerProfile.tax_id,
            },
            metadata: {
                order_id: order.id
            }
        }))

        if (!pixResponse.data) {
            return { error: 'Erro ao gerar PIX. Tente novamente.' }
        }

        // 7. Save PIX ID to order (using asaas_payment_id field as it exists)
        await supabase
            .from('orders')
            .update({ asaas_payment_id: pixResponse.data.id })
            .eq('id', order.id)

        return {
            orderId: order.id,
            pixId: pixResponse.data.id,
            qrcode: pixResponse.data.brCodeBase64,
            content: pixResponse.data.brCode,
            devMode: pixResponse.data.devMode
        }
    } catch (error: any) {
        console.error('[Checkout] Error:', error.message)
        return { error: error.message || 'Erro ao processar pagamento.' }
    }
}

export async function checkPaymentStatus(pixId: string, orderId: string) {
    const { checkPixQrCodeStatus } = await import('@/services/abacate')
    const statusResponse = await checkPixQrCodeStatus(pixId)

    if (statusResponse.data?.status === 'PAID') {
        const supabase = await createClient()

        // Verify if already processed to avoid race conditions
        const { data: order } = await supabase
            .from('orders')
            .select('status, reader_id, amount_reader_net')
            .eq('id', orderId)
            .single()

        if (order && order.status === 'PENDING_PAYMENT') {
            // Update order status
            await supabase
                .from('orders')
                .update({ status: 'PAID' })
                .eq('id', orderId)

            // Process wallet credit (same logic as webhook)
            const { data: wallet } = await supabase
                .from('wallets')
                .select('id')
                .eq('user_id', order.reader_id)
                .single()

            let walletId = wallet?.id
            if (!walletId) {
                const { data: newWallet } = await supabase
                    .from('wallets')
                    .insert({ user_id: order.reader_id })
                    .select('id')
                    .single()
                walletId = newWallet?.id
            }

            if (walletId) {
                await supabase
                    .from('transactions')
                    .insert({
                        wallet_id: walletId,
                        amount: order.amount_reader_net,
                        type: 'SALE_CREDIT',
                        status: 'PENDING',
                        order_id: orderId,
                    })
            }

            return { status: 'PAID' }
        }
        return { status: order?.status || 'PAID' }
    }

    return { status: statusResponse.data?.status || 'PENDING' }
}
