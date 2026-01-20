interface PlatformBuild {
  platform: 'pantheon' | 'vercel' | 'netlify';
  duration_seconds: number | null;
  status: string;
  error_message: string | null;
}

interface BenchmarkRun {
  id: number;
  run_timestamp: Date;
  trigger_type: string;
  notes: string | null;
  builds: PlatformBuild[];
}

interface RecentRunsProps {
  runs: BenchmarkRun[];
}

function formatDuration(seconds: number | null): string {
  if (seconds === null) return '-';
  return `${seconds.toFixed(1)}s`;
}

function getStatusBadge(status: string) {
  const styles: Record<string, string> = {
    success: 'bg-green-100 text-green-800',
    failure: 'bg-red-100 text-red-800',
    timeout: 'bg-yellow-100 text-yellow-800',
    in_progress: 'bg-blue-100 text-blue-800',
  };

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  );
}

export default function RecentRuns({ runs }: RecentRunsProps) {
  if (runs.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-4">Recent Runs</h2>
        <p className="text-gray-500">No benchmark runs available yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-6">Recent Benchmark Runs</h2>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Timestamp</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Type</th>
              <th className="text-center py-3 px-4 font-semibold text-gray-700">Pantheon</th>
              <th className="text-center py-3 px-4 font-semibold text-gray-700">Vercel</th>
              <th className="text-center py-3 px-4 font-semibold text-gray-700">Netlify</th>
            </tr>
          </thead>
          <tbody>
            {runs.slice(0, 10).map((run) => {
              const buildsByPlatform = run.builds.reduce((acc, build) => {
                acc[build.platform] = build;
                return acc;
              }, {} as Record<string, PlatformBuild>);

              return (
                <tr key={run.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div className="text-sm">
                      {new Date(run.run_timestamp).toLocaleString()}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-gray-600 capitalize">
                      {run.trigger_type}
                    </span>
                  </td>
                  {['pantheon', 'vercel', 'netlify'].map((platform) => {
                    const build = buildsByPlatform[platform];

                    if (!build) {
                      return (
                        <td key={platform} className="py-3 px-4 text-center">
                          <span className="text-gray-400 text-sm">-</span>
                        </td>
                      );
                    }

                    return (
                      <td key={platform} className="py-3 px-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-semibold">
                            {formatDuration(build.duration_seconds)}
                          </span>
                          {getStatusBadge(build.status)}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {runs.length > 10 && (
        <div className="mt-4 text-center text-sm text-gray-500">
          Showing 10 of {runs.length} runs
        </div>
      )}
    </div>
  );
}
