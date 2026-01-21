#!/bin/bash

###############################################################################
# Build Reporter Script
#
# Add this to your Pantheon build process to report build status directly
# to your benchmark tracking system.
#
# Usage: Call this script at the end of your build process or in cloudbuild.yaml
###############################################################################

WEBHOOK_URL="${BENCHMARK_WEBHOOK_URL:-}"
PLATFORM="pantheon"
BUILD_ID="${BUILD_ID:-unknown}"
COMMIT_SHA="${COMMIT_SHA:-$(git rev-parse HEAD)}"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Check if webhook URL is configured
if [ -z "$WEBHOOK_URL" ]; then
    echo "Warning: BENCHMARK_WEBHOOK_URL not set, skipping reporting"
    exit 0
fi

# Determine build status
STATUS="${1:-success}"

# Build payload
PAYLOAD=$(cat <<EOF
{
  "platform": "${PLATFORM}",
  "buildId": "${BUILD_ID}",
  "commitSha": "${COMMIT_SHA}",
  "status": "${STATUS}",
  "timestamp": "${TIMESTAMP}",
  "metadata": {
    "projectId": "${PROJECT_ID:-}",
    "region": "${REGION:-}",
    "serviceName": "${SERVICE_NAME:-}"
  }
}
EOF
)

echo "Reporting build status to webhook..."
echo "Payload: ${PAYLOAD}"

# Send to webhook
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${WEBHOOK_URL}" \
  -H "Content-Type: application/json" \
  -H "X-Build-Reporter: pantheon" \
  -d "${PAYLOAD}")

HTTP_CODE=$(echo "$RESPONSE" | tail -n 1)
RESPONSE_BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 201 ]; then
    echo "✅ Successfully reported build status (HTTP $HTTP_CODE)"
else
    echo "⚠️  Failed to report build status (HTTP $HTTP_CODE)"
    echo "Response: $RESPONSE_BODY"
fi

exit 0
