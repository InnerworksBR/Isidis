import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    // if "next" is in param, use it as the redirect URL
    const next = searchParams.get('next') ?? '/dashboard'

    // Check for error parameters from Supabase
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')
    const errorCode = searchParams.get('error_code')

    console.log('Auth Callback Debug:', {
        code: code ? '***' : null,
        next,
        error,
        errorDescription,
        errorCode,
        fullUrl: request.url
    })

    if (error) {
        return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${error}&error_description=${errorDescription}&error_code=${errorCode}`)
    }

    if (code) {
        const supabase = await createClient()
        const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code)

        if (!sessionError) {
            const forwardedHost = request.headers.get('x-forwarded-host') // original origin before load balancer
            const isLocalEnv = process.env.NODE_ENV === 'development'
            if (isLocalEnv) {
                // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
                return NextResponse.redirect(`${origin}${next}`)
            } else if (forwardedHost) {
                return NextResponse.redirect(`https://${forwardedHost}${next}`)
            } else {
                return NextResponse.redirect(`${origin}${next}`)
            }
        } else {
            console.error('Exchange Code Error:', sessionError)
            return NextResponse.redirect(`${origin}/auth/auth-code-error?error=${sessionError.code}&error_description=${sessionError.message}`)
        }
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/auth/auth-code-error?error=no_code&error_description=Nenhum código de verificação encontrado.`)
}
