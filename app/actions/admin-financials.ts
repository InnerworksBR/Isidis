'use server'

import { createClient } from '@/lib/supabase/server'

export interface FinancialSummary {
    // Totais das ordens (fonte principal)
    totalRevenue: number           // Receita bruta total (amount_total)
    platformFee: number            // Taxa da plataforma / lucro empresa (amount_platform_fee)
    totalRepasse: number           // Total de repasse para cartomantes (amount_reader_net)
    // Saques já pagos
    totalWithdrawn: number         // Saques concluídos (WITHDRAWAL COMPLETED)
    // Saldo a pagar (repasse pendente)
    pendingRepasse: number         // Repasse aguardando saque
    // Transações recentes
    recentOrders: OrderFinancialRow[]
}

export interface OrderFinancialRow {
    id: string
    created_at: string
    status: string
    amount_total: number
    amount_platform_fee: number
    amount_reader_net: number
    client_name: string
    reader_name: string
    gig_title: string
}

export async function getAdminFinancials(): Promise<{ data?: FinancialSummary, error?: string }> {
    const supabase = await createClient()

    // check auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Unauthorized' }

    // 1. Buscar todas as ordens PAGAS/ENTREGUES/CONCLUÍDAS
    //    (sem join em profiles para evitar ambiguidade de FK — buscamos profiles separado)
    const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
            id,
            created_at,
            status,
            amount_total,
            amount_platform_fee,
            amount_reader_net,
            client_id,
            reader_id,
            gig_id
        `)
        .in('status', ['PAID', 'DELIVERED', 'COMPLETED'])
        .order('created_at', { ascending: false })

    if (ordersError) return { error: 'Falha ao buscar ordens: ' + ordersError.message }

    // 2. Calcular totais das ordens
    let totalRevenue = 0
    let platformFee = 0
    let totalRepasse = 0

    for (const o of orders ?? []) {
        totalRevenue += o.amount_total ?? 0
        platformFee += o.amount_platform_fee ?? 0
        totalRepasse += o.amount_reader_net ?? 0
    }

    // 3. Total saques já pagos (saídas do caixa)
    const { data: withdrawData, error: withdrawError } = await supabase
        .from('transactions')
        .select('amount')
        .eq('type', 'WITHDRAWAL')
        .eq('status', 'COMPLETED')

    if (withdrawError) return { error: 'Falha ao buscar saques' }
    const totalWithdrawn = withdrawData.reduce((acc, curr) => acc + Math.abs(curr.amount), 0)

    // 4. Repasse pendente (créditos do cartomante ainda não sacados)
    const { data: pendingData } = await supabase
        .from('transactions')
        .select('amount')
        .eq('type', 'SALE_CREDIT')
        .eq('status', 'COMPLETED')

    const totalCredited = pendingData?.reduce((acc, curr) => acc + curr.amount, 0) ?? 0
    const pendingRepasse = Math.max(0, totalCredited - totalWithdrawn)

    // 5. Resolver nomes de profiles e gigs para as ordens recentes
    const recentRaw = (orders ?? []).slice(0, 30)
    const allUserIds = [...new Set(recentRaw.flatMap(o => [o.client_id, o.reader_id]).filter(Boolean))]
    const allGigIds = [...new Set(recentRaw.map(o => o.gig_id).filter(Boolean))]

    const { data: profilesData } = allUserIds.length > 0
        ? await supabase.from('profiles').select('id, full_name').in('id', allUserIds)
        : { data: [] }
    const { data: gigsData } = allGigIds.length > 0
        ? await supabase.from('gigs').select('id, title').in('id', allGigIds)
        : { data: [] }

    const profileMap = new Map((profilesData ?? []).map(p => [p.id, p.full_name]))
    const gigMap = new Map((gigsData ?? []).map(g => [g.id, g.title]))

    const recentOrders: OrderFinancialRow[] = recentRaw.map((o) => ({
        id: o.id,
        created_at: o.created_at,
        status: o.status,
        amount_total: o.amount_total,
        amount_platform_fee: o.amount_platform_fee,
        amount_reader_net: o.amount_reader_net,
        client_name: profileMap.get(o.client_id) ?? 'Desconhecido',
        reader_name: profileMap.get(o.reader_id) ?? 'Desconhecido',
        gig_title: gigMap.get(o.gig_id) ?? 'N/A',
    }))

    return {
        data: {
            totalRevenue,
            platformFee,
            totalRepasse,
            totalWithdrawn,
            pendingRepasse,
            recentOrders,
        }
    }
}
