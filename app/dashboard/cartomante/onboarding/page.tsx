import { createClient } from '@/lib/supabase/server'
import OnboardingPage from './onboarding-client'
import { redirect } from 'next/navigation'

export default async function Page() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('tax_id, cnpj, pix_key, pix_key_type, verification_status')
        .eq('id', user.id)
        .single()

    // If already approved, redirect to dashboard
    if (profile?.verification_status === 'APPROVED') {
        redirect('/dashboard/cartomante')
    }

    return <OnboardingPage initialProfile={profile || undefined} />
}
