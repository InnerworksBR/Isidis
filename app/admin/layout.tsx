import { Manrope } from "next/font/google";
import "@/app/globals.css";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { LayoutDashboard, Users, Sparkles, DollarSign, LogOut, CheckCircle2, LifeBuoy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-sans" });

export default async function AdminLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const supabase = await createClient();

    // Double check auth here just in case, though middleware handles it
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    return (
        <div className={cn("min-h-screen bg-background font-sans antialiased flex", manrope.variable)}>
            {/* Sidebar */}
            <aside className="w-64 border-r border-border bg-card/50 backdrop-blur-xl hidden md:flex flex-col">
                <div className="p-6 border-b border-border/50">
                    <Link href="/admin" className="flex items-center gap-2">
                        <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400">
                            Isidis Admin
                        </span>
                    </Link>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    <Link href="/admin" className="flex items-center gap-3 px-4 py-3 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-all">
                        <LayoutDashboard className="w-5 h-5" />
                        Dashboard
                    </Link>
                    <Link href="/admin/users" className="flex items-center gap-3 px-4 py-3 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-all">
                        <Users className="w-5 h-5" />
                        Usuários
                    </Link>
                    <Link href="/admin/gigs" className="flex items-center gap-3 px-4 py-3 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-all">
                        <Sparkles className="w-5 h-5" />
                        Gigs & Aprovação
                    </Link>
                    <Link href="/admin/approvals" className="flex items-center gap-3 px-4 py-3 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-all">
                        <CheckCircle2 className="w-5 h-5" />
                        Aprovações (New)
                    </Link>
                    <Link href="/admin/financials" className="flex items-center gap-3 px-4 py-3 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-all">
                        <DollarSign className="w-5 h-5" />
                        Financeiro
                    </Link>
                    <Link href="/admin/tickets" className="flex items-center gap-3 px-4 py-3 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-all">
                        <LifeBuoy className="w-5 h-5" />
                        Tickets Suporte
                    </Link>
                </nav>

                <div className="p-4 border-t border-border/50">
                    <form action="/auth/signout" method="post">
                        <button className="flex items-center gap-3 px-4 py-3 w-full text-red-400 hover:text-red-300 hover:bg-red-900/10 rounded-xl transition-all">
                            <LogOut className="w-5 h-5" />
                            Sair
                        </button>
                    </form>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
                <header className="h-16 border-b border-border flex items-center justify-between px-6 bg-card/30 backdrop-blur-md">
                    <h1 className="text-lg font-semibold text-foreground">Painel Administrativo</h1>
                    <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                            A
                        </div>
                    </div>
                </header>
                <div className="flex-1 overflow-y-auto p-6">
                    {children}
                </div>
            </main>
        </div>
    );
}
