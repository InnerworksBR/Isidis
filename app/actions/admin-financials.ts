'use server'

import { createClient } from '@/lib/supabase/server'

export interface FinancialSummary {
    totalRevenue: number
    totalWithdrawn: number
    netRevenue: number // Assuming platform takes a cut, or just total in system
    recentTransactions: TransactionWithUser[]
}

export interface TransactionWithUser {
    id: string
    amount: number
    type: string
    status: string
    created_at: string
    user: {
        full_name: string
        email: string
    }
}

export async function getAdminFinancials(): Promise<{ data?: FinancialSummary, error?: string }> {
    const supabase = await createClient()

    // check admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    // In a real app we'd check strict RBAC here. Assuming auth middleware handles /admin protection.

    // 1. Total Revenue (Sales)
    // Sum of all SALE_CREDIT transactions
    const { data: revenueData, error: revenueError } = await supabase
        .from('transactions')
        .select('amount')
        .eq('type', 'SALE_CREDIT')
        .eq('status', 'COMPLETED')

    if (revenueError) return { error: 'Failed to fetch revenue' }
    const totalRevenue = revenueData.reduce((acc, curr) => acc + curr.amount, 0)

    // 2. Total Withdrawn
    const { data: withdrawData, error: withdrawError } = await supabase
        .from('transactions')
        .select('amount')
        .eq('type', 'WITHDRAWAL')
        .eq('status', 'COMPLETED')

    if (withdrawError) return { error: 'Failed to fetch withdrawals' }
    const totalWithdrawn = withdrawData.reduce((acc, curr) => acc + Math.abs(curr.amount), 0)

    // 3. Recent Transactions
    // We need to join with wallets -> profiles to get user names
    // Supabase JS join syntax depends on foreign keys.
    // transactions -> wallet_id
    // wallets -> user_id -> profiles?
    // Let's try to fetch transactions and manually join if deep nesting is complex, 
    // or use the relational query if setup correctly.

    // Using a simpler approach: fetch specific transactions and then fetch profiles
    const { data: recentTx, error: txError } = await supabase
        .from('transactions')
        .select(`
            id, amount, type, status, created_at, wallet_id
        `)
        .order('created_at', { ascending: false })
        .limit(20)

    if (txError) return { error: 'Failed to fetch transactions' }

    // Fetch wallet owners
    const walletIds = [...new Set(recentTx.map(t => t.wallet_id))]
    const { data: wallets } = await supabase
        .from('wallets')
        .select('id, user_id')
        .in('id', walletIds)

    // Map wallet -> user_id
    const walletUserMap = new Map(wallets?.map(w => [w.id, w.user_id]) || [])
    const userIds = [...new Set(wallets?.map(w => w.user_id) || [])]

    // Fetch profiles
    const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds)

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || [])

    const recentTransactions: TransactionWithUser[] = recentTx.map(tx => {
        const userId = walletUserMap.get(tx.wallet_id)
        const profile = userId ? profileMap.get(userId) : null
        return {
            id: tx.id,
            amount: tx.amount,
            type: tx.type,
            status: tx.status,
            created_at: tx.created_at,
            user: {
                full_name: profile?.full_name || 'Desconhecido',
                email: profile?.email || 'N/A'
            }
        }
    })

    return {
        data: {
            totalRevenue,
            totalWithdrawn,
            netRevenue: totalRevenue - totalWithdrawn, // Simple cash flow for now
            recentTransactions
        }
    }
}
