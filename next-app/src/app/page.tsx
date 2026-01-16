'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Course, TimeSlot } from '@/types/course';
import { searchCourses } from '@/lib/api';
import SearchBar from '@/components/SearchBar';
import CourseCard from '@/components/CourseCard';
import CourseDetailModal from '@/components/CourseDetailModal';
import LoadingSkeleton from '@/components/LoadingSkeleton';

export default function Home() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<{
    course: Course;
    section: TimeSlot;
    sectionIndex: number;
  } | null>(null);

  const handleSearch = async (query: string) => {
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
  };

  const handleSectionSelect = (course: Course, section: TimeSlot, sectionIndex: number) => {
    setSelectedCourse({ course, section, sectionIndex });
  };

  const handleCloseModal = () => {
    setSelectedCourse(null);
  };

  return (
    <main
      className="min-h-screen p-6"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      <div className="max-w-5xl mx-auto">
        <header className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h1
              className="text-2xl font-bold"
              style={{ color: 'var(--text-primary)' }}
            >
              Course Planner
            </h1>
            <Link
              href="/map"
              className="px-4 py-2 rounded-lg text-sm transition-colors duration-200"
              style={{
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-color)',
              }}
            >
              Campus Map
            </Link>
          </div>
          <SearchBar onSearch={handleSearch} isLoading={isLoading} />
        </header>

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

      {selectedCourse && (
        <CourseDetailModal
          course={selectedCourse.course}
          section={selectedCourse.section}
          sectionIndex={selectedCourse.sectionIndex}
          onClose={handleCloseModal}
        />
      )}
    </main>
  );
}
