# Next.js Platform Benchmark Tool - Planning Document

## Overview

An automated benchmarking system to continuously monitor and compare Next.js build and deployment performance across Pantheon, Vercel, and Netlify.

## Goals

- Track build + deploy time ("push to live") on a daily basis
- Maintain historical performance data in a database
- Provide internal dashboard for Pantheon team to monitor competitive positioning
- Ensure fair, apples-to-apples comparisons across platforms

## Architecture

### High-Level Flow

```
GitHub Actions (Daily Cron)
  ├─> Push to pantheon-benchmark repo → Pantheon builds
  ├─> Push to vercel-benchmark repo → Vercel builds
  └─> Push to netlify-benchmark repo → Netlify builds
       ↓
  Poll platform APIs simultaneously
       ↓
  Record metrics to Cloud SQL (PostgreSQL)
       ↓
  Dashboard (Next.js on Pantheon) displays results
```

### Repository Structure (Monorepo)

```
nextjs-platform-benchmark-tool/
├── .github/
│   └── workflows/
│       └── benchmark.yml          # Daily cron job
├── benchmark-app/                 # Next.js app to be benchmarked
│   ├── package.json
│   ├── next.config.js
│   └── src/
│       └── (realistic medium-sized app)
├── dashboard/                     # Internal dashboard
│   ├── package.json
│   ├── next.config.js
│   └── src/
│       ├── app/                   # Next.js App Router
│       ├── components/
│       └── lib/
│           └── db.ts              # PostgreSQL connection
├── db/
│   └── migrations/                # Database migrations
├── scripts/
│   ├── trigger-builds.ts          # Push to platform repos
│   ├── poll-platforms.ts          # Monitor build status
│   └── record-metrics.ts          # Write to database
├── package.json                   # Workspace root
└── README.md
```

### External Repositories

Three separate repos for platform deployments:
- `pantheon-benchmark` - Connected to Pantheon
- `vercel-benchmark` - Connected to Vercel
- `netlify-benchmark` - Connected to Netlify

Each receives identical copies of `/benchmark-app` via GitHub Actions.

## Components

### 1. Benchmark App

**Type:** Realistic medium-sized Next.js application

**Characteristics:**
- 10-15 pages (mix of static and dynamic routes)
- ~10-20 npm dependencies (React, date libraries, UI components, etc.)
- 2-3 API routes
- Image optimization examples
- Mix of SSR and SSG pages
- App Router (Next.js 14+)

**Purpose:** Representative of real customer workloads without being trivial or overly complex.

**Future Variants:**
- Minimal app (baseline overhead)
- Heavy app (stress test)
- Specific feature tests (ISR, Edge Functions, etc.)

### 2. GitHub Actions Workflow

**Schedule:** Daily at a consistent time (e.g., 2:00 AM UTC)

**Workflow Steps:**

1. **Prepare Benchmark App**
   - Checkout monorepo
   - Optional: Update dependencies to latest (configurable)
   - Create timestamp commit

2. **Trigger Builds (Simultaneous)**
   - Push `/benchmark-app` to `pantheon-benchmark` repo
   - Push `/benchmark-app` to `vercel-benchmark` repo
   - Push `/benchmark-app` to `netlify-benchmark` repo
   - Record exact trigger timestamp for each

3. **Poll Platform APIs**
   - Poll **GCP Cloud Build API** for Pantheon build status (internal access)
   - Poll **Vercel API** for build status
   - Poll **Netlify API** for build status
   - Run polls in parallel
   - Wait for all builds to complete (or timeout after 60 minutes)

4. **Record Metrics**
   - Calculate build + deploy time for each platform
   - Record success/failure status
   - Write to Cloud SQL database

5. **Notification (Optional)**
   - Alert on build failures
   - Slack/email notification

**Secrets Required:**
- `GCP_PROJECT_ID` - GCP project where Pantheon builds run (internal)
- `GCP_SERVICE_ACCOUNT_JSON` - Service account with Cloud Build Viewer role (internal)
- `VERCEL_API_TOKEN` - API access for Vercel
- `NETLIFY_API_TOKEN` - API access for Netlify
- `DATABASE_URL` - PostgreSQL connection string
- `BENCHMARK_REPO_PAT` - GitHub Personal Access Token to push to platform repos

### 3. Database Schema

**Database:** PostgreSQL on Cloud SQL

**Tables:**

#### `benchmark_runs`
```sql
CREATE TABLE benchmark_runs (
  id SERIAL PRIMARY KEY,
  run_timestamp TIMESTAMP NOT NULL,
  trigger_type VARCHAR(50) DEFAULT 'scheduled', -- 'scheduled', 'manual', etc.
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### `platform_builds`
```sql
CREATE TABLE platform_builds (
  id SERIAL PRIMARY KEY,
  run_id INTEGER REFERENCES benchmark_runs(id),
  platform VARCHAR(50) NOT NULL, -- 'pantheon', 'vercel', 'netlify'
  trigger_time TIMESTAMP NOT NULL,
  completion_time TIMESTAMP,
  duration_seconds INTEGER, -- build + deploy time
  status VARCHAR(50) NOT NULL, -- 'success', 'failure', 'timeout'
  build_id VARCHAR(255), -- platform-specific build identifier
  error_message TEXT,
  metadata JSONB, -- platform-specific additional data
  created_at TIMESTAMP DEFAULT NOW(),

  INDEX idx_run_platform (run_id, platform),
  INDEX idx_platform_time (platform, trigger_time)
);
```

#### Future tables:
- `runtime_metrics` - TTFB, cold starts, etc.
- `performance_scores` - Lighthouse scores
- `geographic_metrics` - Multi-region performance

### 4. Dashboard

**Framework:** Next.js 14+ (App Router)

**Authentication:** Google SSO (OAuth)
- Restrict to `@pantheon.io` email domain
- Use NextAuth.js or similar

**Features:**

#### MVP Views:
1. **Overview Dashboard**
   - Latest build times (all platforms)
   - Trend chart (last 30 days)
   - Success rate by platform

2. **Historical Comparison**
   - Line chart: build times over time
   - Filter by date range
   - Platform comparison (overlaid or side-by-side)

3. **Run Details**
   - Table of all benchmark runs
   - Drill-down to individual run details
   - Link to platform build logs

#### Future Views:
- Performance metrics dashboard
- Geographic comparison maps
- Alerting configuration
- Manual benchmark trigger

**Hosting:** Pantheon (dogfooding)

## Metrics

### Phase 1 (MVP): Build + Deploy Time
- **Metric:** Time from git push to deployment live
- **Measurement:** `completion_time - trigger_time`
- **Per Platform:** Pantheon, Vercel, Netlify

### Future Expansion:

#### Build Metrics
- Cold vs. warm cache builds
- Incremental build time (small change)
- Build resource usage (if available via APIs)

#### Deploy Metrics
- Time to propagate to CDN
- Preview deployment time

#### Runtime Metrics
- Cold start latency (serverless functions)
- Time to First Byte (TTFB)
- Full page load time

#### Performance Metrics
- Lighthouse scores (LCP, CLS, FID, TBT)
- Core Web Vitals
- Bundle size analysis

#### Geographic Metrics
- TTFB from multiple regions (US East, US West, EU, Asia)
- CDN distribution effectiveness

#### Reliability Metrics
- Build success rate over time
- Uptime monitoring
- Error rates

## Implementation Phases

### Phase 1: MVP (Core Build Benchmarking)
- [x] Planning (this document)
- [x] Set up monorepo structure
- [x] Create benchmark Next.js app (medium-sized)
- [x] Set up Cloud SQL database + migrations
- [x] Create GitHub Actions workflow skeleton
  - [x] Trigger builds on all platforms (git push)
  - [ ] Implement GCP Cloud Build polling for Pantheon (needs internal credentials)
  - [ ] Implement Vercel API polling
  - [ ] Implement Netlify API polling
  - [ ] Record to database
- [x] Build dashboard (basic charts)
- [ ] Implement Google SSO authentication
- [ ] Deploy dashboard to Pantheon
- [ ] Obtain GCP service account (internal DevOps)
- [ ] Run first successful benchmark

### Phase 2: Enhanced Monitoring
- [ ] Add alerting (Slack/email)
- [ ] Improve dashboard UX (filters, drill-downs)
- [ ] Add manual trigger capability
- [ ] Create weekly/monthly reports

### Phase 3: Expanded Metrics
- [ ] Add runtime performance monitoring (TTFB)
- [ ] Add Lighthouse score tracking
- [ ] Geographic performance testing
- [ ] Cold start measurements

### Phase 4: Multiple App Profiles
- [ ] Minimal app variant
- [ ] Heavy app variant
- [ ] Feature-specific benchmarks (ISR, Edge, etc.)

## Platform-Specific Implementation Details

### Pantheon (GCP Cloud Build Integration)

**Architecture:**
- Pantheon builds run on **Google Cloud Build** in Pantheon-owned GCP project
- Deploys to **Google Cloud Run**
- Internal Pantheon access allows querying Cloud Build API directly

**Implementation Approach:**
- Use GCP Cloud Build API (not direct Pantheon API)
- Service account with `roles/cloudbuild.builds.viewer` permission
- Find builds by commit SHA or timestamp window
- Poll Cloud Build status for completion

**Build Identification:**
1. Push benchmark app to `pantheon-benchmark` repo
2. Record commit SHA and trigger timestamp
3. Query Cloud Build API to find build matching commit SHA
4. Poll build status until completion
5. Extract timing from Cloud Build metadata

**See:** `docs/PANTHEON_INTEGRATION.md` for detailed setup

### Vercel

**Implementation:**
- Vercel Deployments API: https://vercel.com/docs/rest-api/endpoints/deployments
- Poll deployment status by ID
- Standard REST API integration

### Netlify

**Implementation:**
- Netlify API: https://docs.netlify.com/api/get-started/
- Poll deploy status by ID
- Standard REST API integration

## Open Questions / Decisions Needed

1. **Exact time for daily benchmark run** - When is least likely to hit platform maintenance windows?
2. **Benchmark app specifics** - What dependencies/features best represent target customer workload?
3. **Cloud SQL instance sizing** - Start small, monitor query performance
4. **Platform API rate limits** - Do we need to throttle polling?
5. **Timeout handling** - What constitutes a "failed" benchmark? (60 min timeout suggested)
6. **Data retention policy** - Keep all historical data or aggregate/archive old runs?
7. **GCP Project ID** - Confirm specific project where benchmark builds will run (internal DevOps team)

## Success Criteria

- Daily automated benchmarks running reliably
- Historical data tracked for trend analysis
- Dashboard accessible to Pantheon team
- Less than 5% benchmark run failure rate
- Clear visibility into Pantheon's competitive positioning

## Technical Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| GCP Cloud Build API changes | Use stable v1 API; add error handling; monitor for breaking changes |
| Build identification failures (Pantheon) | Multi-strategy search: commit SHA, timestamp window, fallback to manual |
| Platform API changes (Vercel/Netlify) | Version API calls; add error handling; monitor for 4xx/5xx |
| GitHub Actions reliability | Add retry logic; manual trigger fallback |
| Database connection issues | Connection pooling; retry logic; Cloud SQL uptime monitoring |
| Build minute limits (Vercel/Netlify) | Daily frequency keeps usage low; monitor usage |
| Platform-specific config differences | Keep benchmark app simple; avoid platform-specific optimizations |
| Time zones affecting comparisons | Use UTC; trigger at consistent time |

## Cost Estimate

- **GitHub Actions:** Free (well within limits)
- **Cloud SQL:** ~$20-50/month (db-f1-micro instance)
- **Pantheon Hosting (Dashboard):** Assuming existing plan
- **Vercel Builds:** Free tier (100 GB-hours/month, daily builds = ~1-2 GB-hours/month)
- **Netlify Builds:** Free tier (300 build minutes/month, daily builds = ~10-30 min/month)

**Total:** ~$20-50/month (database only)

## Timeline Estimate

- **Phase 1 MVP:** 1-2 weeks development
- **Phase 2 Enhancements:** 3-5 days
- **Phase 3 Expanded Metrics:** 1 week
- **Phase 4 Multiple Variants:** 3-5 days per variant

## Next Steps

1. Review and approve this plan
2. Create the three external benchmark repos (pantheon-benchmark, vercel-benchmark, netlify-benchmark)
3. Set up Cloud SQL instance
4. Begin Phase 1 implementation
