import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EditorWrapper } from './editor-wrapper'
import { ChatWindow } from '@/components/chat/chat-window'

export default async function PedidoPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: order, error } = await supabase
        .from('orders')
        .select('id, status, delivery_content, amount_reader_net, created_at, gig_id, client_id, reader_id, requirements_answers')
        .eq('id', id)
        .eq('reader_id', user.id)
        .single()

    if (error || !order) {
        redirect('/dashboard/tarologa')
    }

    // Fetch gig and client info
    const [gigResult, clientResult, readerResult] = await Promise.all([
        supabase.from('gigs').select('title, requirements').eq('id', order.gig_id).single(),
        supabase.from('profiles').select('full_name, email').eq('id', order.client_id).single(),
        supabase.from('profiles').select('full_name').eq('id', order.reader_id).single(),
    ])

    return (
        <>
            <EditorWrapper
                order={{
                    id: order.id,
                    status: order.status,
                    deliveryContent: order.delivery_content,
                    amountReaderNet: order.amount_reader_net,
                    createdAt: order.created_at,
                }}
                gigTitle={gigResult.data?.title || 'Leitura de Tarot'}
                gigRequirements={gigResult.data?.requirements || []}
                requirementsAnswers={order.requirements_answers}
                clientName={clientResult.data?.full_name || 'Cliente'}
                clientEmail={clientResult.data?.email || ''}
                readerName={readerResult.data?.full_name || 'Taróloga'}
            />
            {/* Chat Window - Order Context */}
            <div className="fixed bottom-6 right-6 z-50">
                <ChatWindow
                    currentUser={{ id: user.id }}
                    otherUser={{ id: order.client_id, name: clientResult.data?.full_name || 'Cliente', avatar: undefined }}
                    orderId={id}
                    title={`Chat com ${clientResult.data?.full_name?.split(' ')[0]}`}
                    variant="floating"
                />
            </div>
        </>
    )
}
