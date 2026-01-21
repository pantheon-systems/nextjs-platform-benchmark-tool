# Pantheon GCP Integration Guide

Since Pantheon builds run on Google Cloud Platform (Cloud Build) and deploy to Cloud Run, we have multiple options for tracking build metrics.

## Understanding Your Setup

First, determine your Pantheon GCP architecture:

**Run the investigation script:**
```bash
bash scripts/investigate-pantheon-gcp.sh
```

**Trigger a test build on Pantheon and examine the logs for:**
- GCP Project ID
- Cloud Build ID
- Any GCP-specific metadata

## Integration Options

### Option 1: Cloud Build API Access (Recommended)

**Best for: Accurate build metrics with minimal setup changes**

#### Prerequisites

1. **Identify GCP Project ID**
   - Check Pantheon dashboard for GCP integration settings
   - Look in build logs for project references
   - Ask Pantheon support: "What GCP project do my builds run in?"

2. **Create Service Account**
   ```bash
   # If you have access to the GCP project
   gcloud iam service-accounts create benchmark-reader \
     --display-name="Benchmark Build Reader"

   # Grant Cloud Build Viewer role
   gcloud projects add-iam-policy-binding YOUR-PROJECT-ID \
     --member="serviceAccount:benchmark-reader@YOUR-PROJECT-ID.iam.gserviceaccount.com" \
     --role="roles/cloudbuild.builds.viewer"

   # Create and download key
   gcloud iam service-accounts keys create service-account-key.json \
     --iam-account=benchmark-reader@YOUR-PROJECT-ID.iam.gserviceaccount.com
   ```

3. **Add GitHub Secrets**
   - `GCP_PROJECT_ID`: Your GCP project ID
   - `GCP_SERVICE_ACCOUNT_JSON`: Contents of service-account-key.json

#### Implementation

Update `scripts/poll-and-record.js` to use the Cloud Build poller:

```javascript
const { PantheonCloudBuildPoller } = require('./poll-pantheon-cloudbuild');

async function pollPantheon(triggerResult) {
  const poller = new PantheonCloudBuildPoller(
    process.env.GCP_PROJECT_ID,
    process.env.GCP_SERVICE_ACCOUNT_JSON
  );

  // Option A: If you know the build ID
  if (triggerResult.buildId) {
    return await poller.pollUntilComplete(triggerResult.buildId);
  }

  // Option B: Find by commit SHA
  const buildData = await poller.findBuildByCommit(triggerResult.commitHash);
  if (buildData) {
    return await poller.pollUntilComplete(buildData.buildId);
  }

  // Option C: Find most recent build
  const recentBuild = await poller.findRecentBuild(triggerResult.timestamp);
  if (recentBuild) {
    return await poller.pollUntilComplete(recentBuild.buildId);
  }

  throw new Error('Could not find Pantheon build');
}
```

#### Install Dependencies

```bash
npm install @google-cloud/cloudbuild
```

Update `.github/workflows/benchmark.yml`:

```yaml
- name: Poll platform APIs and record metrics
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
    GCP_PROJECT_ID: ${{ secrets.GCP_PROJECT_ID }}
    GCP_SERVICE_ACCOUNT_JSON: ${{ secrets.GCP_SERVICE_ACCOUNT_JSON }}
    VERCEL_API_TOKEN: ${{ secrets.VERCEL_API_TOKEN }}
    NETLIFY_API_TOKEN: ${{ secrets.NETLIFY_API_TOKEN }}
  run: |
    node scripts/poll-and-record.js
```

---

### Option 2: Build Process Reporting

**Best for: When you can't access Cloud Build API but can customize builds**

#### Setup

1. **Create a webhook endpoint** to receive build reports
   - Could be a simple Cloud Function or API route on your dashboard
   - Or use the GitHub Actions workflow as a webhook receiver

2. **Add reporting script to Pantheon repo**

   In `pantheon-benchmark` repo, add `cloudbuild.yaml` (if Pantheon supports it):

   ```yaml
   steps:
     # Standard build steps
     - name: 'node:20'
       entrypoint: npm
       args: ['install']

     - name: 'node:20'
       entrypoint: npm
       args: ['run', 'build']

     # Report build completion
     - name: 'gcr.io/cloud-builders/curl'
       entrypoint: 'bash'
       args:
         - '-c'
         - |
           curl -X POST $BENCHMARK_WEBHOOK_URL \
             -H "Content-Type: application/json" \
             -d "{
               \"platform\": \"pantheon\",
               \"buildId\": \"$BUILD_ID\",
               \"status\": \"success\",
               \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
             }"
       env:
         - 'BENCHMARK_WEBHOOK_URL=$_BENCHMARK_WEBHOOK_URL'

   substitutions:
     _BENCHMARK_WEBHOOK_URL: 'https://your-webhook-url.com/build-complete'
   ```

   **Or use a package.json script:**

   ```json
   {
     "scripts": {
       "build": "next build",
       "postbuild": "bash ./report-build-status.sh"
     }
   }
   ```

   Then add `report-build-status.sh` from our scripts directory.

3. **Set environment variable in Pantheon**
   - `BENCHMARK_WEBHOOK_URL`: Your webhook endpoint

#### Webhook Endpoint Example

Simple Cloud Function to receive and store build data:

```javascript
// cloud-function/index.js
const { Client } = require('pg');

exports.recordBuild = async (req, res) => {
  const { platform, buildId, status, timestamp } = req.body;

  // Verify request is from known source
  if (req.headers['x-build-reporter'] !== 'pantheon') {
    return res.status(401).send('Unauthorized');
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();

    // Find the pending run for this platform
    const result = await client.query(`
      UPDATE platform_builds
      SET completion_time = $1,
          duration_seconds = EXTRACT(EPOCH FROM ($1::timestamp - trigger_time)),
          status = $2,
          build_id = $3
      WHERE platform = $4
        AND status = 'in_progress'
        AND trigger_time > NOW() - INTERVAL '2 hours'
      RETURNING id
    `, [timestamp, status, buildId, platform]);

    if (result.rowCount === 0) {
      console.warn('No matching build found');
      return res.status(404).send('Build not found');
    }

    res.status(200).send({ success: true });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).send('Error recording build');
  } finally {
    await client.end();
  }
};
```

---

### Option 3: External Monitoring (Fallback)

**Best for: When you have no GCP access and can't modify build process**

Monitor when the deployment goes live by polling the site URL:

```javascript
async function pollPantheonSite(siteUrl, expectedContent) {
  const startTime = Date.now();
  let previousHash = null;

  while (Date.now() - startTime < MAX_WAIT_TIME) {
    try {
      const response = await fetch(siteUrl);
      const content = await response.text();
      const contentHash = hashContent(content);

      if (contentHash !== previousHash) {
        // Content changed - likely a new deployment
        return {
          status: 'success',
          completed: true,
          detectedAt: new Date(),
          durationSeconds: Math.round((Date.now() - startTime) / 1000)
        };
      }

      previousHash = contentHash;
      await sleep(10000); // Check every 10 seconds
    } catch (error) {
      console.error('Error polling site:', error);
    }
  }

  return { status: 'timeout', completed: true };
}
```

**Limitations:**
- Less accurate (doesn't distinguish build vs. deploy time)
- Can't detect build failures before deployment
- Depends on content actually changing

---

## Internal Pantheon Access

**If you work at Pantheon**, you likely have internal access to:

1. **Internal GCP projects** where customer builds run
2. **Service accounts** with appropriate permissions
3. **Internal APIs** for build status
4. **Build infrastructure details** not available to external customers

### Internal Setup Steps

1. **Get Project ID from DevOps team**
   ```
   Ask: "What GCP project(s) do Next.js builds run in?"
   ```

2. **Request Service Account**
   ```
   Request: "Read-only Cloud Build API access for benchmark automation"
   Role needed: roles/cloudbuild.builds.viewer
   ```

3. **Configure GitHub Secrets**
   - Use internal service account JSON
   - Use internal project ID

4. **Done!** Use Option 1 (Cloud Build API)

### Internal Considerations

- **Multi-tenant isolation**: Different customers might use different projects
- **For benchmarking**: Set up a dedicated project or ensure you're always using the same one
- **Build isolation**: Make sure benchmark builds don't interfere with production customer builds

---

## Recommended Approach Decision Tree

```
Do you work at Pantheon?
├─ YES → Use internal GCP project access (Option 1)
│        Contact DevOps for service account
│
└─ NO  → Can you access build logs?
         ├─ YES → Do logs show GCP project ID?
         │        ├─ YES → Request access from Pantheon support (Option 1)
         │        └─ NO  → Can you customize build process?
         │                 ├─ YES → Use build reporting (Option 2)
         │                 └─ NO  → Use external monitoring (Option 3)
         │
         └─ NO  → Contact Pantheon support for guidance
```

---

## Testing Your Integration

1. **Manual test**
   ```bash
   export GCP_PROJECT_ID="your-project-id"
   export GCP_SERVICE_ACCOUNT_JSON='{"type":"service_account"...}'
   export PANTHEON_BUILD_ID="your-build-id"  # or commit SHA

   node scripts/poll-pantheon-cloudbuild.js
   ```

2. **Verify output**
   - Build status should be returned
   - Duration should be calculated
   - Metadata should include Cloud Build details

3. **Test with workflow**
   - Trigger manual benchmark run
   - Check GitHub Actions logs
   - Verify data in database

---

## Troubleshooting

### "Permission denied" errors

**Issue**: Service account lacks permissions

**Fix**:
```bash
# Verify service account has correct role
gcloud projects get-iam-policy YOUR-PROJECT-ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:YOUR-SA-EMAIL"
```

### "Build not found" errors

**Issue**: Build ID or commit SHA doesn't match

**Fix**:
- Check build logs for actual IDs
- Try finding by timestamp instead
- Verify you're searching the correct GCP project

### "Timeout" when polling

**Issue**: Build takes longer than expected

**Fix**:
- Increase MAX_WAIT_TIME in polling script
- Check build logs for actual completion time
- Verify build is actually running

---

## Next Steps

1. **Run investigation script** to determine your access level
2. **Choose appropriate option** based on what's available
3. **Test manually** before integrating with workflow
4. **Update documentation** with your specific configuration
