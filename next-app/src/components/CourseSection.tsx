'use client';

import { TimeSlot } from '@/types/course';
import { useSelectedCourses } from '@/contexts/SelectedCoursesContext';

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
  const isRestricted = section.enrollment >= section.capacity;
  const enrollmentPercent = (section.enrollment / section.capacity) * 100;
  const isSelected = isCourseSelected(courseId, sectionNumber - 1);

  const handleAdd = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await addCourse(courseId, courseName, sectionNumber - 1, section, credits);
    } catch (error) {
      console.error('Failed to add course:', error);
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
      <div className="flex justify-between items-start mb-2">
        <div>
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
          <span
            className="ml-2 px-2 py-0.5 text-xs rounded"
            style={{
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-secondary)',
            }}
          >
            {section.enrollment}/{section.capacity}
          </span>
        </div>
      </div>

      <div className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
        LECTURE • In-Person • {credits} credits • Full Term
      </div>

      <div
        className="p-3 rounded-md"
        style={{ backgroundColor: 'var(--bg-card)' }}
      >
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <div className="font-medium text-sm" style={{ color: 'var(--text-course-code)' }}>
              {section.days.join(' ')} {section.time}
            </div>
            <div className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              {section.location}
            </div>
            <div className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              {section.professor}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="w-24 h-2 rounded-full overflow-hidden"
              style={{ backgroundColor: 'var(--border-color)' }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${enrollmentPercent}%`,
                  backgroundColor: isRestricted ? 'var(--accent-yellow)' : 'var(--accent-green)',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Add button */}
      <div className="mt-3 flex justify-end">
        <button
          onClick={handleAdd}
          disabled={isSelected}
          className="px-4 py-1.5 rounded text-xs font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor: isSelected ? 'var(--bg-card)' : 'var(--accent-green)',
            color: isSelected ? 'var(--text-secondary)' : 'var(--bg-primary)',
            border: isSelected ? '1px solid var(--border-color)' : 'none',
          }}
        >
          {isSelected ? 'Added' : 'Add'}
        </button>
      </div>
    </div>
  );
}
