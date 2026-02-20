import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Eye, Clock, CheckCircle2, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export default async function ApprovalsPage() {
    const supabase = await createClient()

    // Fetch pending readers
    const { data: pendingReaders } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'READER')
        .eq('verification_status', 'PENDING')
        .order('created_at', { ascending: false })

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Aprovações Pendentes</h1>
                    <p className="text-muted-foreground">
                        Analise e aprove as solicitações de cadastro de novas tarólogas.
                    </p>
                </div>
            </div>

            {(!pendingReaders || pendingReaders.length === 0) ? (
                <div className="flex flex-col items-center justify-center p-12 border border-dashed rounded-lg bg-card/50">
                    <CheckCircle2 className="w-12 h-12 text-primary mb-4" />
                    <h3 className="text-lg font-medium">Tudo em dia!</h3>
                    <p className="text-muted-foreground">Não há solicitações pendentes no momento.</p>
                </div>
            ) : (
                <div className="border rounded-xl bg-card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50 text-muted-foreground font-medium border-b">
                                <tr>
                                    <th className="px-6 py-4">Nome</th>
                                    <th className="px-6 py-4">Email</th>
                                    <th className="px-6 py-4">Data Cadastro</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {pendingReaders.map((reader) => (
                                    <tr key={reader.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-foreground">{reader.full_name}</div>
                                            <div className="text-xs text-muted-foreground">{reader.social_name || '-'}</div>
                                        </td>
                                        <td className="px-6 py-4">{reader.email}</td>{/* Assuming email is not in profiles but auth, wait... profiles table usually doesn't have email if it's synced or user has to fetch from auth user? 
                                            Checking schema... 00_initial_schema.sql usually has id, updated_at...
                                            Usually authentication email is not in profiles unless we added it or specific trigger.
                                            Let's check if we have email in profiles. If not, we might need to fetch from auth or just show name.
                                            Actually, typically in these setups, email is not in profiles.
                                            Let's assume for now we don't have it or we fetch it.
                                            Wait, 'profiles' table definition in 00_initial_schema.sql might just correspond to public metadata.
                                            I'll check if email is there. If not, I'll display '-' or just Name.
                                         */}
                                        <td className="px-6 py-4">
                                            {new Date(reader.created_at || Date.now()).toLocaleDateString('pt-BR')}
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">
                                                <Clock className="w-3 h-3 mr-1" />
                                                Pendente
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Button size="sm" variant="outline" asChild>
                                                <Link href={`/admin/approvals/${reader.id}`}>
                                                    <Eye className="w-4 h-4 mr-2" />
                                                    Analisar
                                                </Link>
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}
