import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Clock, CheckCircle2, FileText, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function UnderReviewPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('verification_status, role')
        .eq('id', user.id)
        .single()

    // If approved, redirect to dashboard
    if (profile?.verification_status === 'APPROVED') {
        redirect('/dashboard/tarologa')
    }

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
            <div className="max-w-md w-full bg-card rounded-2xl border p-8 shadow-xl backdrop-blur-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-yellow-300" />

                <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Clock className="w-8 h-8 text-amber-500" />
                </div>

                <h1 className="text-2xl font-bold mb-3">Cadastro em Análise</h1>
                <p className="text-muted-foreground mb-6">
                    Recebemos seus dados e documentos! Nossa equipe está analisando seu perfil para garantir a segurança e qualidade da plataforma.
                </p>

                <div className="bg-muted/50 rounded-xl p-4 text-left text-sm space-y-3 mb-6">
                    <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                        <span>Dados Pessoais recebidos</span>
                    </div>
                    <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                        <span>Documentos enviados</span>
                    </div>
                    <div className="flex items-start gap-3">
                        <Clock className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                        <span className="text-foreground font-medium">Aguardando aprovação final</span>
                    </div>
                </div>

                <p className="text-xs text-muted-foreground/60 mb-6">
                    O prazo médio de análise é de 24 horas úteis. Você receberá um email assim que seu cadastro for aprovado.
                </p>

                <div className="flex flex-col gap-3">
                    <form action="/auth/signout" method="post">
                        <Button variant="outline" className="w-full">
                            Sair da conta
                        </Button>
                    </form>
                </div>
            </div>

            <div className="mt-8 text-xs text-muted-foreground">
                <p>Precisa de ajuda? <Link href="/contato" className="underline hover:text-primary">Entre em contato</Link></p>
            </div>
        </div>
    )
}
