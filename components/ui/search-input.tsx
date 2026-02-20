'use client'

import { Search } from 'lucide-react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

export function SearchInput({ placeholder }: { placeholder?: string }) {
    const searchParams = useSearchParams()
    const pathname = usePathname()
    const { replace } = useRouter()
    const [term, setTerm] = useState(searchParams.get('q')?.toString() || '')

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            const currentQ = searchParams.get('q')?.toString() || ''
            if (currentQ !== term) {
                const params = new URLSearchParams(searchParams)
                if (term) {
                    params.set('q', term)
                } else {
                    params.delete('q')
                }
                replace(`${pathname}?${params.toString()}`)
            }
        }, 300)

        return () => clearTimeout(timeoutId)
    }, [term, replace, pathname, searchParams])

    return (
        <div className="relative w-full sm:w-auto">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
                type="text"
                placeholder={placeholder || "Buscar..."}
                onChange={(e) => setTerm(e.target.value)}
                value={term}
                className="pl-10 pr-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-sm text-slate-300 placeholder:text-slate-600 w-full sm:w-64 focus:outline-none focus:border-indigo-500/30 backdrop-blur-sm"
            />
        </div>
    )
}
