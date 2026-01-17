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
      className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      {/* Decorative background patterns */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Top-left circle */}
        <div
          className="absolute -top-32 -left-32 w-64 h-64 rounded-full opacity-10"
          style={{ backgroundColor: 'var(--text-course-name)' }}
        />
        {/* Top-right circle */}
        <div
          className="absolute -top-20 -right-20 w-48 h-48 rounded-full opacity-10"
          style={{ backgroundColor: 'var(--text-course-code)' }}
        />
        {/* Bottom-left circle */}
        <div
          className="absolute -bottom-24 -left-24 w-56 h-56 rounded-full opacity-10"
          style={{ backgroundColor: 'var(--accent-green)' }}
        />
        {/* Bottom-right circle */}
        <div
          className="absolute -bottom-16 -right-16 w-40 h-40 rounded-full opacity-10"
          style={{ backgroundColor: 'var(--text-course-name)' }}
        />
        {/* Diagonal lines */}
        <div
          className="absolute top-1/4 left-0 w-full h-px opacity-5"
          style={{ backgroundColor: 'var(--text-primary)', transform: 'rotate(-5deg)' }}
        />
        <div
          className="absolute top-3/4 left-0 w-full h-px opacity-5"
          style={{ backgroundColor: 'var(--text-primary)', transform: 'rotate(3deg)' }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center max-w-2xl">
        <h1
          className="text-5xl md:text-6xl font-bold mb-6"
          style={{ color: 'var(--text-primary)' }}
        >
          Welcome to{' '}
          <span style={{ color: 'var(--text-course-name)' }}>Lion-Cal</span>
        </h1>

        <p
          className="text-lg md:text-xl mb-8 leading-relaxed"
          style={{ color: 'var(--text-secondary)' }}
        >
          The smarter way to plan your Columbia courses.
        </p>

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
              Explore Columbia in stunning 3D
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

        <button
          onClick={handleGetStarted}
          className="px-8 py-4 rounded-lg text-lg font-medium transition-all duration-200 hover:opacity-90 hover:scale-105"
          style={{
            backgroundColor: 'var(--accent-green)',
            color: 'var(--bg-primary)',
          }}
        >
          Get Started
        </button>

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
