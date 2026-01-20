import { NextResponse } from 'next/server';

export async function GET() {
  // Simulated statistics data
  const stats = {
    totalBuilds: 1247,
    averageBuildTime: 42.3,
    successRate: 99.2,
    platforms: {
      pantheon: {
        builds: 415,
        avgTime: 38.5,
        successRate: 99.5,
      },
      vercel: {
        builds: 416,
        avgTime: 44.2,
        successRate: 99.1,
      },
      netlify: {
        builds: 416,
        avgTime: 44.1,
        successRate: 99.0,
      },
    },
    lastUpdated: new Date().toISOString(),
  };

  return NextResponse.json(stats);
}
