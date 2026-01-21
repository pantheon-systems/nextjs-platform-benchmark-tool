#!/usr/bin/env node

/**
 * Pantheon Cloud Build Poller - Internal Version
 *
 * For internal Pantheon use with access to Pantheon's GCP project.
 * Finds benchmark builds by commit SHA and timing.
 */

const { PantheonCloudBuildPoller } = require('./poll-pantheon-cloudbuild');

/**
 * Find and poll Pantheon benchmark build
 */
async function pollPantheonBenchmark(triggerResult, maxWaitMs = 60 * 60 * 1000) {
  const projectId = process.env.GCP_PROJECT_ID;
  const serviceAccountJson = process.env.GCP_SERVICE_ACCOUNT_JSON;

  if (!projectId || !serviceAccountJson) {
    console.error('[Pantheon] Missing GCP credentials');
    return {
      status: 'failure',
      completed: true,
      error_message: 'GCP_PROJECT_ID or GCP_SERVICE_ACCOUNT_JSON not set'
    };
  }

  const poller = new PantheonCloudBuildPoller(projectId, serviceAccountJson);
  const startTime = Date.now();

  try {
    console.log(`[Pantheon] Looking for build with commit ${triggerResult.commitHash}`);

    // Give Cloud Build a few seconds to register the build
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Try to find build by commit SHA
    let buildData = await poller.findBuildByCommit(triggerResult.commitHash);

    // If not found, try a few more times (build might not be registered yet)
    let attempts = 0;
    while (!buildData && attempts < 6) {
      console.log(`[Pantheon] Build not found yet, waiting... (attempt ${attempts + 1}/6)`);
      await new Promise(resolve => setTimeout(resolve, 10000));
      buildData = await poller.findBuildByCommit(triggerResult.commitHash);
      attempts++;
    }

    if (!buildData) {
      // Fallback: try finding by time window
      console.log(`[Pantheon] Commit-based search failed, trying time-based search...`);
      const triggerTime = new Date(triggerResult.timestamp);
      buildData = await poller.findRecentBuild(
        new Date(triggerTime.getTime() - 30000), // 30s before trigger
        50 // Check last 50 builds
      );
    }

    if (!buildData) {
      console.error('[Pantheon] Could not find build');
      return {
        status: 'failure',
        completed: true,
        error_message: 'Build not found in Cloud Build history'
      };
    }

    console.log(`[Pantheon] Found build: ${buildData.buildId}`);

    // Poll until complete
    if (!buildData.completed) {
      const remainingTime = maxWaitMs - (Date.now() - startTime);
      buildData = await poller.pollUntilComplete(buildData.buildId, remainingTime);
    }

    // Convert to standard format
    return {
      platform: 'pantheon',
      status: buildData.status,
      completed: buildData.completed,
      trigger_time: new Date(triggerResult.timestamp),
      completion_time: buildData.finishTime,
      duration_seconds: buildData.durationSeconds,
      build_id: buildData.buildId,
      error_message: buildData.status === 'failure' ? 'Build failed' : null,
      metadata: buildData.metadata
    };

  } catch (error) {
    console.error('[Pantheon] Error polling Cloud Build:', error.message);
    return {
      status: 'failure',
      completed: true,
      error_message: error.message,
      metadata: { error: error.stack }
    };
  }
}

module.exports = { pollPantheonBenchmark };

// CLI usage
if (require.main === module) {
  const triggerResult = {
    commitHash: process.env.COMMIT_SHA || 'unknown',
    timestamp: new Date().toISOString()
  };

  pollPantheonBenchmark(triggerResult)
    .then(result => {
      console.log('\n=== Result ===');
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.status === 'success' ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}
