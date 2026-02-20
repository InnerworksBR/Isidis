import { getConversations } from '@/app/actions/chat'
import { MessagesClient } from './messages-client'
import { UserSidebar } from '@/components/user-sidebar'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ orderId?: string, tarologaId?: string }> }) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    const conversations = await getConversations()
    const { orderId, tarologaId } = await searchParams

    let targetTarologa = null
    if (tarologaId) {
        const { data } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url')
            .eq('id', tarologaId)
            .single()

        if (data) {
            targetTarologa = {
                id: data.id,
                name: data.full_name || 'Taróloga',
                avatar: data.avatar_url
            }
        }
    }

    return (
        <div className="min-h-screen bg-background-deep text-slate-200 font-sans selection:bg-purple-500/30 flex overflow-hidden">
            <UserSidebar />
            <main className="relative z-10 flex-1 h-screen flex flex-col overflow-hidden pb-safe md:pb-0">
                <div className="flex-1 overflow-hidden p-4 md:p-8">
                    <MessagesClient
                        initialConversations={conversations}
                        currentUserId={user.id}
                        initialOrderId={orderId}
                        targetTarologa={targetTarologa}
                    />
                </div>
            </main>
        </div>
    )
}
