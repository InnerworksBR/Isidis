import Link from 'next/link'
import { Sparkles } from 'lucide-react'

export function Footer() {
    return (
        <footer className="border-t border-border/50 bg-card/30 mt-auto">
            <div className="container mx-auto px-4 py-12">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* Brand */}
                    <div className="md:col-span-1">
                        <Link href="/" className="flex items-center gap-2 mb-4">
                            <img src="/logo.png" alt="Isidis Logo" className="w-8 h-8 object-contain" />
                            <span className="text-lg font-bold text-gradient-primary">Isidis</span>
                        </Link>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Conectando você ao universo através de leituras espirituais personalizadas.
                        </p>
                    </div>

                    {/* Links */}
                    <div>
                        <h4 className="text-sm font-bold uppercase tracking-wider mb-4 text-foreground">Plataforma</h4>
                        <ul className="space-y-2.5">
                            <li><Link href="/tarologas" className="text-sm text-muted-foreground hover:text-primary transition-colors">Explorar Tarólogas</Link></li>
                            <li><Link href="/register" className="text-sm text-muted-foreground hover:text-primary transition-colors">Criar Conta</Link></li>
                            <li><Link href="/login" className="text-sm text-muted-foreground hover:text-primary transition-colors">Entrar</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-sm font-bold uppercase tracking-wider mb-4 text-foreground">Para Tarólogas</h4>
                        <ul className="space-y-2.5">
                            <li><Link href="/register" className="text-sm text-muted-foreground hover:text-primary transition-colors">Cadastrar-se</Link></li>
                            <li><Link href="/dashboard/tarologa" className="text-sm text-muted-foreground hover:text-primary transition-colors">Painel Profissional</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-sm font-bold uppercase tracking-wider mb-4 text-foreground">Legal</h4>
                        <ul className="space-y-2.5">
                            <li><span className="text-sm text-muted-foreground cursor-default">Termos de Uso</span></li>
                            <li><span className="text-sm text-muted-foreground cursor-default">Privacidade</span></li>
                            <li><span className="text-sm text-muted-foreground cursor-default">Contato</span></li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-border/50 mt-10 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-xs text-muted-foreground">
                        © {new Date().getFullYear()} Isidis. Todos os direitos reservados.
                    </p>
                    <div className="flex items-center gap-4">
                        <span className="text-xs text-muted-foreground/60">Feito com ✨ no Brasil</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
