# Next.js Platform Benchmark Tool

An automated benchmarking system to continuously monitor and compare Next.js build and deployment performance across Pantheon, Vercel, and Netlify.

## Overview

This tool provides:
- **Automated daily benchmarks** via GitHub Actions
- **Historical performance tracking** in PostgreSQL
- **Internal dashboard** for monitoring competitive positioning
- **Fair comparisons** with simultaneous builds across platforms

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Actions (Daily Cron)               │
│  1. Push benchmark app to 3 platform repos                  │
│  2. Poll platform APIs for build completion                 │
│  3. Record metrics to Cloud SQL                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  PostgreSQL DB  │
                    │   (Cloud SQL)   │
                    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │  Next.js        │
                    │  Dashboard      │
                    │  (on Pantheon)  │
                    └─────────────────┘
```

## Repository Structure

```
nextjs-platform-benchmark-tool/
├── benchmark-app/          # Next.js app to be benchmarked
│   ├── app/                # Pages and routes
│   ├── components/         # React components
│   └── package.json
├── dashboard/              # Internal monitoring dashboard
│   ├── app/                # Dashboard pages
│   ├── components/         # Chart and display components
│   ├── lib/
│   │   └── db.ts           # Database connection
│   └── package.json
├── db/
│   └── migrations/         # SQL migration files
├── scripts/
│   ├── trigger-builds.js   # Push to platform repos
│   ├── poll-and-record.js  # Monitor builds and save data
│   └── migrate.js          # Run database migrations
├── .github/workflows/
│   └── benchmark.yml       # Daily cron job
└── package.json            # Monorepo root
```

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (Cloud SQL recommended)
- GitHub account with repository access
- Platform accounts (Pantheon, Vercel, Netlify)

### 1. Database Setup

Create a PostgreSQL database and note the connection string:

```bash
# Example connection string format:
postgresql://username:password@host:5432/database
```

Run migrations:

```bash
export DATABASE_URL="your-connection-string"
npm run db:migrate
```

### 2. Platform Repository Setup

Create three separate GitHub repositories:
- `pantheon-benchmark`
- `vercel-benchmark`
- `netlify-benchmark`

Connect each repository to its respective platform:
- **Pantheon**: Link repo to a Pantheon site
- **Vercel**: Import project from GitHub
- **Netlify**: Connect via GitHub integration

### 3. GitHub Secrets Configuration

Add the following secrets to your main repository (Settings → Secrets and variables → Actions):

```
BENCHMARK_REPO_PAT       - GitHub Personal Access Token with repo access
DATABASE_URL             - PostgreSQL connection string
PANTHEON_API_TOKEN       - Pantheon API access token
VERCEL_API_TOKEN         - Vercel API access token
NETLIFY_API_TOKEN        - Netlify API access token
```

### 4. Update Repository Names

Edit `scripts/trigger-builds.js` and update the platform repository names:

```javascript
const PLATFORMS = [
  { name: 'pantheon', repo: 'your-org/pantheon-benchmark', method: 'git' },
  { name: 'vercel', repo: 'your-org/vercel-benchmark', method: 'git' },
  { name: 'netlify', repo: 'your-org/netlify-benchmark', method: 'git' },
];
```

### 5. Deploy Dashboard

Deploy the dashboard app to Pantheon:

```bash
cd dashboard
npm install
npm run build

# Deploy to Pantheon following their deployment process
```

Set the `DATABASE_URL` environment variable in Pantheon.

## Development

### Install Dependencies

```bash
# Install root dependencies
npm install

# Install workspace dependencies
npm install --workspaces
```

### Run Locally

```bash
# Run benchmark app
npm run dev:benchmark

# Run dashboard
npm run dev:dashboard
```

### Build

```bash
# Build benchmark app
npm run build:benchmark

# Build dashboard
npm run build:dashboard
```

## GitHub Actions Workflow

The benchmark runs automatically daily at 2:00 AM UTC. You can also trigger it manually:

1. Go to **Actions** tab in GitHub
2. Select **Platform Benchmark** workflow
3. Click **Run workflow**
4. Optionally add notes about the run

## Database Schema

### `benchmark_runs`

Tracks each benchmark execution.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| run_timestamp | TIMESTAMP | When the run started |
| trigger_type | VARCHAR(50) | 'scheduled' or 'manual' |
| notes | TEXT | Optional notes |
| created_at | TIMESTAMP | Record creation time |

### `platform_builds`

Stores build results for each platform.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| run_id | INTEGER | Foreign key to benchmark_runs |
| platform | VARCHAR(50) | 'pantheon', 'vercel', or 'netlify' |
| trigger_time | TIMESTAMP | When build was triggered |
| completion_time | TIMESTAMP | When build completed |
| duration_seconds | INTEGER | Build + deploy time |
| status | VARCHAR(50) | 'success', 'failure', or 'timeout' |
| build_id | VARCHAR(255) | Platform-specific build ID |
| error_message | TEXT | Error details if failed |
| metadata | JSONB | Platform-specific additional data |
| created_at | TIMESTAMP | Record creation time |

## Metrics Tracked

### Phase 1 (Current)
- **Build + Deploy Time**: Time from git push to deployment live
- **Success Rate**: Percentage of successful builds
- **Build Status**: Success, failure, or timeout

### Future Phases
- Cold vs. warm cache builds
- Incremental build time
- Time to First Byte (TTFB)
- Lighthouse scores
- Geographic performance (multi-region)
- Cold start latency

## Dashboard Features

### Overview
- Real-time stats for each platform
- Average build times
- Success rates
- Build count

### Trends Chart
- Historical build times over last 30 runs
- Visual comparison across platforms
- Hover for detailed metrics

### Recent Runs Table
- Last 10 benchmark runs
- Per-platform build times
- Status indicators
- Timestamps

## Authentication

**TODO**: The dashboard currently has no authentication. To add Google SSO:

1. Install NextAuth.js:
   ```bash
   cd dashboard
   npm install next-auth
   ```

2. Set up Google OAuth provider
3. Restrict access to `@pantheon.io` domain
4. Add middleware to protect routes

See [PLAN.md](./PLAN.md) for detailed authentication implementation plan.

## Troubleshooting

### Builds Not Triggering

Check:
- GitHub Actions workflow file is committed
- `BENCHMARK_REPO_PAT` secret has correct permissions
- Platform repositories exist and are accessible

### Database Connection Errors

Verify:
- `DATABASE_URL` is set correctly
- Database is accessible from GitHub Actions runners
- Migrations have been run

### Platform API Issues

Check:
- API tokens are valid and not expired
- Platform APIs are accessible
- API rate limits haven't been exceeded

## Manual Benchmark Run

To manually trigger a benchmark outside of GitHub Actions:

```bash
# Set environment variables
export GITHUB_TOKEN="your-pat"
export DATABASE_URL="your-connection-string"
export PANTHEON_API_TOKEN="..."
export VERCEL_API_TOKEN="..."
export NETLIFY_API_TOKEN="..."

# Run the scripts
node scripts/trigger-builds.js
node scripts/poll-and-record.js
```

## Cost Estimate

- **GitHub Actions**: Free (well within limits)
- **Cloud SQL**: ~$20-50/month (db-f1-micro instance)
- **Pantheon Hosting**: Existing plan
- **Vercel Builds**: Free tier (100 GB-hours/month)
- **Netlify Builds**: Free tier (300 build minutes/month)

**Total**: ~$20-50/month (database only)

## Roadmap

See [PLAN.md](./PLAN.md) for the full implementation roadmap including:
- Phase 2: Enhanced monitoring and alerting
- Phase 3: Expanded metrics (runtime, performance, geographic)
- Phase 4: Multiple app profiles

## Contributing

This is an internal tool for Pantheon. To contribute:

1. Create a feature branch
2. Make your changes
3. Test locally
4. Submit a pull request

## License

Internal Pantheon tool - Not for public distribution

## Support

For questions or issues:
- Check the [PLAN.md](./PLAN.md) for detailed documentation
- Review GitHub Actions logs for workflow errors
- Contact the Platform team for assistance
