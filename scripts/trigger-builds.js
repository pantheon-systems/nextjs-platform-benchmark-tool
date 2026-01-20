#!/usr/bin/env node

/**
 * Trigger builds on all platforms by pushing benchmark-app to their respective repos
 * This script runs in GitHub Actions and uses git to push to platform-specific repos
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Platform repo configurations
const PLATFORMS = [
  {
    name: 'pantheon',
    repo: 'pantheon-benchmark', // TODO: Update with actual org/repo
    method: 'git' // or 'api' if using platform API
  },
  {
    name: 'vercel',
    repo: 'vercel-benchmark', // TODO: Update with actual org/repo
    method: 'git'
  },
  {
    name: 'netlify',
    repo: 'netlify-benchmark', // TODO: Update with actual org/repo
    method: 'git'
  }
];

function exec(command, options = {}) {
  try {
    return execSync(command, {
      encoding: 'utf8',
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options
    });
  } catch (error) {
    console.error(`Command failed: ${command}`);
    throw error;
  }
}

async function setupGit() {
  console.log('Setting up git configuration...');
  exec('git config --global user.email "benchmark-bot@pantheon.io"');
  exec('git config --global user.name "Benchmark Bot"');
}

async function copyBenchmarkApp(tempDir) {
  console.log('Copying benchmark app to temp directory...');
  const benchmarkDir = path.join(process.cwd(), 'benchmark-app');

  // Create temp directory
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  // Copy all files except node_modules and .next
  exec(`rsync -av --exclude='node_modules' --exclude='.next' ${benchmarkDir}/ ${tempDir}/`);
}

async function pushToPlatformRepo(platform, tempDir) {
  console.log(`\n📤 Pushing to ${platform.name}...`);

  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) {
    throw new Error('GITHUB_TOKEN not set');
  }

  const repoUrl = `https://x-access-token:${githubToken}@github.com/${platform.repo}.git`;
  const platformTempDir = path.join(tempDir, platform.name);

  try {
    // Clone the platform repo
    console.log(`Cloning ${platform.repo}...`);
    exec(`git clone ${repoUrl} ${platformTempDir}`, { silent: true });

    // Copy benchmark app files
    console.log('Copying benchmark app files...');
    exec(`rsync -av --exclude='.git' ${tempDir}/ ${platformTempDir}/`, { silent: true });

    // Commit and push
    process.chdir(platformTempDir);

    exec('git add .');

    const timestamp = new Date().toISOString();
    const commitMessage = `Benchmark run - ${timestamp}\n\n[skip ci]`;

    try {
      exec(`git commit -m "${commitMessage}"`);
      console.log('Changes committed');
    } catch (error) {
      // No changes to commit
      console.log('No changes detected, skipping push');
      return {
        platform: platform.name,
        triggered: false,
        reason: 'no_changes'
      };
    }

    console.log('Pushing to remote...');
    exec('git push origin main');

    console.log(`✅ Successfully triggered build for ${platform.name}`);

    return {
      platform: platform.name,
      triggered: true,
      timestamp: new Date().toISOString(),
      commitHash: exec('git rev-parse HEAD', { silent: true }).trim()
    };

  } catch (error) {
    console.error(`❌ Failed to push to ${platform.name}:`, error.message);
    return {
      platform: platform.name,
      triggered: false,
      error: error.message
    };
  } finally {
    // Return to original directory
    process.chdir(tempDir);
  }
}

async function main() {
  console.log('🚀 Starting build trigger process...\n');

  const startTime = Date.now();
  const tempDir = path.join('/tmp', `benchmark-${Date.now()}`);
  const originalDir = process.cwd();

  try {
    await setupGit();
    await copyBenchmarkApp(tempDir);

    const results = [];

    // Push to all platforms
    for (const platform of PLATFORMS) {
      const result = await pushToPlatformRepo(platform, tempDir);
      results.push(result);
    }

    // Save results to file for next step
    const outputFile = path.join(originalDir, 'trigger-results.json');
    fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
    console.log(`\n📝 Results saved to ${outputFile}`);

    // Summary
    const triggered = results.filter(r => r.triggered).length;
    const failed = results.filter(r => !r.triggered).length;

    console.log('\n📊 Summary:');
    console.log(`   Triggered: ${triggered}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   Duration: ${((Date.now() - startTime) / 1000).toFixed(2)}s`);

    if (failed > 0) {
      console.error('\n⚠️  Some platforms failed to trigger');
      process.exit(1);
    }

    console.log('\n✨ All platforms triggered successfully');

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  } finally {
    // Cleanup
    process.chdir(originalDir);
    if (fs.existsSync(tempDir)) {
      exec(`rm -rf ${tempDir}`);
    }
  }
}

main();
