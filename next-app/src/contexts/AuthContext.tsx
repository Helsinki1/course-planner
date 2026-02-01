'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import { UserProfile } from '@/types/user';

interface AuthResult {
  error?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<AuthResult>;
  signInWithEmail: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const isValidEmailDomain = (email: string): boolean => {
  return email.endsWith('@columbia.edu') || email.endsWith('@barnard.edu');
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    setProfile(data);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const fetchProfileWithTimeout = async (userId: string) => {
      try {
        const timeoutPromise = new Promise<null>((_, reject) => 
          setTimeout(() => reject(new Error('Profile fetch timeout')), 2000)
        );
        const profilePromise = supabase
          .from('user_profiles')
          .select('*')
          .eq('id', userId)
          .single();
        
        const result = await Promise.race([profilePromise, timeoutPromise]);
        if (isMounted && result && 'data' in result) {
          setProfile(result.data);
        }
      } catch {
        // Profile fetch timed out or failed - continue without profile
        console.warn('Profile fetch failed or timed out');
      }
    };

    const getSession = async () => {
      try {
        // Add timeout to prevent infinite loading on stale sessions
        const timeoutPromise = new Promise<null>((_, reject) => 
          setTimeout(() => reject(new Error('Session timeout')), 3000)
        );
        
        const sessionPromise = supabase.auth.getSession();
        
        const result = await Promise.race([sessionPromise, timeoutPromise]);
        
        if (!isMounted) return;
        
        const session = (result as { data: { session: Session | null } })?.data?.session;
        setSession(session ?? null);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchProfileWithTimeout(session.user.id);
        }
      } catch (error) {
        // Session expired or timed out - sign out to clear cookies and state
        console.warn('Session check failed:', error);
        try {
          await supabase.auth.signOut();
        } catch {
          // Ignore signOut errors
        }
        if (isMounted) {
          setSession(null);
          setUser(null);
          setProfile(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    // Global safety timeout - guarantee isLoading becomes false after 5 seconds max
    const safetyTimeout = setTimeout(() => {
      if (isMounted) {
        console.warn('Auth initialization safety timeout triggered');
        setIsLoading(false);
      }
    }, 5000);

    getSession().finally(() => {
      clearTimeout(safetyTimeout);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchProfileWithTimeout(session.user.id);
        } else {
          setProfile(null);
        }
        
        setIsLoading(false);
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const signUpWithEmail = async (email: string, password: string): Promise<AuthResult> => {
    if (!isValidEmailDomain(email)) {
      return { error: 'Only @columbia.edu and @barnard.edu email addresses are allowed.' };
    }

    if (password.length < 6) {
      return { error: 'Password must be at least 6 characters.' };
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      if (error.message.includes('already registered')) {
        return { error: 'An account with this email already exists.' };
      }
      return { error: error.message };
    }

    return {};
  };

  const signInWithEmail = async (email: string, password: string): Promise<AuthResult> => {
    if (!isValidEmailDomain(email)) {
      return { error: 'Only @columbia.edu and @barnard.edu email addresses are allowed.' };
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        return { error: 'Invalid email or password.' };
      }
      return { error: error.message };
    }

    return {};
  };

  const signOut = async () => {
    await supabase.auth.signOut({ scope: 'global' });
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isLoading,
        signInWithGoogle,
        signUpWithEmail,
        signInWithEmail,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

