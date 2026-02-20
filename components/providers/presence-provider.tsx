'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'

interface PresenceContextType {
    onlineUsers: Set<string>
}

const PresenceContext = createContext<PresenceContextType>({
    onlineUsers: new Set()
})

export const usePresence = () => useContext(PresenceContext)

export function PresenceProvider({ children }: { children: React.ReactNode }) {
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())
    const [user, setUser] = useState<User | null>(null)
    // Fix: Ensure supabase client is stable across renders
    const [supabase] = useState(() => createClient())

    // 1. Check for current user to track presence
    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            console.log('PresenceProvider: Current User:', user?.id)
            setUser(user)
        }
        getUser()

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            console.log('PresenceProvider: Auth Change:', _event, session?.user?.id)
            setUser(session?.user ?? null)
        })

        return () => subscription.unsubscribe()
    }, [supabase])

    // 2. Presence Logic
    useEffect(() => {
        if (!user) {
            console.log('PresenceProvider: No user joined yet to track presence (but listening)')
        }

        console.log('PresenceProvider: Subscribing to global_presence')
        const channel = supabase.channel('global_presence')

        channel
            .on('presence', { event: 'sync' }, () => {
                const newState = channel.presenceState()
                console.log('PresenceProvider Sync:', newState)
                const onlineIds = new Set<string>()

                for (const id in newState) {
                    const presences = newState[id] as any[]
                    presences.forEach(p => {
                        if (p.user_id) onlineIds.add(p.user_id)
                    })
                }
                console.log('PresenceProvider Online Users:', Array.from(onlineIds))
                setOnlineUsers(onlineIds)
            })
            .on('presence', { event: 'join' }, ({ key, newPresences }) => {
                console.log('PresenceProvider Join:', newPresences)
                setOnlineUsers(prev => {
                    const next = new Set(prev)
                    newPresences.forEach((p: any) => {
                        if (p.user_id) next.add(p.user_id)
                    })
                    return next
                })
            })
            .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
                console.log('PresenceProvider Leave:', leftPresences)
                setOnlineUsers(prev => {
                    const next = new Set(prev)
                    leftPresences.forEach((p: any) => {
                        if (p.user_id) next.delete(p.user_id)
                    })
                    return next
                })
            })
            .subscribe(async (status) => {
                console.log('PresenceProvider Status:', status)
                if (status === 'SUBSCRIBED') {
                    // If user is logged in, track them
                    if (user) {
                        console.log('PresenceProvider: Tracking user:', user.id)
                        await channel.track({
                            user_id: user.id,
                            online_at: new Date().toISOString(),
                        })
                    }
                }
            })

        return () => {
            console.log('PresenceProvider: Cleaning up/Unsubscribing')
            supabase.removeChannel(channel)
        }
    }, [supabase, user]) // Re-run if user changes to track/untrack

    return (
        <PresenceContext.Provider value={{ onlineUsers }}>
            {children}
        </PresenceContext.Provider>
    )
}
