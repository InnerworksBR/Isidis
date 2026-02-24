import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default async function AdminUsersPage() {
    // We use the admin client to list all users from auth
    const { data: { users: authUsers }, error: authError } = await supabaseAdmin.auth.admin.listUsers();

    // We still fetch profiles for profile-specific data (role, full_name, etc.)
    const supabase = await createClient();
    const { data: profiles } = await supabase
        .from('profiles')
        .select('*');

    // Merge users and profiles
    const users = (authUsers || []).map(authUser => {
        const profile = profiles?.find(p => p.id === authUser.id);
        return {
            id: authUser.id,
            email: authUser.email,
            full_name: profile?.full_name || authUser.user_metadata?.full_name,
            avatar_url: profile?.avatar_url,
            role: profile?.role || authUser.user_metadata?.role || 'CLIENT',
            created_at: authUser.created_at,
            has_profile: !!profile
        };
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">Gerenciar Usuários</h2>

            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Usuário</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Cadastro</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.map((user) => (
                            <TableRow key={user.id}>
                                <TableCell className="flex items-center gap-3">
                                    <Avatar>
                                        <AvatarImage src={user.avatar_url || ''} />
                                        <AvatarFallback>{user.full_name?.slice(0, 2).toUpperCase() || 'U'}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col">
                                        <span className="font-medium">{user.full_name || 'Sem nome'}</span>
                                        <span className="text-xs text-muted-foreground font-mono">{user.id}</span>
                                    </div>
                                </TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>
                                    <Badge variant={user.role === 'ADMIN' ? 'destructive' : user.role === 'READER' ? 'default' : 'secondary'}>
                                        {user.role}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {new Date(user.created_at).toLocaleDateString('pt-BR')}
                                </TableCell>
                                <TableCell>
                                    {!user.has_profile ? (
                                        <Badge variant="outline" className="text-amber-500 border-amber-500/50">
                                            Sem perfil
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="text-green-500 border-green-500/50">
                                            OK
                                        </Badge>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
