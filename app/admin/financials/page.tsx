'use client'

import { useEffect, useState } from 'react'
import { getAdminFinancials, FinancialSummary } from '@/app/actions/admin-financials'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import { DollarSign, ArrowUpRight, ArrowDownLeft, Activity } from 'lucide-react'
import { toast } from 'sonner'

export default function AdminFinancialsPage() {
    const [data, setData] = useState<FinancialSummary | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function load() {
            try {
                const { data, error } = await getAdminFinancials()
                if (error) throw new Error(error)
                if (data) setData(data)
            } catch (err) {
                toast.error('Erro ao carregar dados financeiros')
                console.error(err)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    if (loading) {
        return <div className="p-8 text-center text-muted-foreground animate-pulse">Carregando financeiro...</div>
    }

    if (!data) return null

    return (
        <div className="space-y-8 animate-fade-in-up">
            <div>
                <h2 className="text-3xl font-bold tracking-tight">Financeiro</h2>
                <p className="text-muted-foreground">Visão geral das receitas e movimentações da plataforma.</p>
            </div>

            {/* KPIs */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-card-deep border-border/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Receita Bruta (Vendas)</CardTitle>
                        <DollarSign className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-400">{formatCurrency(data.totalRevenue)}</div>
                        <p className="text-xs text-muted-foreground">+20.1% em relação ao mês anterior</p>
                    </CardContent>
                </Card>

                <Card className="bg-card-deep border-border/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Saques Pagos</CardTitle>
                        <ArrowUpRight className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-400">{formatCurrency(data.totalWithdrawn)}</div>
                        <p className="text-xs text-muted-foreground">Fluxo de saída para tarólogas</p>
                    </CardContent>
                </Card>

                <Card className="bg-card-deep border-border/50">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Fluxo de Caixa (Net)</CardTitle>
                        <Activity className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-400">{formatCurrency(data.netRevenue)}</div>
                        <p className="text-xs text-muted-foreground">Saldo retido no sistema</p>
                    </CardContent>
                </Card>
            </div>

            {/* Transactions List */}
            <Card className="bg-card-deep border-border/50">
                <CardHeader>
                    <CardTitle>Transações Recentes</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {data.recentTransactions.map((tx) => (
                            <div key={tx.id} className="flex items-center justify-between p-4 rounded-lg bg-card/50 border border-border/50 hover:bg-card/80 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className={`p-2 rounded-full ${tx.type === 'SALE_CREDIT' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                                        {tx.type === 'SALE_CREDIT' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm text-foreground">{tx.user.full_name}</p>
                                        <p className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleDateString()} às {new Date(tx.created_at).toLocaleTimeString()}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className={`font-bold ${tx.type === 'SALE_CREDIT' ? 'text-green-400' : 'text-red-400'}`}>
                                        {tx.type === 'SALE_CREDIT' ? '+' : '-'}{formatCurrency(Math.abs(tx.amount))}
                                    </div>
                                    <Badge variant="outline" className="text-[10px] mt-1 border-border/50 bg-background/50">
                                        {tx.status === 'COMPLETED' ? 'CONCLUÍDO' : tx.status === 'PENDING' ? 'PENDENTE' : 'FALHA'}
                                    </Badge>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
