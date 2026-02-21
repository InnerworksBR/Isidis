import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { signout } from '@/app/auth/actions'
import { LayoutDashboard, LogOut, Sparkles, User, Moon } from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export async function Navbar() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const role = user?.user_metadata?.role

    return (
        <nav className="border-b border-border/50 glass-strong sticky top-0 z-50">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 group">
                    <img src="/logo.png" alt="Isidis Logo" className="w-10 h-10 object-contain transition-transform duration-300 group-hover:scale-110" />
                    <span className="text-xl font-bold text-gradient-primary tracking-tight">Isidis</span>
                </Link>

                {/* Nav Links */}
                <div className="flex items-center gap-1">
                    <Link
                        href="/tarologas"
                        className="nav-link text-sm font-medium px-4 py-2 rounded-lg hover:bg-primary/5 text-muted-foreground hover:text-foreground"
                    >
                        Tarólogas
                    </Link>

                    {user ? (
                        <div className="flex items-center gap-2">
                            {/* Show relevant dashboard link based on role */}
                            {role === 'READER' ? (
                                <Button variant="ghost" size="sm" asChild className="hidden md:flex text-muted-foreground hover:text-foreground">
                                    <Link href="/dashboard/tarologa" className="nav-link">Meu Painel</Link>
                                </Button>
                            ) : (
                                <Button variant="ghost" size="sm" asChild className="hidden md:flex text-muted-foreground hover:text-foreground">
                                    <Link href="/dashboard/minhas-tiragens" className="nav-link">Minhas Leituras</Link>
                                </Button>
                            )}

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Avatar className="cursor-pointer h-9 w-9 border-2 border-transparent hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/20">
                                        <AvatarImage src={user.user_metadata?.avatar_url} />
                                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                                            {user.email?.substring(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56 glass-strong border-border/50">
                                    <DropdownMenuLabel>
                                        <div className="flex flex-col space-y-1">
                                            <p className="text-sm font-bold">{user.user_metadata?.full_name || 'Minha Conta'}</p>
                                            <p className="text-xs text-muted-foreground">{user.email}</p>
                                            {role && (
                                                <span className="text-[10px] uppercase tracking-widest text-primary font-bold mt-1">
                                                    {role === 'READER' ? '✨ Taróloga' : '🔮 Consulente'}
                                                </span>
                                            )}
                                        </div>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator className="bg-border/50" />

                                    {role === 'READER' ? (
                                        <>
                                            <DropdownMenuItem asChild>
                                                <Link href="/dashboard/tarologa" className="cursor-pointer">
                                                    <LayoutDashboard className="mr-2 h-4 w-4" />
                                                    Painel Profissional
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem asChild>
                                                <Link href="/dashboard/tarologa/gigs" className="cursor-pointer">
                                                    <Moon className="mr-2 h-4 w-4" />
                                                    Meus Serviços
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem asChild>
                                                <Link href="/dashboard/tarologa/perfil" className="cursor-pointer">
                                                    <User className="mr-2 h-4 w-4" />
                                                    Editar Perfil
                                                </Link>
                                            </DropdownMenuItem>
                                        </>
                                    ) : (
                                        <>
                                            <DropdownMenuItem asChild>
                                                <Link href="/dashboard/minhas-tiragens" className="cursor-pointer">
                                                    <LayoutDashboard className="mr-2 h-4 w-4" />
                                                    Minhas Leituras
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem asChild>
                                                <Link href="/dashboard/perfil" className="cursor-pointer">
                                                    <User className="mr-2 h-4 w-4" />
                                                    Meu Perfil
                                                </Link>
                                            </DropdownMenuItem>
                                        </>
                                    )}

                                    <DropdownMenuSeparator className="bg-border/50" />
                                    <DropdownMenuItem className="text-red-400 focus:text-red-400 cursor-pointer focus:bg-red-500/10">
                                        <form action={signout} className="w-full">
                                            <button className="flex items-center w-full">
                                                <LogOut className="mr-2 h-4 w-4" />
                                                Sair
                                            </button>
                                        </form>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 ml-2">
                            <Button variant="ghost" size="sm" asChild className="font-medium text-muted-foreground hover:text-foreground">
                                <Link href="/login">Entrar</Link>
                            </Button>
                            <Button size="sm" asChild className="font-bold rounded-xl px-5">
                                <Link href="/register">Criar Conta</Link>
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
}
