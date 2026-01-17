'use client';

import { useRef, useCallback, useState, useEffect } from 'react';
import { Map, NavigationControl, FullscreenControl } from 'react-map-gl/mapbox';
import type { MapRef } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Columbia University Morningside Heights Campus coordinates
const COLUMBIA_CENTER = {
  longitude: -73.9626,
  latitude: 40.8075,
};

const INITIAL_VIEW_STATE = {
  ...COLUMBIA_CENTER,
  zoom: 16.5,
  pitch: 60,    // Important for 3D architectural effect
  bearing: -20, // Slight rotation for visual interest
};

// Bounding box around Columbia campus + buffer
// [Southwest corner, Northeast corner]
// This restricts panning and reduces tile loading for better performance
const CAMPUS_BOUNDS: [[number, number], [number, number]] = [
  [-73.975, 40.800],  // SW: West of Broadway, south of 114th St
  [-73.950, 40.815],  // NE: East of Amsterdam, north of 122nd St
];

export default function CampusMap() {
  const mapRef = useRef<MapRef>(null);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch token from Python backend
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/mapbox-token`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to get map token');
        return res.json();
      })
      .then((data) => setToken(data.token))
      .catch((err) => setError(err.message));
  }, []);

  // Configure Mapbox Standard style with architectural lighting
  const onMapLoad = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    // Set light preset to 'dusk' for dramatic architectural shadows
    map.setConfigProperty('basemap', 'lightPreset', 'dusk');

    // Hide POI labels for a cleaner architectural visualization
    map.setConfigProperty('basemap', 'showPointOfInterestLabels', false);
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-slate-900 text-white">
        <div className="text-center p-8 max-w-md">
          <h1 className="text-2xl font-bold mb-4 text-red-400">
            Map Loading Error
          </h1>
          <p className="text-slate-300 mb-4">{error}</p>
          <code className="block bg-slate-800 p-4 rounded-lg text-sm text-left">
            <span className="text-slate-500"># .env.local (server-side only)</span>
            <br />
            MAPBOX_SECRET_TOKEN=pk.your_token_here
          </code>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-slate-900">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-slate-300 text-lg">Loading Columbia Campus Map...</p>
        </div>
      </div>
    );
  }

  return (
    <Map
      ref={mapRef}
      mapboxAccessToken={token}
      initialViewState={INITIAL_VIEW_STATE}
      mapStyle="mapbox://styles/mapbox/standard"
      styleDiffing={true}
      onLoad={onMapLoad}
      style={{ width: '100vw', height: '100vh' }}
      // Performance optimizations for limited area
      maxBounds={CAMPUS_BOUNDS}  // Restrict panning = fewer tiles loaded
      maxPitch={85}
      minZoom={15}              // Don't zoom out too far (less tiles)
      maxZoom={19}              // Cap max zoom (prevents loading ultra-high-res tiles)
    >
      {/* Navigation controls (zoom, compass, pitch) */}
      <NavigationControl 
        position="top-right" 
        visualizePitch={true}
      />
      
      {/* Fullscreen toggle button */}
      <FullscreenControl position="top-left" />
    </Map>
  );
}
