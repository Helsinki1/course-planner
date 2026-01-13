'use client';

import dynamic from 'next/dynamic';

// Dynamic import with SSR disabled - Mapbox GL requires browser APIs
const CampusMap = dynamic(() => import('@/components/CampusMap'), {
  ssr: false,
});

export default function Home() {
  return (
    <main className="w-screen h-screen overflow-hidden">
      <CampusMap />
    </main>
  );
}
