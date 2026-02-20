import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        request.cookies.set(name, value)
                    )
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // 1. Refresh session
    const { data: { user } } = await supabase.auth.getUser()

    // 2. Protect Admin Routes
    // 2. Protect Admin Routes & Enforce Onboarding
    if (user) {
        // Fetch profile to check role and verification status
        const { data: profile } = await supabase
            .from('profiles')
            .select('role, verification_status, bio, ethics_accepted_at')
            .eq('id', user.id)
            .single()

        // Admin Route Protection
        if (request.nextUrl.pathname.startsWith('/admin')) {
            if (profile?.role !== 'ADMIN') {
                return NextResponse.redirect(new URL('/', request.url))
            }
        }

        // Reader Onboarding Enforcement
        // Only redirect if they haven't completed the onboarding steps (Bio is last step, ethics is step 3)
        // If bio is present, they finished step 4.
        const onboardingIncomplete = !profile?.bio || !profile?.ethics_accepted_at

        if (
            profile?.role === 'READER' &&
            onboardingIncomplete
        ) {
            const path = request.nextUrl.pathname
            if (
                !path.startsWith('/dashboard/tarologa/onboarding') &&
                path.startsWith('/dashboard') // Only block dashboard access
            ) {
                return NextResponse.redirect(new URL('/dashboard/tarologa/onboarding', request.url))
            }
        }

        // 3. Under Review Enforcement
        // If onboarding is complete BUT verification is not APPROVED, redirect to under-review
        if (
            profile?.role === 'READER' &&
            !onboardingIncomplete &&
            profile?.verification_status !== 'APPROVED'
        ) {
            const path = request.nextUrl.pathname
            if (
                !path.startsWith('/dashboard/tarologa/under-review') &&
                path.startsWith('/dashboard') // Block dashboard access
            ) {
                return NextResponse.redirect(new URL('/dashboard/tarologa/under-review', request.url))
            }
        }
    } else if (request.nextUrl.pathname.startsWith('/admin') || request.nextUrl.pathname.startsWith('/dashboard')) {
        // Redirect unauthenticated users trying to access protected routes
        return NextResponse.redirect(new URL('/login', request.url))
    }

    return supabaseResponse
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public files
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
