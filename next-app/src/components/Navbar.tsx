'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

const PLACEHOLDER_EXAMPLES = [
  'Math and CS courses with Tony Dear...',
  'Cultural classes exploring the Upper West side...',
  'Econ courses with Gulati...',
  'Best classes to take for finance/consulting...',
  'Intro physics electricity and magnetism...',
  'Least brutal pre-med courses...',
  'University Writing courses...',
];

interface NavbarProps {
  onSearch: (query: string) => void;
  isLoading?: boolean;
}

export default function Navbar({ onSearch, isLoading }: NavbarProps) {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [query, setQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [placeholder, setPlaceholder] = useState('.');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Set random placeholder on client only to avoid hydration mismatch
  useEffect(() => {
    setPlaceholder(PLACEHOLDER_EXAMPLES[Math.floor(Math.random() * PLACEHOLDER_EXAMPLES.length)]);
  }, []);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && query.trim()) {
      onSearch(query.trim());
    }
  };

  const handleSearch = () => {
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  const handleLogout = async () => {
    await signOut();
    setIsDropdownOpen(false);
    router.push('/');
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get user initials for avatar
  const getInitials = () => {
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 h-14 flex items-center px-4 border-b"
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border-color)',
      }}
    >
      <div className="flex items-center justify-between w-full max-w-7xl mx-auto gap-4">
        {/* Logo */}
        <Link
          href="/search"
          className="text-lg font-bold shrink-0"
          style={{ color: 'var(--text-primary)' }}
        >
          Lion-Cal
        </Link>

        {/* Search Bar */}
        <div className="flex-1 max-w-2xl">
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={isLoading}
              className="w-full px-4 py-2 text-sm rounded-lg border transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--text-course-code)] disabled:opacity-50"
              style={{
                backgroundColor: 'var(--bg-primary)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)',
              }}
            />
            <button
              onClick={handleSearch}
              disabled={isLoading || !query.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded transition-colors duration-200 disabled:opacity-50"
              style={{
                backgroundColor: 'transparent',
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ color: 'var(--text-secondary)' }}
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
            </button>
          </div>
        </div>

        {/* Right side - Map link and Profile */}
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/map"
            className="px-3 py-1.5 rounded-lg text-sm transition-colors duration-200 hover:opacity-80"
            style={{
              color: 'var(--text-secondary)',
            }}
          >
            Map
          </Link>

          {/* Profile Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors duration-200 hover:opacity-80"
              style={{
                backgroundColor: 'var(--accent-green)',
                color: 'var(--bg-primary)',
              }}
            >
              {getInitials()}
            </button>

            {isDropdownOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-40 rounded-lg border shadow-lg overflow-hidden"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border-color)',
                }}
              >
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2.5 text-left text-sm transition-colors duration-200 hover:bg-[var(--bg-card-hover)]"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

