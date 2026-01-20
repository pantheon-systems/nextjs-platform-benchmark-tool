interface PlatformStat {
  platform: string;
  totalBuilds: number;
  avgDuration: number;
  successRate: number;
  minDuration: number;
  maxDuration: number;
}

interface StatsCardsProps {
  stats: PlatformStat[];
}

const platformColors: Record<string, string> = {
  pantheon: 'bg-yellow-500',
  vercel: 'bg-black',
  netlify: 'bg-teal-500',
};

export default function StatsCards({ stats }: StatsCardsProps) {
  if (stats.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
        <p className="text-yellow-800">No benchmark data available yet. Run your first benchmark to see stats!</p>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-3 gap-6 mb-8">
      {stats.map((stat) => (
        <div
          key={stat.platform}
          className="bg-white rounded-lg shadow-lg p-6 border-t-4"
          style={{ borderColor: platformColors[stat.platform] || '#6366f1' }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold capitalize text-gray-700">
              {stat.platform}
            </h3>
            <div
              className={`${platformColors[stat.platform] || 'bg-blue-500'} w-3 h-3 rounded-full`}
            />
          </div>

          <div className="space-y-3">
            <div>
              <div className="text-3xl font-bold text-gray-900">
                {stat.avgDuration.toFixed(1)}s
              </div>
              <div className="text-sm text-gray-500">Average Build Time</div>
            </div>

            <div className="pt-3 border-t border-gray-200">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Success Rate</span>
                <span className="font-semibold text-green-600">
                  {stat.successRate.toFixed(1)}%
                </span>
              </div>

              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Total Builds</span>
                <span className="font-semibold">{stat.totalBuilds}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Range</span>
                <span className="font-semibold text-gray-700">
                  {stat.minDuration.toFixed(1)}s - {stat.maxDuration.toFixed(1)}s
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
