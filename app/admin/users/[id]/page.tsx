import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { notFound, redirect } from "next/navigation";
import AdminUserEditForm from "./edit-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function AdminUserEditPage({ params }: { params: { id: string } }) {
    const { id } = await params;

    // Check if user is logged in
    const supabase = await createClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) redirect('/login');

    // Fetch user details
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .single();

    const { data: authUserReq } = await supabaseAdmin.auth.admin.getUserById(id);
    const authUser = authUserReq?.user;

    if (!authUser && !profile) {
        return notFound();
    }

    const userData = {
        id: id,
        email: authUser?.email,
        full_name: profile?.full_name || authUser?.user_metadata?.full_name || "",
        role: profile?.role || authUser?.user_metadata?.role || "CLIENT",
        bio: profile?.bio || "",
        avatar_url: profile?.avatar_url || "",
        cellphone: profile?.cellphone || "",
        tax_id: profile?.tax_id || "",
        cpf_cnpj: profile?.cpf_cnpj || "",
        pix_key_type: profile?.pix_key_type || "",
        pix_key: profile?.pix_key || ""
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild>
                    <Link href="/admin/users">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Editar Usuário</h2>
                    <p className="text-muted-foreground">ID: <span className="font-mono text-xs">{id}</span></p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Informações do Perfil</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <AdminUserEditForm user={userData} />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
