import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendAdminGigPending, sendAdminUserPending } from '@/lib/email'

/**
 * API Route para notificações por email aos administradores.
 *
 * Configure um Database Webhook no Supabase apontando para esta rota:
 *   URL: https://<seu-dominio>/api/admin/notify-email
 *   Method: POST
 *   Headers: { "x-notify-secret": "<ADMIN_NOTIFY_SECRET>" }
 *
 * Payload esperado (enviado pelo Supabase webhook):
 *   { "type": "gig_pending", "gig_id": "...", "gig_title": "...", "reader_name": "..." }
 *   { "type": "user_pending", "user_name": "..." }
 */
export async function POST(request: Request) {
    const secret = request.headers.get('x-notify-secret')
    const expectedSecret = process.env.ADMIN_NOTIFY_SECRET

    if (expectedSecret && secret !== expectedSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )

    let body: any
    try {
        body = await request.json()
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    // Buscar emails de todos os admins
    const { data: admins, error: adminsError } = await supabaseAdmin
        .from('profiles')
        .select('email, full_name')
        .eq('role', 'ADMIN')

    if (adminsError || !admins || admins.length === 0) {
        console.warn('[AdminEmail] Nenhum admin encontrado para notificar.')
        return NextResponse.json({ received: true, warning: 'No admins found' })
    }

    const adminEmails = admins.map((a: any) => a.email).filter(Boolean)

    try {
        if (body.type === 'gig_pending') {
            await sendAdminGigPending({
                adminEmails,
                gigId: body.gig_id,
                gigTitle: body.gig_title || 'Novo Gig',
                readerName: body.reader_name || 'Cartomante',
            })
            console.log('[AdminEmail] Email de gig pendente enviado para', adminEmails.length, 'admin(s)')
        } else if (body.type === 'user_pending') {
            await sendAdminUserPending({
                adminEmails,
                userName: body.user_name || 'Novo usuário',
            })
            console.log('[AdminEmail] Email de usuário pendente enviado para', adminEmails.length, 'admin(s)')
        } else {
            return NextResponse.json({ error: 'Unknown event type' }, { status: 400 })
        }

        return NextResponse.json({ received: true })
    } catch (err: any) {
        console.error('[AdminEmail] Falha ao enviar email:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
