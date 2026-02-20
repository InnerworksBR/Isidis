import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
    Bell, Sparkles, DollarSign, Clock, ArrowDownToLine,
    HelpCircle, FileText, ExternalLink, CheckCircle2, Loader2, XCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TarologaSidebar } from '@/components/tarologa-sidebar'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageSection } from '@/components/layout/PageSection'
import { WithdrawalModal } from '@/components/withdrawal-modal'
import { NotificationsBell } from '@/components/notifications-bell'
import { getWalletBalances } from '@/app/actions/finance'

const PLATFORM_FEE_PERCENT = 15

export default async function WalletPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login?next=/dashboard/tarologa/carteira')
    }

    // Fetch profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, specialties, pix_key, pix_key_type')
        .eq('id', user.id)
        .single()

    // Fetch wallet
    const { data: wallet } = await supabase
        .from('wallets')
        .select('id')
        .eq('user_id', user.id)
        .single()

    let totalEarnings = 0
    let pendingBalance = 0
    let availableBalance = 0
    type Transaction = {
        id: string
        amount: number
        status: string
        type: string
        order_id: string | null
        external_id: string | null
        created_at: string
    }
    let transactions: Transaction[] = []

    if (wallet) {
        const { data: txns } = await supabase
            .from('transactions')
            .select('id, amount, status, type, order_id, external_id, created_at')
            .eq('wallet_id', wallet.id)
            .order('created_at', { ascending: false })

        transactions = txns || []

        const balances = await getWalletBalances(wallet.id)
        totalEarnings = balances.totalEarnings
        pendingBalance = balances.pendingBalance
        availableBalance = balances.availableBalance
    }

    // Fetch orders to get transaction details (gig title, client name)
    const orderIds = transactions
        .filter(t => t.order_id)
        .map(t => t.order_id!)

    const orderDetails: Record<string, { gigTitle: string; clientName: string; amountTotal: number; amountFee: number; amountNet: number }> = {}

    if (orderIds.length > 0) {
        const { data: orders } = await supabase
            .from('orders')
            .select('id, amount_total, amount_platform_fee, amount_reader_net, gigs(title), profiles!orders_client_id_fkey(full_name)')
            .in('id', orderIds)

        if (orders) {
            orders.forEach((o: any) => {
                orderDetails[o.id] = {
                    gigTitle: o.gigs?.title || 'Leitura de Tarot',
                    clientName: o.profiles?.full_name || 'Cliente',
                    amountTotal: o.amount_total,
                    amountFee: o.amount_platform_fee,
                    amountNet: o.amount_reader_net,
                }
            })
        }
    }

    const saleTransactions = transactions.filter(t => t.type === 'SALE_CREDIT')
    const withdrawalTransactions = transactions.filter(t => t.type === 'WITHDRAWAL')
    const firstName = profile?.full_name?.split(' ')[0] || 'Taróloga'


    const pixKeyMasked = profile?.pix_key
        ? `${profile.pix_key.slice(0, 3)}***${profile.pix_key.slice(-3)}`
        : null

    const fmt = (cents: number) =>
        (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })

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
                                <h1 className="text-3xl font-bold text-white mb-2">Carteira e Saques</h1>
                                <p className="text-sm text-slate-400">Gerencie seus ganhos e saques via PIX</p>
                            </div>
                            <div className="flex flex-col sm:flex-row items-center gap-3">
                                <Link
                                    href="/dashboard/tarologa/perfil"
                                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-sm text-slate-300 hover:text-white hover:border-indigo-500/30 transition-all backdrop-blur-sm"
                                >
                                    <DollarSign className="w-4 h-4" />
                                    {pixKeyMasked ? `PIX: ${pixKeyMasked}` : 'Adicionar Chave PIX'}
                                </Link>
                                <div className="hidden sm:block relative z-50">
                                    <NotificationsBell currentUserId={user.id} />
                                </div>
                            </div>
                        </div>
                    </PageSection>

                    {/* ──── Financial Cards ──── */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
                        {/* Total Earnings */}
                        <div className="p-6 rounded-2xl border border-white/10 bg-card-item relative overflow-hidden group hover:border-indigo-500/20 transition-all">
                            <div className="absolute -bottom-8 -right-8 w-28 h-28 rounded-full bg-indigo-500/5 group-hover:bg-indigo-500/10 transition-all" />
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center">
                                    <DollarSign className="w-4 h-4 text-slate-400" />
                                </div>
                                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Total</span>
                            </div>
                            <p className="text-xs text-slate-500">Ganhos Totais</p>
                            <p className="text-2xl font-black text-white mt-1">R$ {fmt(totalEarnings)}</p>
                        </div>

                        {/* Pending Balance */}
                        <div className="p-6 rounded-2xl border border-amber-500/15 bg-card-item relative overflow-hidden group hover:border-amber-500/25 transition-all">
                            <div className="absolute -bottom-8 -right-8 w-28 h-28 rounded-full bg-amber-500/5 group-hover:bg-amber-500/10 transition-all" />
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-9 h-9 rounded-lg bg-amber-900/30 flex items-center justify-center">
                                    <Clock className="w-4 h-4 text-amber-400" />
                                </div>
                                <span className="text-[10px] uppercase tracking-wider text-amber-500/70 font-bold">Processando</span>
                            </div>
                            <p className="text-xs text-slate-500">Saldo Pendente</p>
                            <p className="text-2xl font-black text-white mt-1">R$ {fmt(pendingBalance)}</p>
                            {pendingBalance > 0 && (
                                <p className="text-[10px] text-slate-600 mt-2 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                                    Libera 48h após a entrega
                                </p>
                            )}
                        </div>

                        {/* Available to Withdraw */}
                        <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-700 relative overflow-hidden shadow-lg shadow-purple-900/20">
                            <div className="absolute -bottom-8 -right-8 w-28 h-28 rounded-full bg-white/5" />
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
                                    <ArrowDownToLine className="w-4 h-4 text-white" />
                                </div>
                                <span className="text-[10px] uppercase tracking-wider text-indigo-200 font-bold">Saque</span>
                            </div>
                            <p className="text-xs text-indigo-200">Disponível para Saque</p>
                            <p className="text-2xl font-black text-white mt-1">R$ {fmt(availableBalance)}</p>
                            <WithdrawalModal
                                availableBalance={availableBalance}
                                pixKey={profile?.pix_key || null}
                                pixKeyType={profile?.pix_key_type || 'CPF'}
                            >
                                <Button className="mt-4 bg-white/15 hover:bg-white/25 text-white font-bold text-xs rounded-lg gap-2 w-full h-9 backdrop-blur-sm border border-white/10">
                                    <Sparkles className="w-3.5 h-3.5" />
                                    Sacar via PIX
                                </Button>
                            </WithdrawalModal>
                        </div>
                    </div>

                    {/* ──── Ledger + Payouts ──── */}
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                        {/* Transaction Ledger (3 cols) */}
                        <div className="col-span-1 lg:col-span-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-indigo-400" />
                                    Extrato de Transações
                                </h2>
                                <div className="flex items-center gap-1 bg-card-item border border-white/10 rounded-lg p-0.5 w-fit">
                                    <button className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-indigo-500/15 text-indigo-300">Tudo</button>
                                    <button className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md text-slate-500 hover:text-slate-300">Ganhos</button>
                                    <button className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md text-slate-500 hover:text-slate-300">Taxas</button>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-white/10 bg-card-item overflow-hidden">
                                {/* Table Header */}
                                <div className="hidden sm:grid grid-cols-5 gap-4 px-6 py-3 border-b border-white/10 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                    <span className="col-span-2">Data / Serviço / Cliente</span>
                                    <span>Bruto</span>
                                    <span>Taxa ({PLATFORM_FEE_PERCENT}%)</span>
                                    <span className="text-right">Líquido</span>
                                </div>

                                {/* Table Body */}
                                {saleTransactions.length === 0 ? (
                                    <div className="p-10 text-center">
                                        <DollarSign className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                                        <p className="text-sm text-slate-500">Nenhuma transação ainda.</p>
                                        <p className="text-xs text-slate-600 mt-1">Seus ganhos aparecerão aqui.</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-white/5">
                                        {saleTransactions.slice(0, 10).map((t) => {
                                            const detail = t.order_id ? orderDetails[t.order_id] : null
                                            const gross = detail?.amountTotal || t.amount
                                            const fee = detail?.amountFee || Math.round(gross * PLATFORM_FEE_PERCENT / 100)
                                            const net = detail?.amountNet || t.amount

                                            return (
                                                <div key={t.id} className="grid grid-cols-1 sm:grid-cols-5 gap-2 sm:gap-4 px-4 sm:px-6 py-4 items-start sm:items-center hover:bg-white/5 transition-colors">
                                                    <div className="col-span-1 sm:col-span-2">
                                                        <div className="flex justify-between sm:block">
                                                            <p className="text-sm font-bold text-white truncate max-w-[200px] sm:max-w-none">
                                                                {detail?.gigTitle || 'Leitura'}
                                                            </p>
                                                            <span className="sm:hidden text-green-400 font-bold text-sm">R$ {fmt(net)}</span>
                                                        </div>
                                                        <p className="text-xs sm:text-[10px] text-slate-500">
                                                            {new Date(t.created_at).toLocaleDateString('pt-BR')} • {new Date(t.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                        <p className="text-xs sm:text-[10px] text-slate-400 mt-0.5">
                                                            Cliente: {detail?.clientName || '—'}
                                                        </p>
                                                    </div>

                                                    {/* Mobile details hidden, shown in simplified view above */}
                                                    <div className="hidden sm:block">
                                                        <p className="text-sm text-slate-300">R$ {fmt(gross)}</p>
                                                    </div>
                                                    <div className="hidden sm:block">
                                                        <p className="text-sm text-red-400">- R$ {fmt(fee)}</p>
                                                    </div>
                                                    <div className="hidden sm:block text-right">
                                                        <p className="text-sm font-bold text-green-400">R$ {fmt(net)}</p>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}

                                {saleTransactions.length > 10 && (
                                    <div className="p-4 text-center border-t border-white/10">
                                        <button className="text-xs text-indigo-400 hover:text-indigo-300 font-medium">
                                            Carregar mais transações
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Payout History (2 cols) */}
                        <div className="col-span-1 lg:col-span-2">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                    <ArrowDownToLine className="w-5 h-5 text-purple-400" />
                                    Histórico de Saques
                                </h2>
                            </div>

                            <div className="rounded-2xl border border-white/10 bg-card-item divide-y divide-white/5">
                                {withdrawalTransactions.length === 0 ? (
                                    <div className="p-8 text-center">
                                        <ArrowDownToLine className="w-8 h-8 text-slate-700 mx-auto mb-3" />
                                        <p className="text-xs text-slate-500">Nenhum saque realizado.</p>
                                        <p className="text-[10px] text-slate-600 mt-1">Seus saques aparecerão aqui.</p>
                                    </div>
                                ) : (
                                    withdrawalTransactions.slice(0, 6).map((t) => {
                                        const statusMap: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
                                            COMPLETED: { label: 'SUCESSO', color: 'bg-green-500/10 text-green-400 border-green-500/20', icon: CheckCircle2 },
                                            PENDING: { label: 'PROCESSANDO', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: Loader2 },
                                            FAILED: { label: 'FALHA', color: 'bg-red-500/10 text-red-400 border-red-500/20', icon: XCircle },
                                        }
                                        const info = statusMap[t.status] || statusMap.PENDING

                                        return (
                                            <div key={t.id} className="p-4 flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${t.status === 'COMPLETED' ? 'bg-green-500/15' :
                                                    t.status === 'FAILED' ? 'bg-red-500/15' : 'bg-amber-500/15'
                                                    }`}>
                                                    <info.icon className={`w-4 h-4 ${t.status === 'COMPLETED' ? 'text-green-400' :
                                                        t.status === 'FAILED' ? 'text-red-400' : 'text-amber-400'
                                                        }`} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-white">
                                                        R$ {fmt(Math.abs(t.amount))}
                                                    </p>
                                                    <p className="text-[10px] text-slate-600">
                                                        {new Date(t.created_at).toLocaleDateString('pt-BR')} • PIX: ***{profile?.pix_key?.slice(-3) || '***'}
                                                    </p>
                                                </div>
                                                <span className={`text-[9px] font-bold px-2 py-1 rounded-full border ${info.color}`}>
                                                    {info.label}
                                                </span>
                                            </div>
                                        )
                                    })
                                )}

                                <div className="p-3 text-center">
                                    <button className="text-xs text-indigo-400 hover:text-indigo-300 font-medium">
                                        Baixar Extrato (PDF)
                                    </button>
                                </div>
                            </div>

                            {/* Help Center CTA */}
                            <div className="mt-4 p-5 rounded-2xl border border-white/10 bg-card-item">
                                <div className="flex items-center gap-2 mb-2">
                                    <HelpCircle className="w-4 h-4 text-purple-400" />
                                    <h3 className="text-sm font-bold text-white">Ajuda</h3>
                                </div>
                                <p className="text-xs text-slate-500 leading-relaxed mb-3">
                                    Dúvidas sobre taxas da plataforma ou prazos de saque? Consulte nosso guia profissional.
                                </p>
                                <Button className="w-full bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 font-bold text-xs rounded-lg gap-2 h-9 border border-indigo-500/20">
                                    <ExternalLink className="w-3.5 h-3.5" />
                                    Ler FAQ
                                </Button>
                            </div>
                        </div>
                    </div>
                </PageContainer>
            </main>
        </div>
    )
}
