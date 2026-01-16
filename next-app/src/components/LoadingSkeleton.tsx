'use client';

export default function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 12 }, (_, i) => i + 1).map((i) => (
        <div
          key={i}
          className="rounded-lg p-4 animate-pulse"
          style={{ backgroundColor: 'var(--bg-card)' }}
        >
          <div className="flex justify-between items-start mb-3">
            <div className="space-y-2 flex-1">
              <div
                className="h-5 rounded w-3/4"
                style={{ backgroundColor: 'var(--bg-card-hover)' }}
              />
              <div
                className="h-4 rounded w-1/4"
                style={{ backgroundColor: 'var(--bg-card-hover)' }}
              />
            </div>
            <div
              className="h-4 rounded w-20"
              style={{ backgroundColor: 'var(--bg-card-hover)' }}
            />
          </div>
          <div className="space-y-2">
            <div
              className="h-3 rounded w-full"
              style={{ backgroundColor: 'var(--bg-card-hover)' }}
            />
            <div
              className="h-3 rounded w-5/6"
              style={{ backgroundColor: 'var(--bg-card-hover)' }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
