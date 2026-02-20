import { getConversations } from '@/app/actions/chat'
import { MessagesClient } from './messages-client'
import { TarologaSidebar } from '@/components/tarologa-sidebar'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ orderId?: string, clientId?: string }> }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    // Fetch profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, specialties, verification_status')
        .eq('id', user.id)
        .single()

    const conversations = await getConversations()
    const { orderId, clientId } = await searchParams

    let targetClient = null
    if (clientId) {
        const { data } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .eq('id', clientId)
            .single()

        if (data) {
            targetClient = {
                id: data.id,
                name: data.full_name || 'Cliente',
                avatar: data.avatar_url
            }
        }
    }

    return (
        <div className="min-h-screen bg-background-deep text-slate-200 font-sans selection:bg-purple-500/30 flex overflow-hidden">
            <TarologaSidebar profile={profile} userId={user.id} />
            <main className="relative z-10 flex-1 h-screen flex flex-col overflow-hidden pb-safe md:pb-0">
                <div className="flex-1 overflow-hidden p-4 md:p-8">
                    <MessagesClient
                        initialConversations={conversations}
                        currentUserId={user.id}
                        initialOrderId={orderId}
                        targetClient={targetClient}
                    />
                </div>
            </main>
        </div>
    )
}
