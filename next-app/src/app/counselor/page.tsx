'use client';

import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import SelectedCoursesPanel from '@/components/SelectedCoursesPanel';
import { useSearch } from '@/contexts/SearchContext';

export default function CounselorPage() {
  const router = useRouter();
  const { setPendingQuery } = useSearch();

  // Set pending query and navigate to search page
  const handleSearch = (query: string) => {
    setPendingQuery(query);
    router.push('/search');
  };

  return (
    <>
      <Navbar onSearch={handleSearch} isLoading={false} />
      <div
        className="min-h-screen flex"
        style={{ backgroundColor: 'var(--bg-primary)', paddingTop: '3.5rem' }}
      >
        {/* Main content */}
        <div className="flex-1 overflow-auto p-6">
          <div
            className="rounded-lg border p-6"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
          >
            <h1
              className="text-2xl font-bold mb-4"
              style={{ color: 'var(--text-primary)' }}
            >
              Counselor
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              Coming soon: Get personalized course recommendations and academic advice.
            </p>
          </div>
        </div>

        {/* Right panel */}
        <SelectedCoursesPanel />
      </div>
    </>
  );
}

