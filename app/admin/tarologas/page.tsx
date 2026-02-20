import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Check, X, User, Instagram } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { updateTarologaStatus } from './actions'

export default async function TarologasApprovalPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    // Admin check
    const { data: adminProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (adminProfile?.role !== 'ADMIN') redirect('/')

    // Fetch pending tarologas
    const { data: pendingTarologas } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'TAROLOGA')
        .eq('verification_status', 'PENDING')
        .order('created_at', { ascending: false })

    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold text-white mb-6">Taróloga Applications</h1>

            <div className="grid gap-4">
                {pendingTarologas?.length === 0 ? (
                    <div className="text-slate-500 p-8 border border-white/5 rounded-xl text-center">
                        No pending applications.
                    </div>
                ) : (
                    pendingTarologas?.map((profile) => (
                        <div key={profile.id} className="bg-[#12121a] border border-white/10 rounded-xl p-6 flex items-start justify-between">
                            <div className="flex gap-4">
                                <div className="w-16 h-16 rounded-full bg-slate-800 overflow-hidden shrink-0">
                                    {profile.avatar_url ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-500">
                                            <User className="w-8 h-8" />
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <h3 className="font-bold text-lg text-white">{profile.full_name || 'Unnamed'}</h3>
                                    <p className="text-sm text-slate-400">{profile.email}</p>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-xs text-slate-300">
                                            CPF/CNPJ: {profile.cpf_cnpj || 'N/A'}
                                        </span>
                                        {profile.instagram_handle && (
                                            <a
                                                href={`https://instagram.com/${profile.instagram_handle.replace('@', '')}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-2 py-0.5 rounded-md bg-pink-500/10 border border-pink-500/20 text-xs text-pink-400 flex items-center gap-1 hover:bg-pink-500/20"
                                            >
                                                <Instagram className="w-3 h-3" />
                                                @{profile.instagram_handle.replace('@', '')}
                                            </a>
                                        )}
                                        <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-xs text-slate-300">
                                            Exp: {profile.experience_years} years
                                        </span>
                                    </div>
                                    {profile.bio && (
                                        <p className="text-sm text-slate-500 mt-2 max-w-2xl bg-black/20 p-3 rounded-lg border border-white/5">
                                            {profile.bio}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col gap-2 shrink-0">
                                <form action={async () => {
                                    'use server'
                                    await updateTarologaStatus(profile.id, 'APPROVED')
                                }}>
                                    <Button className="w-32 bg-green-600 hover:bg-green-700 text-white gap-2">
                                        <Check className="w-4 h-4" /> Approve
                                    </Button>
                                </form>

                                <form action={async () => {
                                    'use server'
                                    await updateTarologaStatus(profile.id, 'REJECTED')
                                }}>
                                    <Button variant="destructive" className="w-32 gap-2">
                                        <X className="w-4 h-4" /> Reject
                                    </Button>
                                </form>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
