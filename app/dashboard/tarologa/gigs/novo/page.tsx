import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { GigForm } from './gig-form'

export default async function NovoGigPage({
    searchParams
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login?next=/dashboard/tarologa/gigs/novo')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('verification_status')
        .eq('id', user.id)
        .single()

    if (profile?.verification_status !== 'APPROVED') {
        return (
            <div className="min-h-screen bg-[#0a0a14] flex items-center justify-center p-4">
                <div className="bg-[#12122a] border border-indigo-500/20 rounded-2xl p-8 max-w-md text-center">
                    <div className="w-16 h-16 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-3xl">⏳</span>
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Verificação Necessária</h1>
                    <p className="text-slate-400 mb-6">
                        Para manter a qualidade do nosso santuário, você precisa completar seu perfil profissional antes de criar serviços.
                        Após salvar seu perfil completo, você poderá criar seus gigs.
                    </p>
                    <a href="/dashboard/tarologa/perfil" className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl transition-all">
                        Complete Profile
                    </a>
                </div>
            </div>
        )
    }

    let initialData: any = undefined
    const editId = (await searchParams)?.edit as string

    if (editId) {
        const { data: gig } = await supabase
            .from('gigs')
            .select('*')
            .eq('id', editId)
            .eq('owner_id', user.id)
            .single()

        if (gig) {
            initialData = gig
        }
    }

    return <GigForm initialData={initialData} />
}
