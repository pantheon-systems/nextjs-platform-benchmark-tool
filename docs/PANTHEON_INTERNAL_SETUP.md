# Pantheon Internal Setup Guide

Quick reference for Pantheon employees setting up the benchmark tool.

## What You Need (Internal)

Since Pantheon builds run on GCP Cloud Build, you need internal access to:

### 1. GCP Project Information

**Get from DevOps/Infrastructure team:**
```
Question: "What GCP project ID do Next.js/customer builds run in?"

Expected answer format:
- Project ID: pantheon-prod-12345 (or similar)
- Project name: Pantheon Production / Pantheon Builds / etc.
```

### 2. Service Account Credentials

**Request from DevOps/Security team:**
```
Request: "Service account for benchmark automation"

Requirements:
- Role: roles/cloudbuild.builds.viewer (read-only)
- Purpose: Automated Next.js benchmarking vs competitors
- Access: Read build status and timing for our benchmark site only
- Usage: GitHub Actions will query Cloud Build API daily
- Format: JSON key file

Justification: We need to track build performance metrics
for competitive analysis. This is internal tooling for the
Platform team to monitor our Next.js hosting performance.
```

## Setup Steps

### Step 1: Get Credentials

**Internal request template:**

```
To: devops@pantheon.io / platform-infra@pantheon.io
Subject: Service Account for Next.js Benchmark Tool

Hi team,

I'm setting up automated benchmarking for our Next.js hosting platform
to track build performance vs Vercel and Netlify.

Could you help with:
1. GCP Project ID where Next.js builds run
2. Service account with Cloud Build Viewer permissions
3. JSON key for the service account

This will be used in a GitHub Actions workflow that runs daily to:
- Query build status for our test site (nextjs-benchmark-test)
- Record build times to our Cloud SQL database
- Generate internal competitive intelligence reports

The service account only needs read-only access to Cloud Build.

Thanks!
```

### Step 2: Add GitHub Secrets

Once you receive credentials:

1. Go to: https://github.com/pantheon-systems/nextjs-platform-benchmark-tool/settings/secrets/actions
   (adjust URL to your actual repo)

2. Add two secrets:
   - **Name:** `GCP_PROJECT_ID`
     **Value:** `pantheon-prod-12345` (the project ID you received)

   - **Name:** `GCP_SERVICE_ACCOUNT_JSON`
     **Value:** Paste entire contents of the JSON key file

### Step 3: Test Locally

Before running in GitHub Actions, test locally:

```bash
# Set environment variables (from your credentials)
export GCP_PROJECT_ID="pantheon-prod-12345"
export GCP_SERVICE_ACCOUNT_JSON='{ paste JSON here }'

# Install dependencies
npm install @google-cloud/cloudbuild

# Test the poller
node scripts/poll-pantheon-cloudbuild.js
```

**Expected output:**
```
Finding most recent build...
Build Data: {
  "buildId": "abc-123-def-456",
  "status": "success",
  "completed": true,
  ...
}
```

### Step 4: Update poll-and-record.js

Integrate the Pantheon poller:

```javascript
// In scripts/poll-and-record.js
const { pollPantheonBenchmark } = require('./poll-pantheon-internal');

// In the monitoring tasks section, replace Pantheon placeholder:
if (platform === 'pantheon') {
  const result = await pollPantheonBenchmark(triggerResult, MAX_WAIT_TIME_MS);
  await recorder.updateBuildCompletion(
    buildRecordId,
    result.completion_time,
    result.status,
    result.error_message,
    result.metadata
  );
}
```

### Step 5: Create Pantheon Benchmark Site

1. **Create a new Pantheon site**
   - Name: `nextjs-benchmark-test` (or similar)
   - Framework: Next.js
   - Plan: Choose appropriate tier for consistent benchmarking

2. **Connect to GitHub**
   - Connect site to `pantheon-benchmark` repository
   - Enable automatic deployments on push
   - Note the site URL

3. **Verify consistency**
   - Each push to `pantheon-benchmark` should trigger same site
   - Check that builds run in the expected GCP project

## What Makes This Work

### Consistency Guarantees

✅ **Same site every time**
- One dedicated Pantheon site (`nextjs-benchmark-test`)
- Connected to one GitHub repo (`pantheon-benchmark`)
- Every benchmark run pushes to that repo
- Always triggers the same site

✅ **Same GCP project**
- Pantheon routes this site to a specific GCP project
- Service account has access to that project
- Builds are queryable via Cloud Build API

✅ **Fair comparison**
- All three platforms (Pantheon, Vercel, Netlify) triggered simultaneously
- Same source code for all platforms
- Accurate timing from Cloud Build metadata

### How Build Tracking Works

```
1. GitHub Action pushes to pantheon-benchmark repo
   └─> Records commit SHA: abc123

2. Pantheon detects push
   └─> Triggers Cloud Build in GCP project

3. Cloud Build starts
   └─> Build ID: def456
   └─> Commit SHA: abc123
   └─> Start time: 2024-01-20 14:30:00

4. Our script queries Cloud Build API
   └─> Finds build matching commit SHA abc123
   └─> Polls status every 10 seconds

5. Build completes
   └─> End time: 2024-01-20 14:32:30
   └─> Duration: 150 seconds
   └─> Status: SUCCESS

6. Script records to database
   └─> platform: 'pantheon'
   └─> duration_seconds: 150
   └─> status: 'success'
```

## Troubleshooting

### "Permission denied" accessing Cloud Build API

**Problem:** Service account lacks permissions

**Solution:**
```bash
# Have DevOps verify/add the role
gcloud projects add-iam-policy-binding YOUR-PROJECT-ID \
  --member="serviceAccount:SA-EMAIL" \
  --role="roles/cloudbuild.builds.viewer"
```

### "Build not found"

**Problem:** Can't find build matching commit SHA

**Possible causes:**
1. Build hasn't started yet (wait a few seconds)
2. Wrong GCP project ID
3. Pantheon site not connected to repo correctly

**Solution:**
- Check build logs on Pantheon dashboard
- Verify GCP project ID with DevOps
- Try time-based search as fallback

### Builds run in different project

**Problem:** Some builds appear in different GCP project

**Cause:** Multi-tenant architecture might use different projects

**Solution:**
- Ask DevOps: "Can we ensure benchmark site always uses same project?"
- Request dedicated project for benchmarking if needed
- Alternative: Track multiple project IDs

## Internal Resources

- **DevOps team:** devops@pantheon.io / #devops-support
- **Cloud Build docs:** https://cloud.google.com/build/docs
- **Service account management:** https://console.cloud.google.com/iam-admin/serviceaccounts
- **Pantheon internal docs:** [link to internal wiki/docs]

## Next Steps

Once setup is complete:

1. ✅ Run manual test: `node scripts/poll-pantheon-cloudbuild.js`
2. ✅ Trigger test GitHub Actions workflow
3. ✅ Verify data appears in dashboard
4. ✅ Set up Vercel and Netlify integrations
5. ✅ Enable daily automated runs
6. ✅ Share dashboard with Platform team

## Questions?

Contact the Platform team or file an issue in the repository.
