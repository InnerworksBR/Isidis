'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, BookOpen, User, LayoutGrid, Package, MessageCircle, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'

export function DashboardBottomNav() {
    const pathname = usePathname()

    const clientNavItems = [
        {
            label: 'Início',
            href: '/dashboard',
            icon: Home,
            active: pathname === '/dashboard'
        },
        {
            label: 'Buscar',
            href: '/tarologas',
            icon: Search,
            active: pathname === '/tarologas'
        },
        {
            label: 'Minhas Tiragens',
            href: '/dashboard/minhas-tiragens',
            icon: BookOpen,
            active: pathname === '/dashboard/minhas-tiragens'
        },
        {
            label: 'Mensagens',
            href: '/dashboard/mensagens',
            icon: MessageCircle,
            active: pathname === '/dashboard/mensagens'
        },
        {
            label: 'Perfil',
            href: '/dashboard/perfil',
            icon: User,
            active: pathname === '/dashboard/perfil'
        }
    ]

    const tarologaNavItems = [
        {
            label: 'Início',
            href: '/dashboard/tarologa',
            icon: LayoutGrid,
            active: pathname === '/dashboard/tarologa'
        },
        {
            label: 'Pedidos',
            href: '/dashboard/tarologa/pedidos',
            icon: Package,
            active: pathname.startsWith('/dashboard/tarologa/pedidos')
        },
        {
            label: 'Mensagens',
            href: '/dashboard/tarologa/mensagens',
            icon: MessageCircle,
            active: pathname.startsWith('/dashboard/tarologa/mensagens')
        },
        {
            label: 'Carteira',
            href: '/dashboard/tarologa/carteira',
            icon: Wallet,
            active: pathname.startsWith('/dashboard/tarologa/carteira')
        },
        {
            label: 'Perfil',
            href: '/dashboard/tarologa/perfil',
            icon: User,
            active: pathname.startsWith('/dashboard/tarologa/perfil')
        }
    ]

    // Determine which nav items to use
    let currentNavItems = clientNavItems
    if (pathname.startsWith('/dashboard/tarologa')) {
        currentNavItems = tarologaNavItems
    } else if (pathname.startsWith('/admin')) {
        return null
    }

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-nav-deep/95 backdrop-blur-md border-t border-white/10 pb-safe md:hidden">
            <div className="flex items-center justify-around h-16">
                {currentNavItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors",
                            item.active ? "text-amber-400" : "text-slate-500 hover:text-slate-300"
                        )}
                    >
                        <item.icon className={cn("w-6 h-6", item.active && "fill-current/20")} />
                        <span className="text-[10px] font-medium">{item.label}</span>
                    </Link>
                ))}
            </div>
        </div>
    )
}
