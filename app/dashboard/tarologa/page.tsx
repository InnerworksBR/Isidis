import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { TarologaSidebar } from '@/components/tarologa-sidebar'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageSection } from '@/components/layout/PageSection'
import { PageHeader } from '@/components/layout/PageHeader'
import {
    Package, Wallet, Clock, Star, CheckCircle2, Bell, Sparkles,
    ArrowRight, MoreHorizontal, Mic, Zap, AlertTriangle
} from 'lucide-react'
import { NotificationsBell } from '@/components/notifications-bell'
import { WithdrawalModal } from '@/components/withdrawal-modal'
import { getWalletBalances } from '@/app/actions/finance'

export default async function TarologaDashboard() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login?next=/dashboard/tarologa')
    }

    // Fetch profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, specialties, verification_status, pix_key, pix_key_type')
        .eq('id', user.id)
        .single()

    // Fetch orders with gig info and client info
    const { data: orders } = await supabase
        .from('orders')
        .select('*, gigs(title, description, image_url), profiles!orders_client_id_fkey(full_name)')
        .eq('reader_id', user.id)
        .order('created_at', { ascending: false })

    // Fetch active gigs count to check visibility
    const { count: activeGigsCount } = await supabase
        .from('gigs')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', user.id)
        .eq('is_active', true)
        .eq('status', 'APPROVED')

    // Fetch wallet and transactions
    const { data: wallet } = await supabase
        .from('wallets')
        .select('id')
        .eq('user_id', user.id)
        .single()

    let totalEarnings = 0
    let pendingBalance = 0
    let availableBalance = 0

    if (wallet) {
        const balances = await getWalletBalances(wallet.id)
        totalEarnings = balances.totalEarnings
        pendingBalance = balances.pendingBalance
        availableBalance = balances.availableBalance
    }

    // Fetch reviews for this reader
    const { data: reviews } = await supabase
        .from('reviews')
        .select('rating')
        .eq('reader_id', user.id)

    const avgRating = reviews && reviews.length > 0
        ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
        : '5.0'

    const allOrders = orders || []
    const paidOrders = allOrders.filter(o => o.status === 'PAID')
    const deliveredOrders = allOrders.filter(o => ['DELIVERED', 'COMPLETED'].includes(o.status))
    const fulfillableOrders = allOrders.filter(o => ['PAID', 'DELIVERED', 'COMPLETED'].includes(o.status))
    const deliveryRate = fulfillableOrders.length > 0
        ? Math.round((deliveredOrders.length / fulfillableOrders.length) * 100)
        : 100

    const firstName = profile?.full_name?.split(' ')[0] || 'Taróloga'


    // Mock recent activity - will be replaced with real data later
    const recentActivity = [
        ...(paidOrders.length > 0 ? [{
            type: 'order' as const,
            title: 'Novo Pedido Recebido',
            description: `Pedido #${paidOrders[0].id.slice(0, 8)} aguardando leitura`,
            time: getTimeAgo(paidOrders[0].created_at),
            color: 'bg-blue-500',
        }] : []),
        ...(deliveredOrders.length > 0 ? [{
            type: 'delivery' as const,
            title: 'Entrega Concluída',
            description: `Pedido #${deliveredOrders[0].id.slice(0, 8)} entregue com sucesso`,
            time: getTimeAgo(deliveredOrders[0].created_at),
            color: 'bg-green-500',
        }] : []),
    ]

    return (
        <div className="min-h-screen bg-background-deep text-slate-200 font-sans selection:bg-purple-500/30 flex overflow-hidden">
            <TarologaSidebar profile={profile} userId={user.id} />

            {/* ──── Main Content ──── */}
            <main className="relative z-10 flex-1 h-screen overflow-y-auto scrollbar-hide pb-24 md:pb-8">
                {/* 1. Header Hero (Full Width) */}
                <PageSection padding="xl" withShootingStars={true} className="mb-0 border-b border-white/5">
                    <PageContainer>
                        <div className="flex flex-col items-center text-center">
                            <PageHeader
                                title={
                                    <>
                                        Bem-vinda de volta, <br />
                                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-amber-400">
                                            {firstName}
                                        </span>
                                    </>
                                }
                                description={`Você tem ${paidOrders.length} pedido${paidOrders.length !== 1 ? 's' : ''} aguardando sua intuição.`}
                                className="mb-8"
                                align="center"
                            />

                            <div className="flex items-center gap-3 relative z-50">
                                <NotificationsBell currentUserId={user.id} />
                                <div className="px-4 py-2 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md shadow-lg flex flex-col items-center min-w-[100px]">
                                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Pedidos Totais</span>
                                    <span className="text-xl font-bold text-white">{allOrders.length}</span>
                                </div>
                            </div>
                        </div>
                    </PageContainer>
                </PageSection>

                <PageContainer className="px-4 md:px-8 py-6 md:py-12">
                    {/* Visibility Status Alert */}
                    {(profile?.verification_status !== 'APPROVED' || !activeGigsCount) && (
                        <div className="mb-8 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6 flex items-start gap-4 backdrop-blur-sm">
                            <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
                            <div>
                                <h3 className="text-base font-bold text-amber-500 mb-1">Seu perfil ainda não está visível para clientes</h3>
                                <ul className="text-sm text-amber-400/80 list-disc list-inside space-y-1">
                                    {profile?.verification_status !== 'APPROVED' && (
                                        <li>Aguardando aprovação da equipe (Status: {profile?.verification_status || 'Pendente'}).</li>
                                    )}
                                    {!activeGigsCount && (
                                        <li>Você precisa criar pelo menos um Serviço (Gig). <Link href="/dashboard/tarologa/gigs/novo" className="underline hover:text-amber-300">Criar agora</Link></li>
                                    )}
                                </ul>
                            </div>
                        </div>
                    )}

                    {/* ──── Financial Cards ──── */}
                    <PageSection padding="none" className="mb-12">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                            {/* Pending Balance */}
                            <div className="p-6 rounded-[2rem] border border-white/5 bg-card-deep/50 backdrop-blur-md relative overflow-hidden group hover:bg-card-deep/80 transition-colors">
                                <div className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full bg-indigo-500/10 group-hover:bg-indigo-500/20 transition-colors" />
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                                        <Clock className="w-5 h-5 text-indigo-400" />
                                    </div>
                                    <span className="text-xs uppercase tracking-wider text-slate-400 font-bold">A liberar</span>
                                </div>
                                <p className="text-xs text-slate-500 mb-1">Saldo Pendente</p>
                                <p className="text-2xl font-black text-white">R$ {(pendingBalance / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            </div>

                            {/* Available Balance */}
                            <div className="p-6 rounded-[2rem] bg-gradient-to-br from-indigo-600 to-purple-800 relative overflow-hidden group shadow-lg shadow-indigo-900/20">
                                <div className="absolute -bottom-6 -right-6 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
                                <div className="relative z-10">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                                            <Wallet className="w-5 h-5 text-white" />
                                        </div>
                                        <span className="text-xs uppercase tracking-wider text-indigo-100 font-bold">Disponível</span>
                                    </div>
                                    <p className="text-xs text-indigo-200/80 mb-1">Saldo para Saque</p>
                                    <p className="text-2xl font-black text-white mb-4">R$ {(availableBalance / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                    <WithdrawalModal
                                        availableBalance={availableBalance}
                                        pixKey={profile?.pix_key || null}
                                        pixKeyType={profile?.pix_key_type || 'CPF'}
                                    >
                                        <Button className="w-full bg-white/20 hover:bg-white/30 text-white font-bold text-xs rounded-xl h-10 backdrop-blur-md shadow-none border border-white/10">
                                            <Sparkles className="w-4 h-4 mr-2" />
                                            Sacar via PIX
                                        </Button>
                                    </WithdrawalModal>
                                </div>
                            </div>

                            {/* Rating */}
                            <div className="p-6 rounded-[2rem] border border-white/5 bg-card-deep/50 backdrop-blur-md flex flex-col items-center justify-center text-center hover:bg-card-deep/80 transition-colors relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <Star className="w-8 h-8 text-amber-400 fill-amber-400 mb-2 drop-shadow-lg" />
                                <p className="text-3xl font-black text-white">{avgRating}</p>
                                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mt-1">Avaliação Média</p>
                            </div>

                            {/* Delivery Rate */}
                            <div className="p-6 rounded-[2rem] border border-white/5 bg-card-deep/50 backdrop-blur-md flex flex-col items-center justify-center text-center hover:bg-card-deep/80 transition-colors relative overflow-hidden">
                                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-green-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <CheckCircle2 className="w-8 h-8 text-green-400 mb-2 drop-shadow-lg" />
                                <p className="text-3xl font-black text-white">{deliveryRate}%</p>
                                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mt-1">Taxa de Entrega</p>
                            </div>
                        </div>
                    </PageSection>

                    {/* ──── Orders + Activity ──── */}
                    <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 mb-12">
                        {/* Orders to Fulfill column */}
                        <div className="xl:col-span-3 space-y-6">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-serif text-white flex items-center gap-2">
                                    <Package className="w-5 h-5 text-indigo-400" />
                                    Pedidos para Entregar
                                </h2>
                                <Link href="/dashboard/tarologa/pedidos" className="text-sm text-indigo-400 hover:text-indigo-300 font-bold hover:underline">
                                    Ver todos
                                </Link>
                            </div>

                            {paidOrders.length === 0 ? (
                                <div className="p-12 rounded-[2rem] border border-dashed border-white/10 bg-white/5 text-center flex flex-col items-center justify-center">
                                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                                        <Package className="w-8 h-8 text-slate-500" />
                                    </div>
                                    <p className="text-base text-slate-300 font-medium">Nenhum pedido aguardando entrega.</p>
                                    <p className="text-sm text-slate-500 mt-2 max-w-xs">Quando um cliente comprar sua leitura, ela aparecerá aqui para você responder.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {paidOrders.slice(0, 5).map(order => {
                                        const gig = (order as any).gigs
                                        const client = (order as any).profiles
                                        const hoursAgo = Math.floor((Date.now() - new Date(order.created_at).getTime()) / (1000 * 60 * 60))
                                        const isUrgent = hoursAgo >= 20

                                        return (
                                            <div key={order.id} className="p-5 rounded-[1.5rem] border border-white/5 bg-card-item hover:border-indigo-500/30 transition-all shadow-lg hover:shadow-indigo-500/10 group">
                                                <div className="flex flex-col sm:flex-row items-start gap-5">
                                                    {/* Gig Image */}
                                                    <div className="w-full sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-black/40 shrink-0 border border-white/5 relative aspect-video sm:aspect-square">
                                                        {gig?.image_url ? (
                                                            // eslint-disable-next-line @next/next/no-img-element
                                                            <img src={gig.image_url} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center">
                                                                <Mic className="w-6 h-6 text-indigo-400/50" />
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Info */}
                                                    <div className="flex-1 min-w-0 w-full">
                                                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                                            <h4 className="font-bold text-white text-base truncate pr-2">{gig?.title || `Pedido #${order.id.slice(0, 8)}`}</h4>
                                                            <span className={`text-[10px] font-bold px-3 py-1 rounded-full shrink-0 ${isUrgent
                                                                ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                                                : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                                                                }`}>
                                                                {hoursAgo >= 24 ? 'ATRASADO' : isUrgent ? `URGENTE: ${24 - hoursAgo}H` : 'NOVO PEDIDO'}
                                                            </span>
                                                        </div>

                                                        <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
                                                            <span className="font-bold text-slate-300">{client?.full_name || 'Cliente'}</span>
                                                            <span className="w-1 h-1 rounded-full bg-slate-600" />
                                                            <span className="truncate max-w-[200px]">{gig?.description?.slice(0, 40) || 'Leitura de Tarot'}</span>
                                                        </div>

                                                        {/* Actions */}
                                                        <div className="flex items-center gap-3">
                                                            <Button asChild size="sm" className="bg-indigo-600 hover:bg-indigo-500 font-bold text-xs rounded-xl gap-2 h-9 px-5 shadow-lg shadow-indigo-900/20 transition-all hover:scale-105 flex-1 sm:flex-none">
                                                                <Link href={`/dashboard/tarologa/pedido/${order.id}`}>
                                                                    <Zap className="w-3.5 h-3.5" />
                                                                    Responder
                                                                </Link>
                                                            </Button>
                                                            <button className="w-9 h-9 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all">
                                                                <MoreHorizontal className="w-5 h-5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Recent Activity column */}
                        <div className="xl:col-span-2 space-y-6">
                            <h2 className="text-xl font-serif text-white flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-amber-400" />
                                Atividade Recente
                            </h2>

                            <div className="rounded-[2rem] border border-white/5 bg-card-deep/40 backdrop-blur-md divide-y divide-white/5 overflow-hidden">
                                {recentActivity.length === 0 ? (
                                    <div className="p-8 text-center">
                                        <p className="text-sm text-slate-500">Nenhuma atividade recente.</p>
                                    </div>
                                ) : (
                                    recentActivity.map((activity, i) => (
                                        <div key={i} className="p-5 flex items-start gap-4 hover:bg-white/5 transition-colors group">
                                            <div className={`w-10 h-10 rounded-full ${activity.color === 'bg-blue-500' ? 'bg-indigo-500/20' : 'bg-green-500/20'} flex items-center justify-center shrink-0`}>
                                                {activity.type === 'order' ? <Package className="w-5 h-5 text-indigo-400" /> : <CheckCircle2 className="w-5 h-5 text-green-400" />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">{activity.title}</p>
                                                <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{activity.description}</p>
                                                <p className="text-[10px] text-slate-600 font-bold uppercase tracking-wider mt-2">{activity.time}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                                <div className="p-4 text-center bg-white/5">
                                    <Link
                                        href="/dashboard/tarologa/pedidos"
                                        className="text-xs text-indigo-400 hover:text-indigo-300 font-bold uppercase tracking-wider transition-colors inline-block"
                                    >
                                        Ver Histórico Completo
                                    </Link>
                                </div>
                            </div>

                            {/* Total Earned Card */}
                            <div className="p-6 rounded-[2rem] border border-white/5 bg-gradient-to-br from-card-deep to-[#0f0518] text-center relative overflow-hidden group">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <p className="text-xs text-slate-500 uppercase tracking-wider font-bold mb-2">Total Recebido (Vitalício)</p>
                                <p className="text-3xl font-black bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent transform scale-100 group-hover:scale-105 transition-transform duration-500">
                                    R$ {(totalEarnings / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                            </div>

                            {/* CTA Banner */}
                            <div className="p-6 rounded-[2rem] bg-gradient-to-br from-purple-700 to-indigo-800 relative overflow-hidden shadow-xl shadow-purple-900/30">
                                <div className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full bg-white/10 blur-3xl" />
                                <div className="absolute top-0 right-0 p-4 opacity-20">
                                    <Sparkles className="w-12 h-12 text-white" />
                                </div>
                                <h3 className="font-serif text-lg font-bold text-white mb-2 relative z-10">Aumente seu alcance</h3>
                                <p className="text-xs text-purple-100 mb-6 leading-relaxed relative z-10 max-w-[80%]">
                                    Profissionais promovidos recebem em média <strong>3x mais pedidos</strong>. Destaque-se agora.
                                </p>
                                <Button className="bg-white/20 hover:bg-white/30 text-white font-bold text-xs rounded-xl gap-2 backdrop-blur-md h-10 px-6 w-full border border-white/10 relative z-10">
                                    Saiba Mais
                                    <ArrowRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </PageContainer>
            </main>

            {/* Added standard PageContainer closing */}
        </div>
    )
}

function getTimeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins} min atrás`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours} horas atrás`
    const days = Math.floor(hours / 24)
    return days === 1 ? 'Ontem' : `${days} dias atrás`
}
