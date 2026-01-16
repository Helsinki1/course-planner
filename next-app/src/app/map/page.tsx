'use client';

import dynamic from 'next/dynamic';

const CampusMap = dynamic(() => import('@/components/CampusMap'), {
  ssr: false,
});

export default function MapPage() {
  return (
    <main className="w-screen h-screen overflow-hidden">
      <CampusMap />
    </main>
  );
}
