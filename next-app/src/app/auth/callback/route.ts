import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/search';

  if (code) {
    const supabase = await createClient();
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
      const forwardedHost = request.headers.get('x-forwarded-host');
      const isLocalEnv = process.env.NODE_ENV === 'development';

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${redirectTo}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${redirectTo}`);
      } else {
        return NextResponse.redirect(`${origin}${redirectTo}`);
      }
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_error`);
}

