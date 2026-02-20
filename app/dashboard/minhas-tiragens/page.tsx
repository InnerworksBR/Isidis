import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardClient } from '../dashboard-client'

const statusConfig: Record<string, { label: string; color: string; filterLabel: string }> = {
    PENDING_PAYMENT: {
        label: 'Aguardando Pagamento',
        color: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
        filterLabel: 'Pendente'
    },
    PAID: {
        label: 'Em Preparo',
        color: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
        filterLabel: 'Em Andamento'
    },
    DELIVERED: {
        label: 'Pronto para Ver',
        color: 'bg-green-500/15 text-green-400 border-green-500/30',
        filterLabel: 'Pronto'
    },
    COMPLETED: {
        label: 'Concluído',
        color: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
        filterLabel: 'Concluído'
    },
    CANCELED: {
        label: 'Cancelado',
        color: 'bg-red-500/15 text-red-400 border-red-500/30',
        filterLabel: 'Cancelado'
    },
}

export default async function MinhasTiragensPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login?next=/dashboard/minhas-tiragens')
    }

    // Buscar pedidos com dados do gig e reader
    const { data: orders } = await supabase
        .from('orders')
        .select(`
            id, status, amount_total, created_at, is_favorite,
            gig_id, reader_id,
            gigs (title, delivery_time_hours),
            profiles!orders_reader_id_fkey (full_name, avatar_url),
            reviews (rating)
        `)
        .or(`client_id.eq.${user.id},reader_id.eq.${user.id}`)
        .order('created_at', { ascending: false })

    const formattedOrders = orders?.map((order: any) => ({
        id: order.id,
        status: order.status,
        amount_total: order.amount_total,
        created_at: order.created_at,
        isFavorite: order.is_favorite,
        gigTitle: order.gigs?.title || (Array.isArray(order.gigs) ? order.gigs[0]?.title : 'Leitura de Tarot'),
        deliveryTimeHours: order.gigs?.delivery_time_hours || (Array.isArray(order.gigs) ? order.gigs[0]?.delivery_time_hours : 48),
        readerName: order.profiles?.full_name || (Array.isArray(order.profiles) ? order.profiles[0]?.full_name : 'Taróloga'),
        readerAvatar: order.profiles?.avatar_url || (Array.isArray(order.profiles) ? order.profiles[0]?.avatar_url : null),
        gigId: order.gig_id,
        readerId: order.reader_id,
        reviewRating: order.reviews?.length ? order.reviews[0].rating : null
    })) || []


    // Serialize orders for client component
    return (
        <DashboardClient
            orders={formattedOrders}
            userId={user.id}
            userName={user.user_metadata?.full_name?.split(' ')[0] || 'Visitante'}
            userInitials={user.email?.substring(0, 2).toUpperCase() || 'VA'}
            totalReadings={formattedOrders.length}
            statusConfig={statusConfig}
        />
    )
}
