import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, Sparkles, DollarSign, Activity } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAdminFinancials } from "@/app/actions/admin-financials";
import { formatCurrency } from "@/lib/utils";
import { supabaseAdmin } from "@/lib/supabase/admin";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
    const supabase = await createClient();

    // Fetch KPIs
    const { count: userCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    const { count: readerCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'READER');
    const { count: gigCount } = await supabase.from('gigs').select('*', { count: 'exact', head: true });
    const { count: pendingGigsCount } = await supabase.from('gigs').select('*', { count: 'exact', head: true }).eq('status', 'PENDING');
    const { count: orderCount } = await supabase.from('orders').select('*', { count: 'exact', head: true });

    // Real financial data
    const { data: financialData } = await getAdminFinancials();

    // Recent Users
    const { data: { users: authUsers } } = await supabaseAdmin.auth.admin.listUsers();
    const { data: profiles } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(5);

    const recentUsers = profiles?.map(profile => {
        const authUser = authUsers?.find(u => u.id === profile.id);
        return {
            id: profile.id,
            email: authUser?.email || "Sem email",
            full_name: profile.full_name,
            role: profile.role,
            created_at: profile.created_at
        };
    }) || [];

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

            <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Usuários Recentes</CardTitle>
                        <CardDescription>Últimos 5 usuários cadastrados.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-4">
                            {recentUsers.map(user => (
                                <li key={user.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-4 last:border-0 last:pb-0">
                                    <div className="flex flex-col min-w-0">
                                        <Link href={`/admin/users/${user.id}`} className="font-medium hover:underline truncate">
                                            {user.full_name || 'Usuário'}
                                        </Link>
                                        <span className="text-sm text-muted-foreground truncate">{user.email}</span>
                                    </div>
                                    <Badge variant="outline" className="w-fit">{user.role}</Badge>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>

                <Card className="border-border/50 bg-card-deep">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <DollarSign className="h-5 w-5 text-violet-400" />
                            Vendas Recentes
                        </CardTitle>
                        <CardDescription>As últimas 5 transações na plataforma.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-4">
                            {financialData?.recentOrders.slice(0, 5).map((order: any) => (
                                <li key={order.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-4 last:border-0 last:pb-0">
                                    <div className="flex flex-col min-w-0">
                                        <span className="font-medium truncate">{order.gig_title}</span>
                                        <span className="text-sm text-muted-foreground truncate">
                                            {order.client_name} → {order.reader_name}
                                        </span>
                                    </div>
                                    <div className="flex flex-col sm:items-end">
                                        <span className="font-bold text-green-400">{formatCurrency(order.amount_total)}</span>
                                        <span className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</span>
                                    </div>
                                </li>
                            ))}
                            {!financialData?.recentOrders?.length && (
                                <li className="text-center text-muted-foreground py-4">Nenhuma venda recente</li>
                            )}
                        </ul>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
