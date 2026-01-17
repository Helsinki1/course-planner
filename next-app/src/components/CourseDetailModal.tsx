'use client';

import { useEffect, useState } from 'react';
import { Course, TimeSlot, ProfessorRatings, ProfessorData } from '@/types/course';
import { getProfessorRatings, checkCourseTaken, markCourseTaken, unmarkCourseTaken } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
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
  const { user } = useAuth();
  const [ratings, setRatings] = useState<ProfessorRatings>({});
  const [loadingRatings, setLoadingRatings] = useState(true);
  const [isTaken, setIsTaken] = useState(false);
  const [loadingTaken, setLoadingTaken] = useState(true);
  const [updatingTaken, setUpdatingTaken] = useState(false);

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

  useEffect(() => {
    const checkTaken = async () => {
      if (!user) {
        setLoadingTaken(false);
        return;
      }
      
      setLoadingTaken(true);
      try {
        const taken = await checkCourseTaken(user.id, course.id);
        setIsTaken(taken);
      } catch (error) {
        console.error('Failed to check course taken status:', error);
      } finally {
        setLoadingTaken(false);
      }
    };

    checkTaken();
  }, [user, course.id]);

  const handleToggleTaken = async () => {
    if (!user || updatingTaken) return;

    setUpdatingTaken(true);
    try {
      if (isTaken) {
        await unmarkCourseTaken(user.id, course.id);
        setIsTaken(false);
      } else {
        await markCourseTaken(user.id, course.id, course.name);
        setIsTaken(true);
      }
    } catch (error) {
      console.error('Failed to update course taken status:', error);
    } finally {
      setUpdatingTaken(false);
    }
  };

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
              <div className="space-y-2">
                {/* Column headers */}
                <div 
                  className="flex items-center gap-3 text-xs font-medium pb-2 border-b" 
                  style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
                >
                  <span style={{ width: '128px' }}>Professor</span>
                  <span style={{ width: '150px' }}>Rating</span>
                  <span style={{ width: '64px' }}></span>
                  <span style={{ width: '40px', textAlign: 'center' }}>#HWs</span>
                  <span style={{ width: '40px', textAlign: 'center' }}>#MTs</span>
                  <span style={{ width: '40px', textAlign: 'center' }}>#Finals</span>
                  <span style={{ width: '48px', textAlign: 'center' }}>Hrs/Wk</span>
                </div>
                {course.times.map((timeSlot, index) => {
                  if (!timeSlot.professor || timeSlot.professor.trim() === '') {
                    return null;
                  }
                  const professorData = ratings[timeSlot.professor];
                  const isProfessorData = (data: ProfessorData | number | null | undefined): data is ProfessorData => {
                    return data !== null && data !== undefined && typeof data === 'object' && 'rating' in data;
                  };
                  const rating = isProfessorData(professorData) ? professorData.rating : (typeof professorData === 'number' ? professorData : null);
                  const courses = isProfessorData(professorData) ? professorData.courses : undefined;
                  return (
                    <ProfessorRatingBar
                      key={index}
                      name={timeSlot.professor}
                      rating={rating}
                      courses={courses}
                      showHeader={false}
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

          {/* Mark Taken/Untaken button */}
          <div className="pt-4 border-t flex flex-col items-center" style={{ borderColor: 'var(--border-color)' }}>
            <button
              onClick={handleToggleTaken}
              disabled={loadingTaken || updatingTaken}
              className="px-6 py-4 rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-50 hover:scale-105"
              style={{
                backgroundColor: isTaken ? 'var(--bg-card-hover)' : 'var(--accent-yellow)',
                color: isTaken ? 'var(--text-secondary)' : 'var(--bg-primary)',
                border: isTaken ? '1px solid var(--border-color)' : 'none',
                minWidth: '140px',
                boxShadow: isTaken ? 'none' : '0 2px 4px rgba(210, 153, 34, 0.3)',
              }}
            >
              {loadingTaken ? 'Loading...' : updatingTaken ? 'Updating...' : isTaken ? 'Mark Untaken' : 'Mark Taken'}
            </button>
            <p className="text-xs mt-3 text-center" style={{ color: 'var(--text-secondary)' }}>
              {isTaken 
                ? 'You have marked this course as taken. Click to remove from your taken courses.'
                : 'Mark this course as taken to track your academic progress.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
