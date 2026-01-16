'use client';

import { useEffect, useState } from 'react';
import { Course, TimeSlot, ProfessorRatings } from '@/types/course';
import { getProfessorRatings } from '@/lib/api';
import ProfessorRatingBar from './ProfessorRatingBar';

interface CourseDetailModalProps {
  course: Course;
  section: TimeSlot;
  sectionIndex: number;
  onClose: () => void;
}

export default function CourseDetailModal({
  course,
  section,
  sectionIndex,
  onClose,
}: CourseDetailModalProps) {
  const [ratings, setRatings] = useState<ProfessorRatings>({});
  const [loadingRatings, setLoadingRatings] = useState(true);

  useEffect(() => {
    const fetchRatings = async () => {
      setLoadingRatings(true);
      try {
        const professorNames = course.times
          .map((t) => t.professor)
          .filter((name) => name && name.trim() !== '');
        
        if (professorNames.length > 0) {
          const fetchedRatings = await getProfessorRatings(professorNames);
          setRatings(fetchedRatings);
        }
      } catch (error) {
        console.error('Failed to fetch professor ratings:', error);
      } finally {
        setLoadingRatings(false);
      }
    };

    fetchRatings();
  }, [course.times]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
      onClick={handleBackdropClick}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg border"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-color)',
        }}
      >
        <div className="sticky top-0 p-4 border-b flex justify-between items-start" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div>
            <h2
              className="text-xl font-semibold"
              style={{ color: 'var(--text-course-name)' }}
            >
              {course.name}
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--text-course-code)' }}>
              {course.id}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-md transition-colors duration-200"
            style={{ backgroundColor: 'var(--bg-card-hover)' }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: 'var(--text-secondary)' }}
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-6">
          <div>
            <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Description
            </h3>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {course.description || 'No description available.'}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Course Details
            </h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div style={{ color: 'var(--text-secondary)' }}>Credits:</div>
              <div style={{ color: 'var(--text-primary)' }}>{course.credits}</div>
              <div style={{ color: 'var(--text-secondary)' }}>School:</div>
              <div style={{ color: 'var(--text-primary)' }}>{course.school || 'N/A'}</div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Selected Section
            </h3>
            <div
              className="p-4 rounded-lg border"
              style={{
                backgroundColor: 'var(--bg-card-hover)',
                borderColor: 'var(--border-color)',
              }}
            >
              <div className="flex justify-between items-start mb-3">
                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                  Section {String(sectionIndex + 1).padStart(3, '0')}
                </span>
                <span
                  className="px-2 py-0.5 text-xs rounded"
                  style={{
                    backgroundColor: section.enrollment >= section.capacity
                      ? 'rgba(210, 153, 34, 0.2)'
                      : 'rgba(63, 185, 80, 0.2)',
                    color: section.enrollment >= section.capacity
                      ? 'var(--accent-yellow)'
                      : 'var(--accent-green)',
                  }}
                >
                  {section.enrollment}/{section.capacity}
                </span>
              </div>
              <div className="space-y-1 text-sm">
                <div style={{ color: 'var(--text-course-code)' }}>
                  {section.days.join(' ')} {section.time}
                </div>
                <div style={{ color: 'var(--text-secondary)' }}>{section.location}</div>
                <div style={{ color: 'var(--text-secondary)' }}>{section.professor}</div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
              Professor Ratings (CULPA)
            </h3>
            {loadingRatings ? (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-6 rounded animate-pulse"
                    style={{ backgroundColor: 'var(--bg-card-hover)' }}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {course.times.map((timeSlot, index) => {
                  if (!timeSlot.professor || timeSlot.professor.trim() === '') {
                    return null;
                  }
                  const rating = ratings[timeSlot.professor] ?? null;
                  return (
                    <ProfessorRatingBar
                      key={index}
                      name={timeSlot.professor}
                      rating={rating}
                    />
                  );
                })}
                {course.times.every((t) => !t.professor || t.professor.trim() === '') && (
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    No professor information available.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
