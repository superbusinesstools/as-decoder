#!/bin/bash

# AS-Decoder Failed Job Restart Tool
# Automatically restarts all failed jobs or a specific job

set -e

PORT=${PORT:-20080}
BASE_URL="http://localhost:${PORT}/api"

echo "🔄 AS-Decoder Failed Job Restart Tool"
echo "===================================="

# Check if server is running
if ! curl -s --connect-timeout 5 "${BASE_URL}/health" > /dev/null; then
    echo "❌ Server not responding at ${BASE_URL}"
    echo "   Make sure the server is running: npm start"
    exit 1
fi

# Check for specific company ID argument
if [ $# -eq 1 ]; then
    COMPANY_ID="$1"
    echo "🎯 Restarting specific job: $COMPANY_ID"
    
    RESPONSE=$(curl -s -X POST "${BASE_URL}/queue/${COMPANY_ID}/restart")
    SUCCESS=$(echo "$RESPONSE" | jq -r '.success')
    
    if [ "$SUCCESS" = "true" ]; then
        echo "✅ Successfully restarted job: $COMPANY_ID"
    else
        echo "❌ Failed to restart job: $COMPANY_ID"
        echo "   Response: $RESPONSE"
        exit 1
    fi
    exit 0
fi

# Get all failed jobs
echo "🔍 Finding failed jobs..."

FAILED_JOBS=$(curl -s "${BASE_URL}/queue/status/failed" | jq -r '.data.companies[]?.company_id // empty')

if [ -z "$FAILED_JOBS" ]; then
    echo "✅ No failed jobs found!"
    exit 0
fi

echo "📋 Found failed jobs:"
echo "$FAILED_JOBS" | while read -r company_id; do
    echo "   • $company_id"
done

echo ""
echo "🔄 Restarting all failed jobs..."

SUCCESS_COUNT=0
FAIL_COUNT=0

echo "$FAILED_JOBS" | while read -r company_id; do
    echo -n "   Restarting $company_id... "
    
    RESPONSE=$(curl -s -X POST "${BASE_URL}/queue/${company_id}/restart")
    SUCCESS=$(echo "$RESPONSE" | jq -r '.success')
    
    if [ "$SUCCESS" = "true" ]; then
        echo "✅"
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    else
        echo "❌"
        FAIL_COUNT=$((FAIL_COUNT + 1))
        echo "      Error: $(echo "$RESPONSE" | jq -r '.message')"
    fi
done

echo ""
echo "📊 Restart Summary:"
echo "   ✅ Successfully restarted: $SUCCESS_COUNT"
echo "   ❌ Failed to restart: $FAIL_COUNT"

if [ $FAIL_COUNT -gt 0 ]; then
    echo ""
    echo "💡 For manual restart, use:"
    echo "   npm run restart COMPANY_ID"
    exit 1
fi

echo ""
echo "🎉 All failed jobs have been restarted!"
echo "   Monitor progress with: npm run status"