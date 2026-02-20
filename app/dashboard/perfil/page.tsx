import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProfileForm } from './profile-form'

export default async function PerfilPage() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/login')

    const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, cellphone, tax_id, role, avatar_url, cover_url, bio')
        .eq('id', user.id)
        .single()

    return (
        <div className="min-h-[calc(100vh-80px)] px-4 py-8 sm:py-12 relative overflow-hidden bg-background">
            {/* Background orbs */}
            <div className="orb orb-primary w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] -top-24 -right-24 sm:-top-48 sm:-right-48 animate-float opacity-30" />
            <div className="orb orb-accent w-[200px] h-[200px] sm:w-[400px] sm:h-[400px] -bottom-24 -left-24 sm:-bottom-48 sm:-left-48 animate-float-slow opacity-20" />

            <div className="max-w-5xl mx-auto relative z-10">
                <div className="mb-10 animate-fade-in text-center sm:text-left">
                    <h1 className="text-3xl sm:text-4xl font-black mb-3 tracking-tight">Meu Perfil</h1>
                    <p className="text-muted-foreground max-w-2xl text-sm sm:text-base leading-relaxed">
                        Gerencie suas informações pessoais e aparência pública no Isidis. Esses dados são essenciais para processar seus pagamentos com segurança.
                    </p>
                </div>

                <div className="rounded-[2rem] border border-border/40 bg-card/40 backdrop-blur-xl p-6 sm:p-10 shadow-2xl shadow-primary/5 animate-fade-in-up">
                    <ProfileForm
                        initialData={{
                            fullName: profile?.full_name || '',
                            cellphone: profile?.cellphone || '',
                            taxId: profile?.tax_id || '',
                            email: user.email || '',
                            bio: profile?.bio || '',
                            avatarUrl: profile?.avatar_url || '',
                            coverUrl: profile?.cover_url || '',
                        }}
                    />
                </div>
            </div>
        </div>
    )
}
