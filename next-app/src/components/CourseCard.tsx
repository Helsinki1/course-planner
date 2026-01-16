'use client';

import { useState } from 'react';
import { Course, TimeSlot } from '@/types/course';
import CourseSection from './CourseSection';

interface CourseCardProps {
  course: Course;
  onSectionSelect: (course: Course, section: TimeSlot, sectionIndex: number) => void;
}

export default function CourseCard({ course, onSectionSelect }: CourseCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const sectionCount = course.times?.length || 0;

  return (
    <div
      className="rounded-lg border transition-colors duration-200"
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border-color)',
      }}
    >
      <div
        className="p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3
                className="text-base font-semibold"
                style={{ color: 'var(--text-course-name)' }}
              >
                {course.name}
              </h3>
              <span
                className="text-sm"
                style={{ color: 'var(--text-course-code)' }}
              >
                {course.id}
              </span>
            </div>
            {course.description && (
              <p
                className="text-sm mt-2 line-clamp-2"
                style={{ color: 'var(--text-secondary)' }}
              >
                {course.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 ml-4">
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {sectionCount} section{sectionCount !== 1 ? 's' : ''}
            </span>
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
              style={{
                color: 'var(--text-secondary)',
                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s ease',
              }}
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </div>
        </div>
      </div>

      {isExpanded && course.times && course.times.length > 0 && (
        <div className="px-4 pb-4 space-y-3">
          <div
            className="border-t pt-4"
            style={{ borderColor: 'var(--border-color)' }}
          >
            <div className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
              Prerequisites: {course.description?.includes('Prerequisite') ? 'See description' : 'None listed'}
            </div>
            <div className="space-y-3">
              {course.times.map((section, index) => (
                <CourseSection
                  key={index}
                  section={section}
                  sectionNumber={index + 1}
                  credits={course.credits}
                  courseId={course.id}
                  courseName={course.name}
                  onSelect={() => onSectionSelect(course, section, index)}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
