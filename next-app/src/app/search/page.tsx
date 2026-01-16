'use client';

import { useState, useEffect, useCallback } from 'react';
import { Course, TimeSlot } from '@/types/course';
import { searchCourses } from '@/lib/api';
import Navbar from '@/components/Navbar';
import CourseCard from '@/components/CourseCard';
import CourseDetailModal from '@/components/CourseDetailModal';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import SelectedCoursesPanel from '@/components/SelectedCoursesPanel';
import { useSearch } from '@/contexts/SearchContext';

export default function SearchPage() {
  const { consumePendingQuery } = useSearch();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<{
    course: Course;
    section: TimeSlot;
    sectionIndex: number;
  } | null>(null);

  const handleSearch = useCallback(async (query: string) => {
    setIsLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const results = await searchCourses(query);
      setCourses(results);
    } catch (err) {
      setError('Failed to search courses. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auto-search if pending query from another page
  useEffect(() => {
    const query = consumePendingQuery();
    if (query) {
      handleSearch(query);
    }
  }, []);

  const handleSectionSelect = (course: Course, section: TimeSlot, sectionIndex: number) => {
    setSelectedCourse({ course, section, sectionIndex });
  };

  const handleCloseModal = () => {
    setSelectedCourse(null);
  };

  return (
    <>
      <Navbar onSearch={handleSearch} isLoading={isLoading} />
      <div
        className="min-h-screen flex"
        style={{ backgroundColor: 'var(--bg-primary)', paddingTop: '3.5rem' }}
      >
        {/* Main content area */}
        <main className="flex-1 overflow-auto px-8 py-6">
          <div className="max-w-4xl">
            <div className="space-y-4">
              {isLoading && <LoadingSkeleton />}

              {error && (
                <div
                  className="p-4 rounded-lg text-center"
                  style={{
                    backgroundColor: 'rgba(248, 81, 73, 0.1)',
                    color: '#f85149',
                  }}
                >
                  {error}
                </div>
              )}

              {!isLoading && !error && hasSearched && courses.length === 0 && (
                <div
                  className="p-8 rounded-lg text-center"
                  style={{ backgroundColor: 'var(--bg-card)' }}
                >
                  <p style={{ color: 'var(--text-secondary)' }}>
                    No courses found. Try a different search term.
                  </p>
                </div>
              )}

              {!isLoading && !error && courses.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Found {courses.length} course{courses.length !== 1 ? 's' : ''}
                  </p>
                  {courses.map((course, index) => (
                    <CourseCard
                      key={`${course.id}-${index}`}
                      course={course}
                      onSectionSelect={handleSectionSelect}
                    />
                  ))}
                </div>
              )}

              {!hasSearched && (
                <div
                  className="p-8 rounded-lg text-center"
                  style={{ backgroundColor: 'var(--bg-card)' }}
                >
                  <p style={{ color: 'var(--text-secondary)' }}>
                    Search for courses by name, professor, topic, or course code.
                  </p>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Right panel - Selected Courses */}
        <SelectedCoursesPanel />

        {selectedCourse && (
          <CourseDetailModal
            course={selectedCourse.course}
            section={selectedCourse.section}
            sectionIndex={selectedCourse.sectionIndex}
            onClose={handleCloseModal}
          />
        )}
      </div>
    </>
  );
}
