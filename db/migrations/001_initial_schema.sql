-- Initial schema for benchmark tracking

-- Table to track individual benchmark runs
CREATE TABLE IF NOT EXISTS benchmark_runs (
  id SERIAL PRIMARY KEY,
  run_timestamp TIMESTAMP NOT NULL,
  trigger_type VARCHAR(50) DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Table to track platform-specific build results
CREATE TABLE IF NOT EXISTS platform_builds (
  id SERIAL PRIMARY KEY,
  run_id INTEGER NOT NULL REFERENCES benchmark_runs(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  trigger_time TIMESTAMP NOT NULL,
  completion_time TIMESTAMP,
  duration_seconds INTEGER,
  status VARCHAR(50) NOT NULL,
  build_id VARCHAR(255),
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_run_platform ON platform_builds(run_id, platform);
CREATE INDEX IF NOT EXISTS idx_platform_time ON platform_builds(platform, trigger_time);
CREATE INDEX IF NOT EXISTS idx_run_timestamp ON benchmark_runs(run_timestamp);
CREATE INDEX IF NOT EXISTS idx_platform_status ON platform_builds(platform, status);

-- Comments for documentation
COMMENT ON TABLE benchmark_runs IS 'Tracks each benchmark run with metadata';
COMMENT ON TABLE platform_builds IS 'Stores build and deploy metrics for each platform';
COMMENT ON COLUMN platform_builds.platform IS 'Platform name: pantheon, vercel, or netlify';
COMMENT ON COLUMN platform_builds.status IS 'Build status: success, failure, or timeout';
COMMENT ON COLUMN platform_builds.duration_seconds IS 'Total time from trigger to deployment completion';
COMMENT ON COLUMN platform_builds.metadata IS 'Platform-specific additional data as JSON';
