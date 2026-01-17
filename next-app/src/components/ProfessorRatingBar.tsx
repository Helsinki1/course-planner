'use client';

import { CourseStats } from '@/types/course';

interface ProfessorRatingBarProps {
  name: string;
  rating: number | null;
  courses?: CourseStats;
  showHeader?: boolean;
}

export default function ProfessorRatingBar({ name, rating, courses, showHeader }: ProfessorRatingBarProps) {
  const getBarColor = (rating: number | null): string => {
    if (rating === null) return 'var(--border-color)';
    if (rating < 2) return '#f85149';
    if (rating < 3.5) return 'var(--accent-yellow)';
    return 'var(--accent-green)';
  };

  const barWidth = rating !== null ? (rating / 5) * 100 : 0;

  const formatStat = (value: number | null): string => {
    return value === null ? '?' : String(value);
  };

  const getCourseStats = (): [string, string, string, string] | null => {
    if (!courses || Object.keys(courses).length === 0) {
      return null;
    }
    const firstCourse = Object.values(courses)[0];
    if (!firstCourse) return null;
    return [
      formatStat(firstCourse[0]),
      formatStat(firstCourse[1]),
      formatStat(firstCourse[2]),
      formatStat(firstCourse[3]),
    ];
  };

  const stats = getCourseStats();

  return (
    <div className="space-y-1">
      {showHeader && (
        <div className="flex items-center gap-3 text-xs font-medium mb-2 pb-2 border-b" style={{ borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}>
          <span className="min-w-32">Professor</span>
          <span className="flex-1" style={{ maxWidth: '150px' }}>CULPA Rating</span>
          <span className="min-w-16"></span>
          <span className="w-10 text-center">HW</span>
          <span className="w-10 text-center">Mid</span>
          <span className="w-10 text-center">Final</span>
          <span className="w-12 text-center">Hrs/Wk</span>
        </div>
      )}
      <div className="flex items-center gap-3">
        <span className="text-sm min-w-32 truncate" style={{ color: 'var(--text-secondary)' }}>
          {name}
        </span>
        <div
          className="flex-1 h-2 rounded-full overflow-hidden"
          style={{
            backgroundColor: 'var(--border-color)',
            maxWidth: '150px',
          }}
        >
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${barWidth}%`,
              backgroundColor: getBarColor(rating),
            }}
          />
        </div>
        <span className="text-sm min-w-16" style={{ color: 'var(--text-secondary)' }}>
          {rating !== null ? `${rating.toFixed(1)} / 5` : 'No data'}
        </span>
        {stats ? (
          <>
            <span className="w-10 text-center text-sm" style={{ color: 'var(--text-course-code)' }}>{stats[0]}</span>
            <span className="w-10 text-center text-sm" style={{ color: 'var(--text-course-code)' }}>{stats[1]}</span>
            <span className="w-10 text-center text-sm" style={{ color: 'var(--text-course-code)' }}>{stats[2]}</span>
            <span className="w-12 text-center text-sm" style={{ color: 'var(--text-course-code)' }}>{stats[3]}</span>
          </>
        ) : (
          <>
            <span className="w-10 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>?</span>
            <span className="w-10 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>?</span>
            <span className="w-10 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>?</span>
            <span className="w-12 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>?</span>
          </>
        )}
      </div>
    </div>
  );
}
