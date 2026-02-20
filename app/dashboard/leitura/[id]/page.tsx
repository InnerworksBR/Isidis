import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ArrowLeft, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { ReadingCards } from './reading-cards'
import { PhysicalReadingView } from './physical-reading-view'
import { PrintReadingButton } from '@/components/print-reading-button'
import { ChatWindow } from '@/components/chat/chat-window'

export default async function ReadingRoomPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login?next=/dashboard/leitura/' + id)
    }

    // Buscar pedido com dados do reader
    const { data: order } = await supabase
        .from('orders')
        .select('*, profiles!orders_reader_id_fkey(full_name)')
        .eq('id', id)
        .single()

    const deliveryContent = order?.delivery_content
    const readerName = (order as any)?.profiles?.full_name || 'Taróloga'

    // ─── Physical Mode ────────────────────────────────────────────
    if (deliveryContent?.mode === 'physical') {
        return (
            <PhysicalReadingView
                readingTitle={deliveryContent.readingTitle || 'Sua Leitura'}
                sections={deliveryContent.sections || []}
                readerName={readerName}
                deliveredAt={order?.created_at || new Date().toISOString()}
            />
        )
    }

    // ─── Digital Mode (legacy) ────────────────────────────────────
    const isDemo = !order
    const dbCards = deliveryContent?.cards || []

    const normalizedCards = dbCards.map((c: any) => ({
        position_name: c.position,
        card_image: c.image || "https://sacred-texts.com/tarot/pkt/img/ar00.jpg",
        meaning: c.interpretation || "Sem interpretação.",
        audio_url: c.audioBase64,
        card_name: c.name,
    }))

    const content = {
        summary: deliveryContent?.spreadName ? `Leitura: ${deliveryContent.spreadName}` : "Interpretação Geral",
        cards: isDemo ? [
            { position_name: "Passado", card_image: "https://sacred-texts.com/tarot/pkt/img/ar00.jpg", meaning: "O Louco — Novos começos, aventura, inocência.", card_name: "0 - O Louco" },
            { position_name: "Presente", card_image: "https://sacred-texts.com/tarot/pkt/img/ar01.jpg", meaning: "O Mago — Manifestação, poder, habilidade.", card_name: "I - O Mago" },
            { position_name: "Futuro", card_image: "https://sacred-texts.com/tarot/pkt/img/ar02.jpg", meaning: "A Sacerdotisa — Intuição, mistério, subconsciente.", card_name: "II - A Sacerdotisa" }
        ] : normalizedCards
    }

    return (
        <div className="min-h-screen bg-background text-foreground p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/20 via-background to-background pointer-events-none"></div>

            <div className="relative z-10 max-w-6xl mx-auto">
                <header className="flex justify-between items-center mb-12">
                    <Button variant="ghost" asChild className="text-muted-foreground hover:text-foreground no-print">
                        <Link href="/dashboard">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Voltar
                        </Link>
                    </Button>
                    <h1 className="text-2xl font-bold text-center">
                        {isDemo ? 'Demo — Tiragem das Três Cartas' : 'Sua Leitura'}
                    </h1>
                    <div className="w-24 flex justify-end">
                        <PrintReadingButton />
                    </div>
                </header>

                <ReadingCards cards={content.cards} />

                <Card className="max-w-3xl mx-auto bg-card/60 border-primary/20 backdrop-blur-md p-8 mt-12 shadow-2xl shadow-primary/5">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-foreground">
                        <Sparkles className="w-5 h-5 text-primary" />
                        Interpretação da Mestra
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                        {content.summary}
                    </p>
                </Card>
            </div>

            {/* Chat Window - Post Sales */}
            <div className="fixed bottom-6 right-6 z-50 no-print">
                <ChatWindow
                    currentUser={{ id: user.id }}
                    otherUser={{ id: order.reader_id, name: readerName, avatar: (order as any)?.profiles?.avatar_url }}
                    orderId={id}
                    title="Dúvidas sobre a leitura?"
                    variant="floating"
                />
            </div>
        </div>
    )
}
