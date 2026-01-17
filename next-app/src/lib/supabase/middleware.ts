import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // Add timeout to prevent slow session refresh from blocking navigation
  let user = null;
  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Auth timeout')), 3000)
    );
    const userPromise = supabase.auth.getUser();
    const result = await Promise.race([userPromise, timeoutPromise]);
    user = result.data.user;
  } catch {
    // Timeout or error - treat as not authenticated
    user = null;
  }

  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicRoutes = ['/', '/login', '/auth/callback'];
  const isPublicRoute = publicRoutes.some((route) => pathname === route || pathname.startsWith('/auth/'));

  // Protected routes that require authentication and completed profile
  const protectedRoutes = ['/search', '/map', '/onboarding'];
  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));

  // If user is not authenticated and trying to access protected route
  if (!user && isProtectedRoute && pathname !== '/onboarding') {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // If user is authenticated, check if they have a profile for protected routes
  if (user && isProtectedRoute && pathname !== '/onboarding') {
    // Check if user has completed onboarding
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (!profile) {
      const url = request.nextUrl.clone();
      url.pathname = '/onboarding';
      return NextResponse.redirect(url);
    }
  }

  // If user is authenticated and on login page, redirect to search
  if (user && pathname === '/login') {
    // Check if they have a profile first
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    const url = request.nextUrl.clone();
    url.pathname = profile ? '/search' : '/onboarding';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

