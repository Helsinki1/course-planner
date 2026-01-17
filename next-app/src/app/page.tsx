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
      className="min-h-screen flex flex-col items-center justify-center p-10"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      {/* Content */}
      <div className="relative z-10 text-center max-w-2xl mb-10">
        <h1
          className="text-5xl md:text-6xl font-bold mb-10"
          style={{ color: 'var(--text-primary)' }}
        >
          Welcome to{' '}
          <span style={{ color: 'var(--text-course-name)' }}>Lion-Cal</span>
        </h1>

        <div className="h-4" style={{ backgroundColor: 'var(--bg-primary)' }}></div>

        <p
          className="text-lg md:text-xl mb-8 leading-relaxed"
          style={{ color: 'var(--text-secondary)' }}
        >
          The smarter way to plan your Columbia courses.
        </p>

        <div className="h-10" style={{ backgroundColor: 'var(--bg-primary)' }}></div>

        {/* Feature highlights */}
        <div className="grid grid-cols-2 gap-4 mb-10 text-left">
          <div
            className="p-4 rounded-lg border"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
          >
            <div className="text-sm font-medium mb-1" style={{ color: 'var(--text-course-code)' }}>
              Semantic Search
            </div>
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Find courses by topic, professor, or vibe
            </div>
          </div>
          <div
            className="p-4 rounded-lg border"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
          >
            <div className="text-sm font-medium mb-1" style={{ color: 'var(--text-course-code)' }}>
              AI Academic Advisor
            </div>
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Get personalized course recommendations
            </div>
          </div>
          <div
            className="p-4 rounded-lg border"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
          >
            <div className="text-sm font-medium mb-1" style={{ color: 'var(--text-course-code)' }}>
              3D Campus Map
            </div>
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Explore Columbia w/ Interactive Map
            </div>
          </div>
          <div
            className="p-4 rounded-lg border"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
          >
            <div className="text-sm font-medium mb-1" style={{ color: 'var(--text-course-code)' }}>
              Share with Friends
            </div>
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Compare schedules and plan together
            </div>
          </div>
        </div>

        <div className="h-10" style={{ backgroundColor: 'var(--bg-primary)' }}></div>

        <button
          onClick={handleGetStarted}
          className="h-9 w-40 rounded-lg text-lg font-medium transition-all duration-200 hover:opacity-90 hover:scale-105"
          style={{
            backgroundColor: 'var(--accent-green)',
            color: 'var(--bg-primary)',
          }}
        >
          Get Started
        </button>

        <div className="h-4" style={{ backgroundColor: 'var(--bg-primary)' }}></div>

        <p
          className="mt-6 text-sm"
          style={{ color: 'var(--text-secondary)' }}
        >
          For Columbia and Barnard students
        </p>
      </div>
    </main>
  );
}
