'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getWalletBalances(walletId: string) {
    const supabase = await createClient()

    const { data: transactions } = await supabase
        .from('transactions')
        .select('amount, status, type')
        .eq('wallet_id', walletId)

    let totalEarnings = 0
    let pendingBalance = 0
    let availableBalance = 0

    if (transactions) {
        transactions.forEach((t) => {
            if (t.type === 'SALE_CREDIT') {
                totalEarnings += t.amount
                if (t.status === 'PENDING') pendingBalance += t.amount
                if (t.status === 'COMPLETED') availableBalance += t.amount
            }
            if (t.type === 'WITHDRAWAL' && (t.status === 'COMPLETED' || t.status === 'PENDING')) {
                availableBalance += t.amount // amount is negative, so it subtracts
            }
        })
    }

    return { totalEarnings, pendingBalance, availableBalance }
}

export async function requestWithdrawal(amountCents: number, pixKey: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return { error: 'Não autorizado' }

    if (amountCents <= 0) return { error: 'Valor inválido' }
    if (!pixKey) return { error: 'Chave PIX ausente' }

    // 1. Get Wallet
    const { data: wallet } = await supabase
        .from('wallets')
        .select('id')
        .eq('user_id', user.id)
        .single()

    if (!wallet) return { error: 'Carteira não encontrada' }

    // 2. Calculated Available Balance (Server-side validation)
    const { availableBalance } = await getWalletBalances(wallet.id)

    if (availableBalance < amountCents) {
        return { error: `Saldo insuficiente. Disponível: R$ ${(availableBalance / 100).toFixed(2)}` }
    }

    // 3. Create Withdrawal Transaction
    const { error: insertError } = await supabase
        .from('transactions')
        .insert({
            wallet_id: wallet.id,
            amount: -amountCents, // Store as negative
            type: 'WITHDRAWAL',
            status: 'PENDING',
            external_id: `PIX::${pixKey}` // Store PIX info here for now
        })

    if (insertError) {
        return { error: 'Falha ao solicitar saque: ' + insertError.message }
    }

    revalidatePath('/dashboard/tarologa/carteira')
    revalidatePath('/dashboard/tarologa')
    return { success: true }
}
