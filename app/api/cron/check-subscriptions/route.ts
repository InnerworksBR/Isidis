import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendSubscriptionReadingDue } from '@/lib/email'

export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization')

    // Optional basic protection if you want to call this manually via a secret token
    if (
        process.env.CRON_SECRET &&
        authHeader !== `Bearer ${process.env.CRON_SECRET}` &&
        request.headers.get('x-vercel-cron') !== '1'
    ) {
        return new NextResponse('Unauthorized', { status: 401 })
    }

    // Must use service role to bypass RLS and fetch all subscriptions
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    try {
        const now = new Date().toISOString()

        // 1. Fetch active subscriptions where a reading is due
        const { data: dueSubscriptions, error } = await supabaseAdmin
            .from('subscriptions')
            .select(`
                id, client_id, reader_id, gig_id, readings_per_month, readings_done_this_period, next_reading_due,
                gig:gigs(title),
                client:profiles!client_id(full_name),
                reader:profiles!reader_id(full_name, id)
            `)
            .eq('status', 'ACTIVE')
            .lte('next_reading_due', now)

        if (error) {
            console.error('[Cron] Error fetching subscriptions:', error)
            return NextResponse.json({ error: 'Database error' }, { status: 500 })
        }

        const notificationsSent = []

        for (const sub of dueSubscriptions || []) {
            // Check if we already reached the quota for this period
            if (sub.readings_done_this_period >= sub.readings_per_month) {
                continue
            }

            // Type casting arrays from Supabase response
            const readerObj = Array.isArray(sub.reader) ? sub.reader[0] : sub.reader
            const clientObj = Array.isArray(sub.client) ? sub.client[0] : sub.client
            const gigObj = Array.isArray(sub.gig) ? sub.gig[0] : sub.gig

            const readerId = readerObj?.id
            if (!readerId) continue

            // 2. Fetch the actual 'auth.users' email for the reader
            const { data: readerAuthData } = await supabaseAdmin.auth.admin.getUserById(readerId)
            const readerEmail = readerAuthData?.user?.email

            if (!readerEmail) continue

            const frequencyLabel = sub.readings_per_month === 4 ? 'Semanal'
                : sub.readings_per_month === 2 ? 'Quinzenal'
                    : 'Mensal'

            const gigTitle = gigObj?.title || 'Assinatura'
            const clientName = clientObj?.full_name || 'Cliente'
            const readerName = readerObj?.full_name || 'Cartomante'

            // 3. To avoid spam, we should probably check if we already sent an in-app notification today
            const todayStart = new Date()
            todayStart.setHours(0, 0, 0, 0)

            const { count: recentNotifications } = await supabaseAdmin
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', readerId)
                .eq('type', 'SUBSCRIPTION_DUE')
                .like('link', `%clientId=${sub.client_id}%`)
                .gte('created_at', todayStart.toISOString())

            if (recentNotifications && recentNotifications > 0) {
                continue
            }

            // 4. Send Email
            await sendSubscriptionReadingDue({
                readerEmail,
                readerName,
                clientName,
                gigTitle,
                frequencyLabel,
            })

            // 5. Create In-App Notification
            await supabaseAdmin.from('notifications').insert({
                user_id: readerId,
                type: 'SUBSCRIPTION_DUE',
                title: 'Tiragem Pendente',
                message: `É hora de realizar a tiragem ${frequencyLabel.toLowerCase()} para ${clientName} (${gigTitle}).`,
                link: `/dashboard/cartomante/assinaturas`,
                read: false
            })

            notificationsSent.push(sub.id)
        }

        return NextResponse.json({
            success: true,
            message: `Processed ${dueSubscriptions?.length || 0} subscriptions. Sent ${notificationsSent.length} notifications.`,
            notified_ids: notificationsSent
        })

    } catch (err: any) {
        console.error('[Cron] Critical error:', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
