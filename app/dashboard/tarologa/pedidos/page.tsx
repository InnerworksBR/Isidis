import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
    Calendar, Clock, Tag, Sparkles,
    CreditCard, Eye, MessageSquare, MoreVertical,
    Star, Zap, Package
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TarologaSidebar } from '@/components/tarologa-sidebar'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageSection } from '@/components/layout/PageSection'
import { SearchInput } from '@/components/ui/search-input'

export default async function OrdersPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login?next=/dashboard/tarologa/pedidos')
    }

    const resolvedParams = await searchParams
    const currentTab = typeof resolvedParams.tab === 'string' ? resolvedParams.tab : 'active'
    const searchQuery = typeof resolvedParams.q === 'string' ? resolvedParams.q.toLowerCase() : ''

    // Fetch profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, specialties')
        .eq('id', user.id)
        .single()

    // Fetch all orders for this reader
    const { data: orders } = await supabase
        .from('orders')
        .select('id, status, amount_total, amount_reader_net, created_at, gig_id, client_id, delivery_content')
        .eq('reader_id', user.id)
        .order('created_at', { ascending: false })

    const allOrders = orders || []

    // Categorize orders
    const activeOrders = allOrders.filter(o => o.status === 'PAID')
    const pendingOrders = allOrders.filter(o => o.status === 'PENDING_PAYMENT')
    const completedOrders = allOrders.filter(o => o.status === 'COMPLETED' || o.status === 'DELIVERED')
    const canceledOrders = allOrders.filter(o => o.status === 'CANCELED')

    // Filter display orders
    let displayOrders = []
    if (currentTab === 'pending') {
        displayOrders = pendingOrders
    } else if (currentTab === 'completed') {
        displayOrders = completedOrders
    } else if (currentTab === 'canceled') {
        displayOrders = canceledOrders
    } else {
        // default to active
        displayOrders = activeOrders
    }

    // Apply search filter if query exists
    if (searchQuery) {
        // We'll filter based on ID for now, as client names are fetched separately
        // Ideally, rewrite this to fetch everything and search in memory or join in query
        // For simplicity, let's filter after fetching details to include client name search
    }

    // Fetch gig details
    const gigIds = [...new Set(allOrders.map(o => o.gig_id))]
    const gigDetails: Record<string, { title: string; image_url: string | null }> = {}
    if (gigIds.length > 0) {
        const { data: gigs } = await supabase
            .from('gigs')
            .select('id, title, image_url')
            .in('id', gigIds)
        if (gigs) {
            gigs.forEach(g => {
                gigDetails[g.id] = { title: g.title, image_url: g.image_url }
            })
        }
    }

    // Fetch client details
    const clientIds = [...new Set(allOrders.map(o => o.client_id))]
    const clientDetails: Record<string, { full_name: string; avatar_url: string | null }> = {}
    if (clientIds.length > 0) {
        const { data: clients } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .in('id', clientIds)
        if (clients) {
            clients.forEach(c => {
                clientDetails[c.id] = { full_name: c.full_name || 'Cliente', avatar_url: c.avatar_url }
            })
        }
    }

    // Apply client name search after fetching details
    if (searchQuery) {
        displayOrders = displayOrders.filter(o => {
            const clientName = clientDetails[o.client_id]?.full_name?.toLowerCase() || ''
            const orderId = o.id.toLowerCase()
            return clientName.includes(searchQuery) || orderId.includes(searchQuery)
        })
    }


    const firstName = profile?.full_name?.split(' ')[0] || 'Taróloga'
    const fmt = (cents: number) =>
        (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })


    // Get time since order creation
    function getTimeSince(createdAt: string) {
        const diff = Date.now() - new Date(createdAt).getTime()
        const hours = Math.floor(diff / (1000 * 60 * 60))
        const days = Math.floor(hours / 24)
        if (days > 0) return `${days}d atrás`
        if (hours > 0) return `${hours}h atrás`
        return 'Agora mesmo'
    }

    function getDueTime(createdAt: string) {
        // Assuming 48h delivery window
        const deadline = new Date(new Date(createdAt).getTime() + 48 * 60 * 60 * 1000)
        const diff = deadline.getTime() - Date.now()
        if (diff <= 0) return { text: 'Atrasado', urgent: true }
        const hours = Math.floor(diff / (1000 * 60 * 60))
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        if (hours < 6) return { text: `Vence em ${hours}h ${mins}m`, urgent: true }
        if (hours < 24) return { text: `Vence em ${hours}h`, urgent: false }
        const days = Math.floor(hours / 24)
        return { text: `Vence em ${days} dias`, urgent: false }
    }

    // Status badge styling
    function getStatusBadge(status: string, price: number) {
        if (status === 'PAID') {
            if (price >= 30000) return { label: 'ENTREGA PRIORITÁRIA', color: 'bg-red-500/15 text-red-400 border-red-500/25' }
            if (price >= 15000) return { label: 'LEITURA PREMIUM', color: 'bg-green-500/15 text-green-400 border-green-500/25' }
            return { label: 'LEITURA PADRÃO', color: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/25' }
        }
        if (status === 'DELIVERED') return { label: 'ENTREGUE', color: 'bg-green-500/15 text-green-400 border-green-500/25' }
        if (status === 'COMPLETED') return { label: 'CONCLUÍDO', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' }
        if (status === 'PENDING_PAYMENT') return { label: 'PAGAMENTO PENDENTE', color: 'bg-amber-500/15 text-amber-400 border-amber-500/25' }
        if (status === 'CANCELED') return { label: 'CANCELADO', color: 'bg-slate-500/15 text-slate-400 border-slate-500/25' }
        return { label: status, color: 'bg-slate-500/15 text-slate-400 border-slate-500/25' }
    }


    const totalActive = activeOrders.length // Just count PAID as active now
    const totalPending = pendingOrders.length
    const totalCompleted = completedOrders.length
    const totalCanceled = canceledOrders.length

    return (
        <div className="min-h-screen bg-background-deep text-slate-200 font-sans selection:bg-purple-500/30 flex overflow-hidden">
            <TarologaSidebar profile={profile} userId={user.id} />

            {/* ──── Main Content ──── */}
            <main className="relative z-10 flex-1 h-screen overflow-y-auto scrollbar-hide pb-24 md:pb-8">
                <PageContainer className="px-4 md:px-8 py-6 md:py-12">

                    {/* Header */}
                    <PageSection padding="none" withOrbs className="mb-8">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                            <div>
                                <h1 className="text-3xl font-bold text-white mb-2">Pedidos Profissionais</h1>
                                <p className="text-sm text-slate-400">Gerencie suas consultas místicas e entregas.</p>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center gap-3">
                                <SearchInput placeholder="Buscar por cliente ou ID..." />

                                <button className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-sm text-slate-300 hover:text-indigo-300 hover:border-indigo-500/30 transition-all w-full sm:w-auto backdrop-blur-sm">
                                    <Calendar className="w-4 h-4" />
                                    Período
                                </button>
                                <span className="hidden sm:inline-flex text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/20 px-2.5 py-1 rounded-full whitespace-nowrap">
                                    {totalActive} Ativos
                                </span>
                            </div>
                        </div>
                    </PageSection>

                    {/* Tabs */}
                    <div className="flex items-center gap-6 border-b border-white/10 mb-8 overflow-x-auto scrollbar-hide">
                        <Link
                            href="/dashboard/tarologa/pedidos?tab=active"
                            className={`text-sm font-bold pb-3 border-b-2 whitespace-nowrap transition-colors ${currentTab === 'active' ? 'text-indigo-400 border-indigo-500' : 'text-slate-500 border-transparent hover:text-slate-300'}`}
                        >
                            Ativos ({totalActive})
                        </Link>
                        <Link
                            href="/dashboard/tarologa/pedidos?tab=pending"
                            className={`text-sm font-medium pb-3 border-b-2 whitespace-nowrap transition-colors ${currentTab === 'pending' ? 'text-indigo-400 border-indigo-500' : 'text-slate-500 border-transparent hover:text-slate-300'}`}
                        >
                            Pendentes ({totalPending})
                        </Link>
                        <Link
                            href="/dashboard/tarologa/pedidos?tab=completed"
                            className={`text-sm font-medium pb-3 border-b-2 whitespace-nowrap transition-colors ${currentTab === 'completed' ? 'text-indigo-400 border-indigo-500' : 'text-slate-500 border-transparent hover:text-slate-300'}`}
                        >
                            Concluídos ({totalCompleted})
                        </Link>
                        <Link
                            href="/dashboard/tarologa/pedidos?tab=canceled"
                            className={`text-sm font-medium pb-3 border-b-2 whitespace-nowrap transition-colors ${currentTab === 'canceled' ? 'text-indigo-400 border-indigo-500' : 'text-slate-500 border-transparent hover:text-slate-300'}`}
                        >
                            Cancelados
                        </Link>
                    </div>

                    {/* ──── Order List ──── */}
                    <div className="space-y-4">
                        {displayOrders.length === 0 ? (
                            <div className="rounded-[1.5rem] border border-white/5 bg-white/5 p-16 text-center backdrop-blur-md">
                                <Package className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                                <p className="text-sm text-slate-400 font-bold">Nenhum pedido encontrado</p>
                                <p className="text-xs text-slate-600 mt-1">
                                    {searchQuery ? `Não encontramos nada para "${searchQuery}"` : 'Tudo limpo por aqui!'}
                                </p>
                            </div>
                        ) : (
                            displayOrders.map((order) => {
                                const gig = gigDetails[order.gig_id]
                                const client = clientDetails[order.client_id]
                                const badge = getStatusBadge(order.status, order.amount_total)
                                const due = getDueTime(order.created_at)
                                const clientInitials = (client?.full_name || 'C')
                                    .split(' ')
                                    .map((n: string) => n[0])
                                    .join('')
                                    .substring(0, 2)
                                    .toUpperCase()

                                return (
                                    <div
                                        key={order.id}
                                        className="rounded-[1.5rem] border border-white/5 bg-card-item hover:border-indigo-500/20 hover:bg-white/5 transition-all p-5 flex flex-col md:flex-row items-start md:items-center gap-5 group"
                                    >
                                        {/* Gig Thumbnail */}
                                        <div className="w-full md:w-16 h-32 md:h-16 rounded-2xl overflow-hidden bg-black/40 shrink-0 relative">
                                            {gig?.image_url ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    src={gig.image_url}
                                                    alt={gig.title}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <Tag className="w-6 h-6 text-indigo-700" />
                                                </div>
                                            )}
                                            <div className="absolute top-2 right-2 md:hidden">
                                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border backdrop-blur-md ${badge.color}`}>
                                                    {badge.label}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Order Info */}
                                        <div className="flex-1 min-w-0 w-full">
                                            <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[10px] text-slate-600 font-mono">
                                                        ID: #MP-{order.id.substring(0, 6).toUpperCase()}
                                                    </span>
                                                    <span className={`hidden md:inline-block text-[9px] font-bold px-2 py-0.5 rounded-md border ${badge.color}`}>
                                                        {badge.label}
                                                    </span>
                                                </div>
                                                <span className="md:hidden flex items-center gap-1 text-slate-500 text-xs font-bold">
                                                    R$ {fmt(order.amount_reader_net)}
                                                </span>
                                            </div>

                                            <h3 className="text-base font-bold text-white truncate mb-2">
                                                {gig?.title || 'Leitura de Tarot'}
                                            </h3>

                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-400">
                                                {/* Client */}
                                                <span className="flex items-center gap-1.5 p-1 pr-2 rounded-full bg-white/5 border border-white/5">
                                                    {client?.avatar_url ? (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img src={client.avatar_url} alt="" className="w-4 h-4 rounded-full object-cover" />
                                                    ) : (
                                                        <span className="w-4 h-4 rounded-full bg-indigo-600 flex items-center justify-center text-[6px] text-white font-bold">
                                                            {clientInitials}
                                                        </span>
                                                    )}
                                                    <span className="text-slate-300 font-medium">{client?.full_name || 'Cliente'}</span>
                                                </span>

                                                {/* Due Time (for active orders) */}
                                                {order.status === 'PAID' && (
                                                    <span className={`flex items-center gap-1.5 ${due.urgent ? 'text-red-400 font-bold' : 'text-slate-500'}`}>
                                                        <Clock className="w-3.5 h-3.5" />
                                                        {due.text}
                                                    </span>
                                                )}

                                                {/* Delivered info */}
                                                {order.status === 'DELIVERED' && (
                                                    <span className="flex items-center gap-1.5 text-green-400">
                                                        <Eye className="w-3.5 h-3.5" />
                                                        Entregue • Criado {getTimeSince(order.created_at)}
                                                    </span>
                                                )}

                                                {/* Price - Desktop */}
                                                <span className="hidden md:flex items-center gap-1.5 text-slate-500 font-medium ml-auto">
                                                    <CreditCard className="w-3.5 h-3.5" />
                                                    R$ {fmt(order.amount_reader_net)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0 pt-3 md:pt-0 border-t border-white/5 md:border-0 justify-end">
                                            {order.status === 'PAID' && (
                                                <Link href={`/dashboard/tarologa/pedido/${order.id}`} className="flex-1 md:flex-none">
                                                    <Button
                                                        className={`font-bold text-xs rounded-xl gap-2 h-9 px-4 w-full md:w-auto ${order.amount_total >= 30000
                                                            ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-900/20'
                                                            : 'bg-white/5 border border-purple-500/30 text-purple-300 hover:bg-purple-500/10'
                                                            }`}
                                                    >
                                                        {order.amount_total >= 30000 ? (
                                                            <><Zap className="w-3.5 h-3.5" /> Iniciar Entrega</>
                                                        ) : (
                                                            <><Sparkles className="w-3.5 h-3.5" /> Preparar Rascunho</>
                                                        )}
                                                    </Button>
                                                </Link>
                                            )}

                                            {order.status === 'DELIVERED' && (
                                                <Link href={`/dashboard/tarologa/pedido/${order.id}`} className="flex-1 md:flex-none">
                                                    <Button className="bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 font-bold text-xs rounded-xl gap-2 h-9 px-4 w-full md:w-auto">
                                                        <Eye className="w-3.5 h-3.5" /> Ver Entrega
                                                    </Button>
                                                </Link>
                                            )}

                                            <Link href={`/dashboard/tarologa/mensagens?orderId=${order.id}&clientId=${order.client_id}`}>
                                                <button className="w-9 h-9 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all">
                                                    <MessageSquare className="w-4 h-4" />
                                                </button>
                                            </Link>

                                            {order.status === 'DELIVERED' ? (
                                                <button className="w-9 h-9 rounded-xl flex items-center justify-center text-amber-500 hover:text-amber-400 transition-all bg-amber-500/10 border border-amber-500/20">
                                                    <Star className="w-4 h-4 fill-amber-500" />
                                                </button>
                                            ) : (
                                                <button className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 transition-all border border-transparent hover:border-white/10">
                                                    <MoreVertical className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>

                    {/* Pagination */}
                    {displayOrders.length > 0 && (
                        <div className="flex items-center justify-between mt-8 text-xs text-slate-600">
                            <span>Exibindo {displayOrders.length} pedido(s)</span>
                            <div className="flex items-center gap-2">
                                <button className="px-3 py-1.5 rounded-lg border border-white/10 text-slate-600 cursor-not-allowed bg-white/5">
                                    Anterior
                                </button>
                                <button className="px-3 py-1.5 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:bg-white/5 transition-all bg-white/5">
                                    Próxima
                                </button>
                            </div>
                        </div>
                    )}
                </PageContainer>
            </main>
        </div>
    )
}
