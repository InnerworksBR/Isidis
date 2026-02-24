'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface RealtimeRefresherProps {
    userId: string
}

export function RealtimeRefresher({ userId }: RealtimeRefresherProps) {
    const router = useRouter()

    useEffect(() => {
        if (!userId) return

        const supabase = createClient()

        // Ouvi quando houver alterações em pedidos onde o usuário é o cliente OU a cartomante
        const channel = supabase
            .channel(`orders_refresh_${userId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'orders',
                    filter: `client_id=eq.${userId}`
                },
                () => {
                    router.refresh()
                }
            )
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'orders',
                    filter: `reader_id=eq.${userId}`
                },
                () => {
                    router.refresh()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [userId, router])

    // É um componente invisível, não renderiza nada na tela
    return null
}
