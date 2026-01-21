#!/usr/bin/env node

/**
 * Poll Pantheon builds using GCP Cloud Build API
 *
 * Requirements:
 * - GCP_PROJECT_ID: The GCP project where Pantheon runs builds
 * - GCP_SERVICE_ACCOUNT_JSON: Service account with Cloud Build Viewer role
 * - Either PANTHEON_BUILD_ID or ability to list/find recent builds
 */

const { CloudBuildClient } = require('@google-cloud/cloudbuild').v1;

class PantheonCloudBuildPoller {
  constructor(projectId, serviceAccountJson) {
    this.projectId = projectId;
    this.client = new CloudBuildClient({
      credentials: JSON.parse(serviceAccountJson)
    });
  }

  /**
   * Get build status by ID
   */
  async getBuildById(buildId) {
    try {
      const [build] = await this.client.getBuild({
        projectId: this.projectId,
        id: buildId
      });

      return this.parseBuildData(build);
    } catch (error) {
      console.error(`Error fetching build ${buildId}:`, error.message);
      throw error;
    }
  }

  /**
   * Find build by git commit SHA or source metadata
   */
  async findBuildByCommit(commitSha, maxResults = 10) {
    try {
      const [builds] = await this.client.listBuilds({
        projectId: this.projectId,
        pageSize: maxResults,
        filter: `source.repoSource.commitSha="${commitSha}"`
      });

      if (builds.length === 0) {
        console.log(`No builds found for commit ${commitSha}`);
        return null;
      }

      // Return most recent build
      return this.parseBuildData(builds[0]);
    } catch (error) {
      console.error(`Error finding build by commit:`, error.message);
      throw error;
    }
  }

  /**
   * Find most recent build (fallback method)
   */
  async findRecentBuild(afterTime, maxResults = 20) {
    try {
      const [builds] = await this.client.listBuilds({
        projectId: this.projectId,
        pageSize: maxResults
      });

      // Find first build started after our trigger time
      const afterDate = new Date(afterTime);
      for (const build of builds) {
        const buildStartTime = new Date(build.startTime.seconds * 1000);
        if (buildStartTime >= afterDate) {
          return this.parseBuildData(build);
        }
      }

      console.log(`No builds found after ${afterTime}`);
      return null;
    } catch (error) {
      console.error(`Error finding recent build:`, error.message);
      throw error;
    }
  }

  /**
   * Parse Cloud Build data into standard format
   */
  parseBuildData(build) {
    const startTime = build.startTime ?
      new Date(build.startTime.seconds * 1000) : null;
    const finishTime = build.finishTime ?
      new Date(build.finishTime.seconds * 1000) : null;

    let durationSeconds = null;
    if (startTime && finishTime) {
      durationSeconds = Math.round((finishTime - startTime) / 1000);
    }

    // Map Cloud Build status to our standard status
    const statusMap = {
      'SUCCESS': 'success',
      'FAILURE': 'failure',
      'TIMEOUT': 'timeout',
      'CANCELLED': 'failure',
      'INTERNAL_ERROR': 'failure',
      'WORKING': 'in_progress',
      'QUEUED': 'in_progress',
      'PENDING': 'in_progress'
    };

    const isCompleted = ['SUCCESS', 'FAILURE', 'TIMEOUT', 'CANCELLED', 'INTERNAL_ERROR']
      .includes(build.status);

    return {
      buildId: build.id,
      status: statusMap[build.status] || 'in_progress',
      completed: isCompleted,
      startTime,
      finishTime,
      durationSeconds,
      metadata: {
        cloudBuildId: build.id,
        cloudBuildStatus: build.status,
        logUrl: build.logUrl,
        projectId: this.projectId,
        sourceCommit: build.substitutions?.COMMIT_SHA || build.sourceProvenance?.resolvedRepoSource?.commitSha,
        images: build.images,
        timing: build.timing
      }
    };
  }

  /**
   * Poll until build completes
   */
  async pollUntilComplete(buildId, maxWaitMs = 60 * 60 * 1000, pollIntervalMs = 10000) {
    const startTime = Date.now();

    while (true) {
      const elapsed = Date.now() - startTime;

      if (elapsed > maxWaitMs) {
        console.log(`[Pantheon Cloud Build] Timeout after ${elapsed / 1000}s`);
        return {
          status: 'timeout',
          completed: true,
          metadata: { timeout: true }
        };
      }

      try {
        const buildData = await this.getBuildById(buildId);

        if (buildData.completed) {
          const duration = (Date.now() - startTime) / 1000;
          console.log(`[Pantheon Cloud Build] Completed in ${duration.toFixed(2)}s - ${buildData.status}`);
          return buildData;
        }

        console.log(`[Pantheon Cloud Build] Still building... (${(elapsed / 1000).toFixed(0)}s elapsed)`);
        await new Promise(resolve => setTimeout(resolve, pollIntervalMs));

      } catch (error) {
        console.error(`[Pantheon Cloud Build] Error polling:`, error.message);
        return {
          status: 'failure',
          completed: true,
          metadata: { error: error.message }
        };
      }
    }
  }
}

// Example usage
async function main() {
  const projectId = process.env.GCP_PROJECT_ID;
  const serviceAccountJson = process.env.GCP_SERVICE_ACCOUNT_JSON;
  const buildId = process.env.PANTHEON_BUILD_ID;
  const commitSha = process.env.PANTHEON_COMMIT_SHA;

  if (!projectId || !serviceAccountJson) {
    console.error('Error: GCP_PROJECT_ID and GCP_SERVICE_ACCOUNT_JSON must be set');
    process.exit(1);
  }

  const poller = new PantheonCloudBuildPoller(projectId, serviceAccountJson);

  try {
    let buildData;

    if (buildId) {
      console.log(`Fetching build by ID: ${buildId}`);
      buildData = await poller.getBuildById(buildId);
    } else if (commitSha) {
      console.log(`Finding build by commit: ${commitSha}`);
      buildData = await poller.findBuildByCommit(commitSha);
    } else {
      console.log('Finding most recent build...');
      buildData = await poller.findRecentBuild(new Date(Date.now() - 5 * 60 * 1000)); // Last 5 minutes
    }

    if (!buildData) {
      console.error('No build found');
      process.exit(1);
    }

    console.log('\nBuild Data:', JSON.stringify(buildData, null, 2));

    if (!buildData.completed) {
      console.log('\nBuild in progress, polling until complete...');
      const finalData = await poller.pollUntilComplete(buildData.buildId);
      console.log('\nFinal Build Data:', JSON.stringify(finalData, null, 2));
    }

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { PantheonCloudBuildPoller };
