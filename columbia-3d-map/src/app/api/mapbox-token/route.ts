import { NextResponse } from 'next/server';

// Return a short-lived token for the client
// In production, you could add rate limiting, session checks, etc.
export async function GET() {
  const token = process.env.MAPBOX_SECRET_TOKEN;
  
  if (!token) {
    return NextResponse.json(
      { error: 'Mapbox token not configured' },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { token },
    {
      headers: {
        // Prevent caching of the token response
        'Cache-Control': 'no-store, max-age=0',
      },
    }
  );
}

