'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

// We use different clients: one for standard context (cookies) and potentially direct use for admin
import { createClient } from '@/lib/supabase/server'
import { createClient as createClientJs } from '@supabase/supabase-js'

export async function login(prevState: any, formData: FormData) {
    const supabase = await createClient()

    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    }

    const { error, data: authData } = await supabase.auth.signInWithPassword(data)

    if (error) {
        console.error('Login error:', error.message)
        if (error.message.includes('Invalid login credentials')) {
            return { error: 'Email ou senha incorretos.' }
        }
        return { error: 'Ocorreu um erro ao entrar. Tente novamente.' }
    }

    revalidatePath('/', 'layout')

    // Redirect based on role
    const role = authData.user?.user_metadata?.role
    if (role === 'READER') {
        redirect('/dashboard/tarologa')
    }
    redirect('/dashboard')
}

export async function signup(prevState: any, formData: FormData) {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const fullName = formData.get('full_name') as string
    const role = formData.get('role') as string || 'CLIENT'

    // Basic fields
    // Basic fields
    const cpf = (formData.get('cpf') as string) || (formData.get('cpf_client') as string)
    const cellphone = (formData.get('cellphone') as string) || (formData.get('cellphone_client') as string)
    const socialName = formData.get('social_name') as string

    // Additional fields (Reader)
    const birthDate = formData.get('birth_date') as string
    const addressZip = formData.get('address_zip_code') as string
    const addressStreet = formData.get('address_street') as string
    const addressNumber = formData.get('address_number') as string
    const addressNeighborhood = formData.get('address_neighborhood') as string
    const addressCity = formData.get('address_city') as string
    const addressState = formData.get('address_state') as string

    const bankCode = formData.get('bank_code') as string
    const agency = formData.get('agency') as string
    const accountNumber = formData.get('account_number') as string
    const accountType = formData.get('account_type') as string

    const bio = formData.get('bio') as string
    const specialties = formData.get('specialties') ? JSON.parse(formData.get('specialties') as string) : []
    const ethicsAccepted = formData.get('ethics_accepted') === 'on'

    const { error, data: authData } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: fullName,
                role: role,
                social_name: socialName
            }
        }
    })

    if (error) {
        console.error('Signup error:', error.message)
        if (error.message.includes('User already registered')) {
            return { error: 'Este email já está cadastrado.' }
        }
        return { error: 'Erro ao criar conta. Tente novamente.' }
    }

    if (authData.user) {
        const userId = authData.user.id

        // Initialize Admin Client for operations requiring elevated privileges (bypassing RLS)
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (!serviceRoleKey) {
            console.error('Missing SUPABASE_SERVICE_ROLE_KEY')
            return { error: 'Erro interno de configuração: Chave de API ausente.' }
        }

        const supabaseAdmin = createClientJs(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            serviceRoleKey,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        ) as any

        // Initialize update data
        let updateData: any = {
            id: userId,
            full_name: fullName,
            social_name: socialName,
            role: role,
            cellphone: cellphone || null,
            tax_id: cpf || null,
        }

        // Handle File Uploads & Extended Data for READER
        if (role === 'READER') {
            const docFront = formData.get('doc_front') as File
            const docBack = formData.get('doc_back') as File
            const docSelfie = formData.get('doc_selfie') as File

            let frontUrl = null
            let backUrl = null
            let selfieUrl = null



            // Helper for admin upload
            const uploadAsAdmin = async (file: File, path: string) => {
                if (!file || file.size === 0) return null

                // Ensure bucket exists (self-healing)
                const { data: buckets } = await supabaseAdmin.storage.listBuckets()
                const bucketExists = buckets?.find((b: any) => b.name === 'verification_documents')
                if (!bucketExists) {
                    console.log('Creating missing bucket: verification_documents')
                    await supabaseAdmin.storage.createBucket('verification_documents', {
                        public: false,
                        fileSizeLimit: 5242880, // 5MB
                        allowedMimeTypes: ['image/*']
                    })
                    // Add basic policy if possible via API? 
                    // The Admin client bypasses policies, so for upload it's fine.
                    // But for viewing (signedUrl), it should be fine too if signed by Admin/Service Role?
                    // Actually, signed URLs are generated by the server, so standard client might need policy?
                    // No, createSignedUrl uses the client's permissions.
                    // If we use Admin to sign, it works.
                    // If we use standard client to sign (in admin page), it needs policy OR we use Admin there too.
                }

                const arrayBuffer = await file.arrayBuffer()
                const buffer = new Uint8Array(arrayBuffer)
                const { data, error } = await supabaseAdmin.storage
                    .from('verification_documents')
                    .upload(`${userId}/${path}`, buffer, {
                        contentType: file.type,
                        upsert: true
                    })
                if (error) console.error(`Upload error ${path}:`, error)
                return data?.path
            }

            if (docFront) frontUrl = await uploadAsAdmin(docFront, `front-${Date.now()}`)
            if (docBack) backUrl = await uploadAsAdmin(docBack, `back-${Date.now()}`)
            if (docSelfie) selfieUrl = await uploadAsAdmin(docSelfie, `selfie-${Date.now()}`)

            updateData = {
                ...updateData,
                birth_date: birthDate,
                address_zip_code: addressZip,
                address_street: addressStreet,
                address_number: addressNumber,
                address_neighborhood: addressNeighborhood,
                address_city: addressCity,
                address_state: addressState,
                bank_code: bankCode,
                agency: agency,
                account_number: accountNumber,
                account_type: accountType,
                bio: bio,
                specialties: specialties,
                document_front_url: frontUrl,
                document_back_url: backUrl,
                selfie_url: selfieUrl,
                verification_status: 'PENDING',
                ethics_accepted_at: ethicsAccepted ? new Date().toISOString() : null
            }
        }

        // Update profile using Admin client to bypass RLS (since user might not have session yet)
        console.log('Update Data for Profile:', JSON.stringify(updateData, null, 2))

        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .upsert(updateData)

        if (profileError) {
            console.error('Profile update error:', profileError)
            // Non-blocking but good to log
        } else {
            console.log('Profile updated successfully for user:', userId)
        }
    }

    revalidatePath('/', 'layout')

    // Always redirect to confirm page — user must verify email first
    redirect('/register/confirm')
}

export async function signout() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    revalidatePath('/', 'layout')
    redirect('/login')
}

// Client-side implementation used in /recover page to handle PKCE cookies correctly
// export async function forgotPassword(prevState: any, formData: FormData) {
//     const supabase = await createClient()
//     const email = formData.get('email') as string
//     const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/update-password`
//
//     const { error } = await supabase.auth.resetPasswordForEmail(email, {
//         redirectTo: callbackUrl,
//     })
//
//     if (error) {
//         console.error('Forgot password error:', error.message)
//         return { error: 'Não foi possível enviar o email de recuperação. Tente novamente.' }
//     }
//
//     return { success: 'Verifique seu email para o link de recuperação.' }
// }

export async function resetPassword(prevState: any, formData: FormData) {
    const supabase = await createClient()
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirm_password') as string

    if (password !== confirmPassword) {
        return { error: 'As senhas não coincidem.' }
    }

    const { error } = await supabase.auth.updateUser({
        password: password,
    })

    if (error) {
        console.error('Reset password error:', error.message)
        return { error: 'Não foi possível redefinir a senha. Tente novamente.' }
    }

    revalidatePath('/', 'layout')
    redirect('/dashboard')
}
