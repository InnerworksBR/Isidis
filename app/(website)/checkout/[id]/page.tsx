import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckoutForm } from './checkout-form'
import { User, Shield, Zap, CheckCircle2 } from 'lucide-react'
import { GigAddOn } from '@/types'

export default async function CheckoutPage({ params, searchParams }: { params: Promise<{ id: string }>, searchParams: Promise<{ addons?: string }> }) {
    const { id } = await params
    const { addons } = await searchParams
    const selectedAddOnIds = addons ? addons.split(',') : []
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect(`/login?next=/checkout/${id}`)
    }

    // Fetch the gig from Supabase
    const { data: gig } = await supabase
        .from('gigs')
        .select('id, title, description, price, image_url, owner_id, add_ons')
        .eq('id', id)
        .single()

    if (!gig) {
        notFound()
    }

    // Fetch the reader's profile
    const { data: reader } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('id', gig.owner_id)
        .single()

    const priceInBrl = gig.price / 100

    // Filter selected add-ons
    const selectedAddOns = (gig.add_ons || []).filter((addon: GigAddOn) => selectedAddOnIds.includes(addon.id))
    const addOnsTotal = selectedAddOns.reduce((sum: number, addon: GigAddOn) => sum + addon.price, 0)
    const totalWithAddOns = priceInBrl + addOnsTotal

    return (
        <div className="container mx-auto px-4 py-12 flex justify-center relative overflow-hidden">
            <div className="orb orb-primary w-80 h-80 -top-40 -right-40 opacity-10" />

            <Card className="w-full max-w-lg shadow-xl border-primary/20 bg-card/80 backdrop-blur-md rounded-2xl relative z-10 animate-fade-in-up">
                <CardHeader>
                    <CardTitle>Resumo do Pedido</CardTitle>
                    <CardDescription>Você está prestes a contratar um serviço.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl">
                        {reader?.avatar_url ? (
                            <img src={reader.avatar_url} alt={reader.full_name || ''} className="w-16 h-16 rounded-full object-cover" />
                        ) : (
                            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="w-7 h-7 text-primary/40" />
                            </div>
                        )}
                        <div>
                            <h3 className="font-bold">{reader?.full_name || 'Taróloga'}</h3>
                            <p className="text-sm text-muted-foreground">{gig.title}</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Serviço</span>
                            <span>{gig.title}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Preço Base</span>
                            <span>R$ {priceInBrl.toFixed(2)}</span>
                        </div>

                        {selectedAddOns.length > 0 && (
                            <div className="pt-2 border-t border-border/30 space-y-2">
                                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Extras Selecionados</span>
                                {selectedAddOns.map((addon: GigAddOn) => (
                                    <div key={addon.id} className="flex justify-between text-sm">
                                        <span className="text-slate-300 flex items-center gap-2">
                                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                            {addon.title}
                                        </span>
                                        <span>R$ {addon.price.toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex justify-between text-primary font-bold text-lg pt-4 border-t border-border/50">
                            <span>Total</span>
                            <span>R$ {totalWithAddOns.toFixed(2)}</span>
                        </div>
                    </div>

                    <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                            <Shield className="w-3 h-3 text-green-500" /> Seguro
                        </span>
                        <span className="flex items-center gap-1">
                            <Zap className="w-3 h-3 text-accent" /> Rápido
                        </span>
                    </div>
                </CardContent>
                <CardFooter>
                    <CheckoutForm gigId={gig.id} readerId={gig.owner_id} selectedAddOns={selectedAddOns} />
                </CardFooter>
            </Card>
        </div>
    )
}
