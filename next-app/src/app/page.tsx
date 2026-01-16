'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function LandingPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && user) {
      router.push('/search');
    }
  }, [user, isLoading, router]);

  const handleGetStarted = () => {
    router.push('/login');
  };

  // Show loading while checking auth
  if (isLoading) {
    return (
      <main
        className="min-h-screen flex flex-col items-center justify-center p-6"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
      </main>
    );
  }

  // If user is logged in, show nothing while redirecting
  if (user) {
    return (
      <main
        className="min-h-screen flex flex-col items-center justify-center p-6"
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        <p style={{ color: 'var(--text-secondary)' }}>Redirecting...</p>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      <h1
        className="text-6xl font-bold mb-8 text-center"
        style={{ color: 'var(--text-primary)' }}
      >
        Welcome to Lion-Cal
      </h1>

      <button
        onClick={handleGetStarted}
        className="px-8 py-4 rounded-lg text-lg font-medium transition-colors duration-200 hover:opacity-90"
        style={{
          backgroundColor: 'var(--accent-green)',
          color: 'var(--bg-primary)',
        }}
      >
        Get Started
      </button>
    </main>
  );
}
