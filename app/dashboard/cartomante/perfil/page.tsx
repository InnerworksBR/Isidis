import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProfileForm } from './profile-form'
import { CartomanteSidebar } from '@/components/cartomante-sidebar'

export default async function PerfilPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login?next=/dashboard/cartomante/perfil')
    }

    // Buscar perfil existente
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

    return (
        <div className="flex h-screen bg-background-deep overflow-hidden">
            <CartomanteSidebar profile={profile} userId={user.id} />
            <main className="flex-1 overflow-y-auto w-full">
                <ProfileForm
                    email={user.email || ''}
                    profile={profile || {}}
                />
            </main>
        </div>
    )
}
