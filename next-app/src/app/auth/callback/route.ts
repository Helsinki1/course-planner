import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { type EmailOtpType } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = searchParams.get('next') ?? '/search';

  const supabase = await createClient();

  // Handle email confirmation (signup, recovery, etc.)
  if (token_hash && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });

    if (!error && data.user) {
      // Validate email domain
      const email = data.user.email;
      if (email) {
        const isValidDomain =
          email.endsWith('@columbia.edu') || email.endsWith('@barnard.edu');

        if (!isValidDomain) {
          await supabase.auth.signOut();
          const errorUrl = new URL('/login', origin);
          errorUrl.searchParams.set('error', 'invalid_email');
          return NextResponse.redirect(errorUrl);
        }
      }

      // Check if user has a profile
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', data.user.id)
        .single();

      // For signup confirmations, redirect to onboarding if no profile
      const redirectTo = profile ? next : '/onboarding';
      
      // Show success message for email confirmation
      if (type === 'signup') {
        const successUrl = new URL(redirectTo, origin);
        if (!profile) {
          // Redirect to onboarding after successful email confirmation
          return NextResponse.redirect(successUrl);
        }
        successUrl.searchParams.set('message', 'Email confirmed successfully!');
        return NextResponse.redirect(successUrl);
      }

      return redirectWithHost(request, origin, redirectTo);
    }

    // Token verification failed
    return NextResponse.redirect(`${origin}/login?error=auth_error`);
  }

  // Handle OAuth code exchange (Google, etc.)
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Validate email domain
      const email = data.user.email;
      if (email) {
        const isValidDomain =
          email.endsWith('@columbia.edu') || email.endsWith('@barnard.edu');

        if (!isValidDomain) {
          // Sign out the user if email domain is invalid
          await supabase.auth.signOut();
          
          // Redirect to login with error
          const errorUrl = new URL('/login', origin);
          errorUrl.searchParams.set('error', 'invalid_email');
          return NextResponse.redirect(errorUrl);
        }
      }

      // Check if user has a profile
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', data.user.id)
        .single();

      // Redirect to onboarding if no profile, otherwise to home
      const redirectTo = profile ? next : '/onboarding';
      return redirectWithHost(request, origin, redirectTo);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_error`);
}

function redirectWithHost(request: Request, origin: string, path: string) {
  const forwardedHost = request.headers.get('x-forwarded-host');
  const isLocalEnv = process.env.NODE_ENV === 'development';

  if (isLocalEnv) {
    return NextResponse.redirect(`${origin}${path}`);
  } else if (forwardedHost) {
    return NextResponse.redirect(`https://${forwardedHost}${path}`);
  } else {
    return NextResponse.redirect(`${origin}${path}`);
  }
}
