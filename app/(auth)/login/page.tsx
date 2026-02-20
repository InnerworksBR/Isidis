'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { login } from '@/app/auth/actions'
import Link from 'next/link'
import { LogIn, Sparkles } from 'lucide-react'

export default function LoginPage() {
    const [state, formAction] = useActionState(login, null)

    return (
        <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4 py-12 relative overflow-hidden">
            {/* Background orbs */}
            <div className="orb orb-primary w-80 h-80 -top-40 -right-40 animate-float" />
            <div className="orb orb-accent w-64 h-64 -bottom-32 -left-32 animate-float-slow" />

            <div className="w-full max-w-md relative z-10 animate-fade-in-up">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-4 animate-float">
                        <Sparkles className="w-8 h-8 text-primary" />
                    </div>
                    <h1 className="text-3xl font-bold mb-2">Bem-vindo de volta</h1>
                    <p className="text-muted-foreground">Entre para acessar sua jornada espiritual.</p>
                </div>

                <div className="glass-strong rounded-2xl p-8">
                    <form action={formAction} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="seu@email.com"
                                required
                                className="h-12 bg-background/50 border-border/50 focus:border-primary transition-colors"
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password" className="text-sm font-medium">Senha</Label>
                                <Link href="/recover" className="text-xs text-primary hover:underline">
                                    Esqueceu a senha?
                                </Link>
                            </div>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                placeholder="Sua senha"
                                required
                                className="h-12 bg-background/50 border-border/50 focus:border-primary transition-colors"
                            />
                        </div>

                        {state?.error && (
                            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm animate-scale-in">
                                {state.error}
                            </div>
                        )}

                        <Button type="submit" className="w-full py-6 text-base font-bold animate-glow-pulse">
                            <LogIn className="mr-2 w-4 h-4" />
                            Entrar
                        </Button>
                    </form>
                </div>

                <p className="text-center text-sm text-muted-foreground mt-6">
                    Não tem conta?{' '}
                    <Link href="/register" className="text-primary font-semibold hover:underline">
                        Criar Conta
                    </Link>
                </p>
            </div>
        </div>
    )
}
