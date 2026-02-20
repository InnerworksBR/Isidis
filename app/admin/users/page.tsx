import { createClient } from "@/lib/supabase/server";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default async function AdminUsersPage() {
    const supabase = await createClient();

    const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">Gerenciar Usuários</h2>

            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Usuário</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Cadastro</TableHead>
                            <TableHead>ID</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {profiles?.map((profile) => (
                            <TableRow key={profile.id}>
                                <TableCell className="flex items-center gap-3">
                                    <Avatar>
                                        <AvatarImage src={profile.avatar_url || ''} />
                                        <AvatarFallback>{profile.full_name?.slice(0, 2).toUpperCase() || 'U'}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col">
                                        <span className="font-medium">{profile.full_name || 'Sem nome'}</span>
                                        {/* Email is in auth.users, difficult to fetch in one go without admin join. 
                                            For now showing basic profile info. */}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={profile.role === 'ADMIN' ? 'destructive' : profile.role === 'READER' ? 'default' : 'secondary'}>
                                        {profile.role}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {new Date(profile.created_at).toLocaleDateString('pt-BR')}
                                </TableCell>
                                <TableCell className="font-mono text-xs text-muted-foreground">
                                    {profile.id}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
