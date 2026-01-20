# Setup Guide

Step-by-step instructions to get the Next.js Platform Benchmark Tool up and running.

## Prerequisites Checklist

- [ ] Node.js 18+ installed
- [ ] PostgreSQL database (Cloud SQL instance recommended)
- [ ] GitHub account with admin access to create repos
- [ ] Pantheon account with API access
- [ ] Vercel account with API access
- [ ] Netlify account with API access

## Step 1: Clone and Install

```bash
# Clone the repository
git clone <your-repo-url>
cd nextjs-platform-benchmark-tool

# Install dependencies
npm install
npm install --workspaces
```

## Step 2: Database Setup

### Create PostgreSQL Database

**Using Google Cloud SQL:**

1. Go to Google Cloud Console → SQL
2. Create a PostgreSQL instance
3. Create a database named `benchmarks`
4. Create a user with password
5. Note the connection details

**Connection String Format:**
```
postgresql://username:password@host:port/database

# For Cloud SQL with Cloud SQL Proxy:
postgresql://username:password@127.0.0.1:5432/benchmarks
```

### Run Migrations

```bash
# Copy environment variables
cp .env.example .env

# Edit .env and set DATABASE_URL
# Then run migrations
export DATABASE_URL="your-connection-string"
npm run db:migrate
```

You should see:
```
✅ Applied 001_initial_schema.sql
✨ Successfully applied 1 migration(s)
```

### Verify Database

```bash
# Connect to your database and verify tables exist
psql $DATABASE_URL -c "\dt"
```

Expected tables:
- `benchmark_runs`
- `platform_builds`
- `schema_migrations`

## Step 3: Create Platform Repositories

Create three new GitHub repositories (can be in your organization):

```
your-org/pantheon-benchmark
your-org/vercel-benchmark
your-org/netlify-benchmark
```

**For each repository:**

1. Initialize as empty (no README, no .gitignore)
2. Note the repository URL: `https://github.com/your-org/repo-name`

## Step 4: Connect Repositories to Platforms

### Pantheon

1. Log in to Pantheon Dashboard
2. Create a new site or use existing
3. Connect to Git:
   - Go to Site → Code → Connection Mode
   - Set to Git mode
   - Connect the `pantheon-benchmark` repository
4. Note the site name/URL

### Vercel

1. Log in to Vercel Dashboard
2. Click "Add New..." → Project
3. Import from GitHub: select `vercel-benchmark`
4. Framework Preset: Next.js
5. Deploy

### Netlify

1. Log in to Netlify Dashboard
2. Click "Add new site" → Import an existing project
3. Connect to GitHub: select `netlify-benchmark`
4. Build settings:
   - Build command: `npm run build`
   - Publish directory: `.next`
5. Deploy

## Step 5: Get API Tokens

### GitHub Personal Access Token

1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Name: `Benchmark Tool`
4. Scopes: Select `repo` (all sub-scopes)
5. Generate and copy token

### Pantheon API Token

1. Pantheon Dashboard → Account → Personal Settings → Machine Tokens
2. Create a new token
3. Copy the token

**Alternative:** Check Pantheon's API documentation for latest token generation method.

### Vercel API Token

1. Vercel Dashboard → Settings → Tokens
2. Create a new token
3. Name: `Benchmark Tool`
4. Scope: Full Account
5. Copy token

### Netlify API Token

1. Netlify Dashboard → User Settings → Applications → Personal access tokens
2. Create new access token
3. Name: `Benchmark Tool`
4. Copy token

## Step 6: Configure GitHub Secrets

In your main `nextjs-platform-benchmark-tool` repository:

1. Go to Settings → Secrets and variables → Actions
2. Click "New repository secret" for each of these:

| Secret Name | Value |
|-------------|-------|
| `BENCHMARK_REPO_PAT` | Your GitHub Personal Access Token |
| `DATABASE_URL` | PostgreSQL connection string |
| `PANTHEON_API_TOKEN` | Pantheon API token |
| `VERCEL_API_TOKEN` | Vercel API token |
| `NETLIFY_API_TOKEN` | Netlify API token |

## Step 7: Update Configuration

Edit `scripts/trigger-builds.js`:

```javascript
const PLATFORMS = [
  {
    name: 'pantheon',
    repo: 'your-org/pantheon-benchmark', // ← Update this
    method: 'git'
  },
  {
    name: 'vercel',
    repo: 'your-org/vercel-benchmark', // ← Update this
    method: 'git'
  },
  {
    name: 'netlify',
    repo: 'your-org/netlify-benchmark', // ← Update this
    method: 'git'
  }
];
```

Commit and push:

```bash
git add scripts/trigger-builds.js
git commit -m "Update platform repository names"
git push origin main
```

## Step 8: Test Manual Run

Before setting up the automated schedule, test manually:

```bash
# Set environment variables
export GITHUB_TOKEN="your-pat-token"
export DATABASE_URL="your-db-connection"
export PANTHEON_API_TOKEN="your-pantheon-token"
export VERCEL_API_TOKEN="your-vercel-token"
export NETLIFY_API_TOKEN="your-netlify-token"

# Trigger builds
node scripts/trigger-builds.js
```

Expected output:
```
🚀 Starting build trigger process...
📤 Pushing to pantheon...
✅ Successfully triggered build for pantheon
📤 Pushing to vercel...
✅ Successfully triggered build for vercel
📤 Pushing to netlify...
✅ Successfully triggered build for netlify
```

Then poll for results:

```bash
node scripts/poll-and-record.js
```

**Note:** The polling script currently has placeholder API implementations. You'll need to implement the actual platform API calls for production use.

## Step 9: Verify Database

Check that data was recorded:

```bash
psql $DATABASE_URL -c "SELECT * FROM benchmark_runs ORDER BY id DESC LIMIT 1;"
psql $DATABASE_URL -c "SELECT * FROM platform_builds ORDER BY id DESC LIMIT 3;"
```

## Step 10: Deploy Dashboard

### Build Dashboard Locally

```bash
cd dashboard
npm install
npm run build
```

### Deploy to Pantheon

Follow Pantheon's deployment process for Next.js applications:

1. Create a new Pantheon site for the dashboard
2. Connect to your repository
3. Deploy the `dashboard/` directory

**Set Environment Variable:**

In Pantheon dashboard, set:
```
DATABASE_URL=your-connection-string
```

### Access Dashboard

Navigate to your Pantheon dashboard URL. You should see:
- Platform stats cards
- Build time trends chart
- Recent runs table

## Step 11: Enable Automated Runs

The GitHub Actions workflow is already configured in `.github/workflows/benchmark.yml`.

It will run automatically:
- **Daily at 2:00 AM UTC**
- Or manually via Actions tab

### Verify Workflow

1. Go to GitHub → Actions tab
2. You should see "Platform Benchmark" workflow
3. Click "Run workflow" to test manual trigger

## Step 12: Implement Platform API Polling (TODO)

The `scripts/poll-and-record.js` file has placeholder implementations for platform APIs. You need to implement actual API calls:

### Pantheon API

```javascript
async getPantheonBuildStatus(buildId) {
  const response = await fetch(
    `https://api.pantheon.io/sites/${siteId}/builds/${buildId}`,
    {
      headers: {
        'Authorization': `Bearer ${this.apiToken}`
      }
    }
  );
  // Parse response and return status
}
```

Refer to: [Pantheon API Documentation]

### Vercel API

```javascript
async getVercelBuildStatus(buildId) {
  const response = await fetch(
    `https://api.vercel.com/v13/deployments/${buildId}`,
    {
      headers: {
        'Authorization': `Bearer ${this.apiToken}`
      }
    }
  );
  const data = await response.json();
  return {
    status: data.readyState === 'READY' ? 'success' : 'in_progress',
    completed: data.readyState === 'READY' || data.readyState === 'ERROR',
    completionTime: new Date(data.ready),
    metadata: data
  };
}
```

Refer to: https://vercel.com/docs/rest-api/endpoints/deployments

### Netlify API

```javascript
async getNetlifyBuildStatus(buildId) {
  const response = await fetch(
    `https://api.netlify.com/api/v1/deploys/${buildId}`,
    {
      headers: {
        'Authorization': `Bearer ${this.apiToken}`
      }
    }
  );
  const data = await response.json();
  return {
    status: data.state === 'ready' ? 'success' :
            data.state === 'error' ? 'failure' : 'in_progress',
    completed: ['ready', 'error'].includes(data.state),
    completionTime: new Date(data.published_at),
    metadata: data
  };
}
```

Refer to: https://docs.netlify.com/api/get-started/

## Optional: Add Authentication

See README.md section on authentication for Google SSO setup with NextAuth.js.

## Troubleshooting

### "DATABASE_URL not set" error

Make sure environment variable is exported:
```bash
echo $DATABASE_URL
```

If empty, export it:
```bash
export DATABASE_URL="your-connection-string"
```

### GitHub Actions failing

Check:
- All secrets are set in repository settings
- Secrets don't have extra quotes or whitespace
- BENCHMARK_REPO_PAT has `repo` scope

### Database connection timeout

If using Cloud SQL:
- Check if IP is whitelisted
- Consider using Cloud SQL Proxy
- Verify connection string is correct

### Platform builds not triggering

Verify:
- Platform repositories exist and are accessible
- Platform is configured to auto-deploy on push
- GitHub token has access to push to repos

## Next Steps

1. Monitor first automated run (next day at 2:00 AM UTC)
2. Check dashboard for data visualization
3. Implement production platform API calls
4. Set up authentication for dashboard
5. Configure alerting for failed builds

## Support

For issues:
- Check GitHub Actions logs
- Review database for errors
- Consult platform-specific API documentation
