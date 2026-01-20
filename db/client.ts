/**
 * PostgreSQL database client
 * Shared connection logic for dashboard and scripts
 */

import { Pool, PoolClient, QueryResult } from 'pg';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    pool = new Pool({
      connectionString,
      max: 10, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    pool.on('error', (err) => {
      console.error('Unexpected database error', err);
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

export async function getClient(): Promise<PoolClient> {
  const pool = getPool();
  return pool.connect();
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

// Type definitions for our schema
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

export type Platform = 'pantheon' | 'vercel' | 'netlify';
export type BuildStatus = 'success' | 'failure' | 'timeout' | 'in_progress';
