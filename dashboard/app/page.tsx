import { Suspense } from 'react';
import { getLatestRuns, getPlatformStats } from '@/lib/db';
import StatsCards from '@/components/StatsCards';
import BenchmarkChart from '@/components/BenchmarkChart';
import RecentRuns from '@/components/RecentRuns';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function DashboardData() {
  try {
    const [stats, runs] = await Promise.all([
      getPlatformStats(),
      getLatestRuns(30),
    ]);

    return (
      <>
        <StatsCards stats={stats} />
        <BenchmarkChart runs={runs} />
        <RecentRuns runs={runs} />
      </>
    );
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-red-800 font-semibold mb-2">Error Loading Data</h3>
        <p className="text-red-600">
          Unable to fetch benchmark data. Please ensure the database is configured correctly.
        </p>
        <p className="text-sm text-red-500 mt-2">
          Error: {error instanceof Error ? error.message : 'Unknown error'}
        </p>
      </div>
    );
  }
}

function LoadingSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white p-6 rounded-lg shadow animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
          </div>
        ))}
      </div>
      <div className="bg-white p-6 rounded-lg shadow animate-pulse">
        <div className="h-64 bg-gray-200 rounded"></div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">
            Platform Benchmark Dashboard
          </h1>
          <p className="text-gray-600 mt-2">
            Monitor Next.js build and deployment performance across platforms
          </p>
        </div>

        <Suspense fallback={<LoadingSkeleton />}>
          <DashboardData />
        </Suspense>
      </div>
    </div>
  );
}
