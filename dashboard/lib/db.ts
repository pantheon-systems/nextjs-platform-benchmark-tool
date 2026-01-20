/**
 * Database utilities for the dashboard
 * Connects to PostgreSQL to fetch benchmark data
 */

import { Pool, QueryResult } from 'pg';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    pool = new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    pool.on('error', (err) => {
      console.error('Unexpected database pool error', err);
    });
  }

  return pool;
}

export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const pool = getPool();
  return pool.query<T>(text, params);
}

// Type definitions
export interface BenchmarkRun {
  id: number;
  run_timestamp: Date;
  trigger_type: string;
  notes: string | null;
  created_at: Date;
}

export interface PlatformBuild {
  id: number;
  run_id: number;
  platform: 'pantheon' | 'vercel' | 'netlify';
  trigger_time: Date;
  completion_time: Date | null;
  duration_seconds: number | null;
  status: 'success' | 'failure' | 'timeout' | 'in_progress';
  build_id: string | null;
  error_message: string | null;
  metadata: Record<string, any> | null;
  created_at: Date;
}

export interface BenchmarkRunWithBuilds extends BenchmarkRun {
  builds: PlatformBuild[];
}

// Helper functions to fetch data
export async function getLatestRuns(limit: number = 30): Promise<BenchmarkRunWithBuilds[]> {
  const runsResult = await query<BenchmarkRun>(
    `SELECT * FROM benchmark_runs
     ORDER BY run_timestamp DESC
     LIMIT $1`,
    [limit]
  );

  const runs = runsResult.rows;

  if (runs.length === 0) {
    return [];
  }

  const runIds = runs.map(r => r.id);

  const buildsResult = await query<PlatformBuild>(
    `SELECT * FROM platform_builds
     WHERE run_id = ANY($1::int[])
     ORDER BY run_id, platform`,
    [runIds]
  );

  const buildsByRunId = buildsResult.rows.reduce((acc, build) => {
    if (!acc[build.run_id]) {
      acc[build.run_id] = [];
    }
    acc[build.run_id].push(build);
    return acc;
  }, {} as Record<number, PlatformBuild[]>);

  return runs.map(run => ({
    ...run,
    builds: buildsByRunId[run.id] || []
  }));
}

export async function getPlatformStats() {
  const result = await query<{
    platform: string;
    total_builds: string;
    avg_duration: string;
    success_rate: string;
    min_duration: string;
    max_duration: string;
  }>(
    `SELECT
      platform,
      COUNT(*) as total_builds,
      AVG(duration_seconds) as avg_duration,
      (COUNT(*) FILTER (WHERE status = 'success')::float / COUNT(*)::float * 100) as success_rate,
      MIN(duration_seconds) as min_duration,
      MAX(duration_seconds) as max_duration
     FROM platform_builds
     WHERE status != 'in_progress'
     GROUP BY platform
     ORDER BY platform`
  );

  return result.rows.map(row => ({
    platform: row.platform,
    totalBuilds: parseInt(row.total_builds, 10),
    avgDuration: parseFloat(row.avg_duration),
    successRate: parseFloat(row.success_rate),
    minDuration: parseFloat(row.min_duration),
    maxDuration: parseFloat(row.max_duration),
  }));
}
