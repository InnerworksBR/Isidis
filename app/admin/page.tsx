
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Sparkles, DollarSign, Activity } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAdminFinancials } from "@/app/actions/admin-financials";
import { formatCurrency } from "@/lib/utils";

export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
    const supabase = await createClient();

    // Fetch KPIs (simplified for now, ideally count queries)
    // Note: count entries is efficient in Postgres
    const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    // Cartomantes
    const { count: readerCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'READER');
    // Gigs
    const { count: gigCount } = await supabase.from('gigs').select('*', { count: 'exact', head: true });
    // Pending Gigs
    const { count: pendingGigsCount } = await supabase.from('gigs').select('*', { count: 'exact', head: true }).eq('status', 'PENDING');

    const { count: orderCount } = await supabase.from('orders').select('*', { count: 'exact', head: true });

    // Real financial data
    const { data: financialData } = await getAdminFinancials();

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{userCount || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            {readerCount || 0} são cartomantes
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Gigs Ativos</CardTitle>
                        <Sparkles className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{gigCount || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            {pendingGigsCount || 0} pendentes de aprovação
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Vendas Realizadas</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{orderCount || 0}</div>
                        <p className="text-xs text-muted-foreground">
                            Pedidos totais
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Receita Estimada</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-400">
                            {financialData ? formatCurrency(financialData.platformFee) : 'R$ 0,00'}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Lucro da plataforma
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
