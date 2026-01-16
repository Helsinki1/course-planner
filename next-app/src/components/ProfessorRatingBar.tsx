'use client';

interface ProfessorRatingBarProps {
  name: string;
  rating: number | null;
}

export default function ProfessorRatingBar({ name, rating }: ProfessorRatingBarProps) {
  const getBarColor = (rating: number | null): string => {
    if (rating === null) return 'var(--border-color)';
    if (rating < 2) return '#f85149';
    if (rating < 3.5) return 'var(--accent-yellow)';
    return 'var(--accent-green)';
  };

  const barWidth = rating !== null ? (rating / 5) * 100 : 0;

  return (
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
    </div>
  );
}
