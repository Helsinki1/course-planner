'use client';

import { useSelectedCourses } from '@/contexts/SelectedCoursesContext';
import { SelectedCourse } from '@/types/course';

interface SelectedCoursesPanelProps {
  className?: string;
}

export default function SelectedCoursesPanel({ className = '' }: SelectedCoursesPanelProps) {
  const { selectedCourses, isLoading, highlightedCourseId, removeCourse, setHighlightedCourseId } = useSelectedCourses();

  const totalCredits = selectedCourses.reduce((sum, course) => sum + (course.credits || 0), 0);

  const handleRemove = async (course: SelectedCourse) => {
    try {
      await removeCourse(course.course_id, course.section_index);
    } catch (error) {
      console.error('Failed to remove course:', error);
    }
  };

  return (
    <div
      className={`h-full flex flex-col border-l ${className}`}
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border-color)',
        width: '340px',
        minWidth: '340px',
      }}
    >
      {/* Header */}
      <div className="p-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex items-center gap-2 mb-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: 'var(--text-secondary)' }}
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            My Planner
          </h2>
        </div>

        {/* Credits summary bar */}
        <div className="h-2 rounded-full overflow-hidden flex" style={{ backgroundColor: 'var(--border-color)' }}>
          <div
            className="h-full"
            style={{
              width: `${Math.min((totalCredits / 18) * 100, 100)}%`,
              backgroundColor: 'var(--accent-green)',
            }}
          />
        </div>

        {/* Stats */}
        <div className="mt-3 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span
              className="px-2 py-0.5 rounded text-xs"
              style={{ backgroundColor: 'var(--bg-card-hover)', color: 'var(--text-primary)' }}
            >
              {totalCredits} credits
            </span>
            <span
              className="px-2 py-0.5 rounded text-xs"
              style={{ backgroundColor: 'var(--bg-card-hover)', color: 'var(--text-primary)' }}
            >
              {selectedCourses.length} courses
            </span>
          </div>
        </div>
      </div>

      {/* Course list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
            Selected Classes
          </span>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-32 rounded-lg animate-pulse"
                style={{ backgroundColor: 'var(--bg-card-hover)' }}
              />
            ))}
          </div>
        ) : selectedCourses.length === 0 ? (
          <div
            className="p-4 rounded-lg text-center text-sm"
            style={{ backgroundColor: 'var(--bg-card-hover)', color: 'var(--text-secondary)' }}
          >
            No courses selected yet. Search for courses and click &quot;Add&quot; to add them to your planner.
          </div>
        ) : (
          <div className="space-y-3">
            {selectedCourses.map((course) => (
              <SelectedCourseCard
                key={`${course.course_id}-${course.section_index}`}
                course={course}
                isHighlighted={highlightedCourseId === course.course_id}
                onRemove={() => handleRemove(course)}
                onClick={() => setHighlightedCourseId(course.course_id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface SelectedCourseCardProps {
  course: SelectedCourse;
  isHighlighted: boolean;
  onRemove: () => void;
  onClick: () => void;
}

function SelectedCourseCard({ course, isHighlighted, onRemove, onClick }: SelectedCourseCardProps) {
  const section = course.section_data;

  return (
    <div
      className="rounded-lg border overflow-hidden cursor-pointer transition-all duration-200"
      style={{
        backgroundColor: 'var(--bg-card-hover)',
        borderColor: isHighlighted ? 'var(--accent-green)' : 'var(--border-color)',
        borderWidth: isHighlighted ? '2px' : '1px',
      }}
      onClick={onClick}
    >
      {/* Status badge */}
      <div
        className="px-3 py-1.5 text-xs font-medium"
        style={{ backgroundColor: 'rgba(63, 185, 80, 0.2)', color: 'var(--accent-green)' }}
      >
        ___________________________________________________
      </div>

      {/* Course info */}
      <div className="p-3">
        <h3
          className="text-sm font-semibold mb-1"
          style={{ color: 'var(--text-course-name)' }}
        >
          {course.course_name}
        </h3>
        <p className="text-xs mb-1" style={{ color: 'var(--text-course-code)' }}>
          {course.course_id}
        </p>
        <p className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
          Section {String(course.section_index + 1).padStart(3, '0')} • {course.credits} credits • Full Term
        </p>

        {/* Time slot info */}
        <div
          className="p-2 rounded text-xs"
          style={{ backgroundColor: 'var(--bg-card)' }}
        >
          <div style={{ color: 'var(--text-course-code)' }}>
            {section.days.join(' ')} {section.time}
          </div>
          <div className="mt-1" style={{ color: 'var(--text-secondary)' }}>
            {section.location}
          </div>
          <div className="mt-1" style={{ color: 'var(--text-secondary)' }}>
            {section.professor}
          </div>
        </div>

        {/* Remove button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="mt-3 px-3 py-1.5 rounded text-xs font-medium transition-colors duration-200 hover:opacity-80"
          style={{
            backgroundColor: 'var(--bg-card)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-color)',
          }}
        >
          Remove
        </button>
      </div>
    </div>
  );
}
