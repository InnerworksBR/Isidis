import { getTicketWithMessages } from '@/app/actions/tickets'
import { TicketChat } from '@/components/tickets/ticket-chat'
import { AdminStatusUpdate } from '@/components/tickets/admin-status-update'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, Clock, Info, User, Mail, LifeBuoy } from 'lucide-react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

const statusMap: Record<string, { label: string, color: string }> = {
    'OPEN': { label: 'Aberto', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
    'IN_PROGRESS': { label: 'Em Atendimento', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
    'RESOLVED': { label: 'Resolvido', color: 'bg-green-500/10 text-green-500 border-green-500/20' },
    'CLOSED': { label: 'Fechado', color: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
}

const categoryMap: Record<string, string> = {
    'REEMBOLSO': 'Reembolso',
    'SAQUE': 'Saque',
    'MUDANCA_PIX': 'Mudança de Pix',
    'DUVIDA': 'Dúvida',
    'OUTRO': 'Outro',
}

export default async function AdminTicketDetailPage({ params }: { params: { id: string } }) {
    const { id } = await params
    const ticket = await getTicketWithMessages(id)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'ADMIN') {
        redirect('/')
    }

    if (!ticket) {
        notFound()
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link
                    href="/admin/tickets"
                    className="p-2 rounded-full hover:bg-muted transition-colors"
                >
                    <ChevronLeft className="w-6 h-6" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-3">
                        {ticket.subject}
                        <Badge variant="outline" className={statusMap[ticket.status].color}>
                            {statusMap[ticket.status].label}
                        </Badge>
                    </h1>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                        Ticket #{ticket.id.substring(0, 8)} • Atendimento Administrativo
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <TicketChat
                        ticketId={ticket.id}
                        initialMessages={ticket.messages}
                        currentUserId={user.id}
                    />
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Info className="w-4 h-4 text-primary" />
                                Informações do Usuário
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                                    <User className="w-5 h-5 text-muted-foreground" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium">{ticket.user?.full_name || 'Usuário'}</p>
                                    <p className="text-xs text-muted-foreground">{ticket.user?.role === 'READER' ? 'Taróloga' : 'Cliente'}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <LifeBuoy className="w-4 h-4 text-primary" />
                                Gerenciar Ticket
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                                    Categoria
                                </p>
                                <p className="text-sm font-medium">
                                    {categoryMap[ticket.category]}
                                </p>
                            </div>

                            <AdminStatusUpdate
                                ticketId={ticket.id}
                                currentStatus={ticket.status}
                            />

                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                                    Prioridade
                                </p>
                                <p className="text-sm font-medium">
                                    {ticket.priority === 'LOW' && 'Baixa'}
                                    {ticket.priority === 'MEDIUM' && 'Média'}
                                    {ticket.priority === 'HIGH' && 'Alta'}
                                    {ticket.priority === 'URGENT' && 'Urgente'}
                                </p>
                            </div>

                            <div className="space-y-1 pt-4 border-t border-border/50">
                                <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                                    Aberto em
                                </p>
                                <p className="text-sm flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-muted-foreground" />
                                    {format(new Date(ticket.created_at), "d 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
