import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { GigRequirement } from '@/types'
import { RequirementsForm } from './requirements-form'

export default async function CheckoutSuccessPage({
    searchParams,
}: {
    searchParams: Promise<{ order_id?: string }>
}) {
    const { order_id } = await searchParams

    if (!order_id || order_id === 'pending') {
        return (
            <div className="container mx-auto px-4 py-24 flex justify-center text-white">
                <p>Pedido pendente ou não encontrado...</p>
            </div>
        )
    }

    const supabase = await createClient()

    // Fetch order with gig requirements
    const { data: order } = await supabase
        .from('orders')
        .select(`
            id, 
            status, 
            requirements_answers,
            gig:gigs (
                id,
                title,
                requirements
            )
        `)
        .eq('id', order_id)
        .single()

    if (order && order.status === 'PENDING_PAYMENT') {
        await supabase
            .from('orders')
            .update({ status: 'PAID' })
            .eq('id', order_id)
        console.log(`[Success] Order ${order_id} updated to PAID`)
    }

    const gig = order?.gig as any
    const requirements = (gig?.requirements as GigRequirement[]) || []
    const hasAnswers = order?.requirements_answers && Object.keys(order.requirements_answers).length > 0

    // If there are requirements and they haven't been answered (or logic dictates showing form), show the form
    // Even if answered, we might want to show them? No, design says "Ask for info".
    // If answered, show success.
    if (requirements.length > 0 && !hasAnswers) {
        return (
            <div className="container mx-auto px-4 py-12 flex justify-center">
                <RequirementsForm orderId={order_id} requirements={requirements} />
            </div>
        )
    }

    // Default success view
    return (
        <div className="container mx-auto px-4 py-24 flex justify-center">
            <Card className="w-full max-w-md text-center shadow-xl border-green-500/30 bg-[#0a0a0f] text-slate-200">
                <CardHeader className="pb-4">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
                        <CheckCircle2 className="h-8 w-8 text-green-500" />
                    </div>
                    <CardTitle className="text-2xl text-white">Pagamento Recebido!</CardTitle>
                    <CardDescription className="text-slate-400">
                        Seu pedido foi confirmado com sucesso.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="bg-[#12121a] rounded-lg p-4 space-y-2 text-sm border border-white/5">
                        <div className="flex justify-between">
                            <span className="text-slate-400">Status</span>
                            <span className="text-green-500 font-bold">Pago</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-400">Pedido</span>
                            <span className="font-mono text-xs text-slate-300">{order_id.slice(0, 8)}...</span>
                        </div>
                    </div>

                    <p className="text-sm text-slate-400">
                        A taróloga foi notificada e iniciará sua leitura em breve.
                        Você receberá uma notificação quando estiver pronta.
                    </p>

                    <div className="flex flex-col gap-2">
                        <Button asChild className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
                            <Link href="/dashboard/minhas-tiragens">
                                Ver Minhas Tiragens <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                        <Button variant="ghost" asChild className="text-slate-400 hover:text-white hover:bg-white/5">
                            <Link href="/tarologas">Continuar Explorando</Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
