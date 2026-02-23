import { NextResponse } from 'next/server'
import {
    sendOrderPaidToReader,
    sendOrderPaidToClient,
    sendReadingDelivered,
    sendTicketReply,
} from '@/lib/email'

/**
 * Rota de teste temporária do sistema de emails.
 * Acesse: http://localhost:3000/api/test-email?to=seu@email.com
 * 
 * REMOVA este arquivo antes de ir para produção!
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const to = searchParams.get('to')
    const type = searchParams.get('type') || 'all'

    if (!to) {
        return NextResponse.json(
            { error: 'Parâmetro obrigatório: ?to=seu@email.com' },
            { status: 400 }
        )
    }

    const results: Record<string, any> = {}
    const fakeOrderId = 'teste-00000000-0000-0000-0000-000000000000'

    try {
        if (type === 'all' || type === 'reader_paid') {
            results.reader_paid = await sendOrderPaidToReader({
                readerEmail: to,
                readerName: 'Cartomante Teste',
                orderId: fakeOrderId,
                gigTitle: 'Tiragem de 3 Cartas',
                clientName: 'Cliente Teste',
                amount: 4990, // R$ 49,90
            })
        }

        if (type === 'all' || type === 'client_paid') {
            results.client_paid = await sendOrderPaidToClient({
                clientEmail: to,
                clientName: 'Cliente Teste',
                orderId: fakeOrderId,
                gigTitle: 'Tiragem de 3 Cartas',
                readerName: 'Cartomante Teste',
            })
        }

        if (type === 'all' || type === 'delivered') {
            results.delivered = await sendReadingDelivered({
                clientEmail: to,
                clientName: 'Cliente Teste',
                orderId: fakeOrderId,
                gigTitle: 'Tiragem de 3 Cartas',
                readerName: 'Cartomante Teste',
            })
        }

        if (type === 'all' || type === 'ticket') {
            results.ticket = await sendTicketReply({
                userEmail: to,
                userName: 'Usuário Teste',
                ticketId: 'ticket-00000000',
                ticketSubject: 'Dúvida sobre pagamento',
                replyPreview: 'Olá! Verificamos o seu caso e o pagamento foi confirmado. Em caso de dúvidas, fique à vontade para responder este ticket.',
            })
        }

        return NextResponse.json({
            success: true,
            message: `Email(s) enviado(s) para ${to}`,
            types_sent: Object.keys(results),
            results,
        })
    } catch (err: any) {
        return NextResponse.json(
            { error: err.message, details: err },
            { status: 500 }
        )
    }
}
