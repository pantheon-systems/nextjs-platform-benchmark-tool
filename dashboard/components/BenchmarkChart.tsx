'use client';

import { useMemo } from 'react';

interface PlatformBuild {
  platform: 'pantheon' | 'vercel' | 'netlify';
  duration_seconds: number | null;
  status: string;
}

interface BenchmarkRun {
  id: number;
  run_timestamp: Date;
  builds: PlatformBuild[];
}

interface BenchmarkChartProps {
  runs: BenchmarkRun[];
}

const platformColors: Record<string, string> = {
  pantheon: '#f59e0b', // yellow-500
  vercel: '#000000',   // black
  netlify: '#14b8a6',  // teal-500
};

export default function BenchmarkChart({ runs }: BenchmarkChartProps) {
  const chartData = useMemo(() => {
    // Group builds by platform
    const byPlatform: Record<string, Array<{ timestamp: Date; duration: number }>> = {
      pantheon: [],
      vercel: [],
      netlify: [],
    };

    runs.forEach((run) => {
      run.builds.forEach((build) => {
        if (build.duration_seconds !== null && build.status === 'success') {
          byPlatform[build.platform].push({
            timestamp: new Date(run.run_timestamp),
            duration: build.duration_seconds,
          });
        }
      });
    });

    return byPlatform;
  }, [runs]);

  if (runs.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-2xl font-bold mb-4">Build Time Trends</h2>
        <div className="flex items-center justify-center h-64 text-gray-400">
          No benchmark data available
        </div>
      </div>
    );
  }

  // Calculate min and max for scale
  const allDurations = Object.values(chartData).flat().map(d => d.duration);
  const minDuration = Math.min(...allDurations);
  const maxDuration = Math.max(...allDurations);
  const range = maxDuration - minDuration;

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-8">
      <h2 className="text-2xl font-bold mb-6">Build Time Trends (Last 30 Runs)</h2>

      <div className="space-y-6">
        {Object.entries(chartData).map(([platform, data]) => {
          if (data.length === 0) return null;

          const avg = data.reduce((sum, d) => sum + d.duration, 0) / data.length;

          return (
            <div key={platform}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: platformColors[platform] }}
                  />
                  <span className="font-semibold capitalize">{platform}</span>
                </div>
                <span className="text-sm text-gray-600">
                  Avg: {avg.toFixed(1)}s
                </span>
              </div>

              <div className="relative h-12 bg-gray-100 rounded">
                {data.slice().reverse().map((point, idx) => {
                  const percentage = range > 0
                    ? ((point.duration - minDuration) / range) * 100
                    : 50;

                  return (
                    <div
                      key={idx}
                      className="absolute top-0 h-full opacity-60 hover:opacity-100 transition-opacity"
                      style={{
                        left: `${(idx / data.length) * 100}%`,
                        width: `${100 / data.length}%`,
                      }}
                      title={`${point.duration.toFixed(1)}s on ${point.timestamp.toLocaleDateString()}`}
                    >
                      <div
                        className="absolute bottom-0 w-full rounded-t"
                        style={{
                          height: `${percentage}%`,
                          backgroundColor: platformColors[platform],
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 text-sm text-gray-500 text-center">
        Showing last {runs.length} successful benchmark runs
      </div>
    </div>
  );
}
