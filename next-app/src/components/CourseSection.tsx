'use client';

import { TimeSlot } from '@/types/course';
import { useSelectedCourses } from '@/contexts/SelectedCoursesContext';
import { useAuth } from '@/contexts/AuthContext';

interface CourseSectionProps {
  section: TimeSlot;
  sectionNumber: number;
  credits: number;
  courseId: string;
  courseName: string;
  onSelect: () => void;
}

export default function CourseSection({
  section,
  sectionNumber,
  credits,
  courseId,
  courseName,
  onSelect,
}: CourseSectionProps) {
  const { addCourse, isCourseSelected } = useSelectedCourses();
  const { user } = useAuth();
  const isRestricted = section.enrollment >= section.capacity;
  const enrollmentPercent = (section.enrollment / section.capacity) * 100;
  const isSelected = isCourseSelected(courseId, sectionNumber - 1);

  const handleAdd = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      alert('Please sign in to add courses to your schedule.');
      return;
    }
    try {
      await addCourse(courseId, courseName, sectionNumber - 1, section, credits);
    } catch (error) {
      console.error('Failed to add course:', error);
      alert(`Failed to add course: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div
      className="p-4 rounded-lg cursor-pointer transition-colors duration-200 border"
      style={{
        backgroundColor: 'var(--bg-card-hover)',
        borderColor: 'var(--border-color)',
      }}
      onClick={onSelect}
    >
      {/* Section header */}
      <div className="flex items-start mb-2">
        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          Section {String(sectionNumber).padStart(3, '0')}
        </span>
        {isRestricted && (
          <span
            className="ml-2 px-2 py-0.5 text-xs rounded"
            style={{
              backgroundColor: 'rgba(63, 185, 80, 0.2)',
              color: 'var(--accent-green)',
            }}
          >
            Full Capacity
          </span>
        )}
      </div>

      <div className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
        LECTURE • In-Person • {credits} credits • Full Term
      </div>

      {/* Main content row: course info on left, capacity bar + button on right */}
      <div className="flex items-center gap-4">
        {/* Left - course details */}
        <div
          className="flex-1 p-3 rounded-md"
          style={{ backgroundColor: 'var(--bg-card)' }}
        >
          <div className="font-medium text-sm" style={{ color: 'var(--text-course-code)' }}>
            {section.days.join(' ')} {section.time}
          </div>
          <div className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {section.location}
          </div>
          {section.professor && (
            <div className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              {section.professor}
            </div>
          )}
        </div>

        {/* Right - capacity bar and Add button */}
        <div className="flex items-center gap-4">
          {/* Capacity bar */}
          <div className="flex flex-col items-center gap-1">
            <div
              style={{
                width: '100px',
                height: '10px',
                backgroundColor: 'var(--border-color)',
                borderRadius: '5px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${enrollmentPercent}%`,
                  height: '100%',
                  backgroundColor: isRestricted ? 'var(--accent-yellow)' : 'var(--accent-green)',
                  borderRadius: '5px',
                  transition: 'width 0.3s',
                }}
              />
            </div>
            <span
              className="text-xs font-medium"
              style={{ color: isRestricted ? 'var(--accent-yellow)' : 'var(--accent-green)' }}
            >
              {section.enrollment}/{section.capacity}
            </span>
          </div>

          {/* Add button */}
          <button
            onClick={handleAdd}
            disabled={isSelected}
            className="rounded-lg text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
            style={{
              width: '110px',
              height: '40px',
              backgroundColor: isSelected ? 'var(--bg-card)' : 'var(--accent-green)',
              color: isSelected ? 'var(--text-secondary)' : 'var(--bg-primary)',
              border: isSelected ? '1px solid var(--border-color)' : 'none',
              boxShadow: isSelected ? 'none' : '0 2px 4px rgba(63, 185, 80, 0.3)',
            }}
          >
            {isSelected ? 'Added' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
}
