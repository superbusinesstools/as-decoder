#!/bin/bash

# AS-Decoder Status Monitor
# Simple CLI tool to check processing status

set -e

PORT=${PORT:-20080}
BASE_URL="http://localhost:${PORT}/api"

echo "🔍 AS-Decoder Status Monitor"
echo "================================="

# Check if server is running
if ! curl -s --connect-timeout 5 "${BASE_URL}/health" > /dev/null; then
    echo "❌ Server not responding at ${BASE_URL}"
    echo "   Make sure the server is running: npm start"
    exit 1
fi

echo "✅ Server is running"
echo ""

# Get recent companies
echo "📊 Recent Requests (last 10):"
echo "---------------------------------"

RECENT_DATA=$(curl -s "${BASE_URL}/queue/status/recent" | jq -r '.data.companies[]? // empty | "\(.company_id)|\(.status)|\(.current_step)|\(.created_at)"')

if [ -z "$RECENT_DATA" ]; then
    echo "   No requests found in database"
else
    echo "Company ID              | Status     | Step          | Created"
    echo "------------------------|------------|---------------|------------------"
    echo "$RECENT_DATA" | while IFS='|' read -r company_id status current_step created_at; do
        # Format the created_at timestamp
        formatted_date=$(date -d "$created_at" "+%m/%d %H:%M" 2>/dev/null || echo "$created_at")
        
        # Add status emoji
        case "$status" in
            "pending")     status_icon="⏳" ;;
            "processing")  status_icon="🔄" ;;
            "completed")   status_icon="✅" ;;
            "failed")      status_icon="❌" ;;
            *)             status_icon="❓" ;;
        esac
        
        # Add step emoji
        case "$current_step" in
            "pending")        step_icon="⏸️ " ;;
            "crawling")       step_icon="🌐" ;;
            "ai_processing")  step_icon="🤖" ;;
            "crm_sending")    step_icon="📤" ;;
            "completed")      step_icon="✅" ;;
            *)                step_icon="❓" ;;
        esac
        
        printf "%-23s | %s %-8s | %s %-12s | %s\n" \
            "${company_id:0:22}" \
            "$status_icon" "$status" \
            "$step_icon" "$current_step" \
            "$formatted_date"
    done
fi

echo ""

# Quick stats
if [ -n "$RECENT_DATA" ]; then
    TOTAL=$(echo "$RECENT_DATA" | wc -l)
    COMPLETED=$(echo "$RECENT_DATA" | grep -c "completed" || echo "0")
    FAILED=$(echo "$RECENT_DATA" | grep -c "failed" || echo "0")
    PROCESSING=$(echo "$RECENT_DATA" | grep -c "processing" || echo "0")
    
    echo "📈 Quick Stats:"
    echo "   Total: $TOTAL | ✅ Completed: $COMPLETED | ❌ Failed: $FAILED | 🔄 Processing: $PROCESSING"
fi

echo ""

# Show failed jobs if any exist
FAILED_DATA=$(curl -s "${BASE_URL}/queue/status/failed" | jq -r '.data.companies[]? // empty | "\(.company_id)|\(.created_at)"')

if [ -n "$FAILED_DATA" ]; then
    echo "❌ Failed Jobs:"
    echo "---------------------------------"
    echo "$FAILED_DATA" | while IFS='|' read -r company_id created_at; do
        formatted_date=$(date -d "$created_at" "+%m/%d %H:%M" 2>/dev/null || echo "$created_at")
        printf "%-23s | %s\n" "${company_id:0:22}" "$formatted_date"
    done
    echo ""
    echo "🔄 To restart a failed job:"
    echo "   curl -X POST ${BASE_URL}/queue/COMPANY_ID/restart"
    echo ""
fi

echo "💡 Tips:"
echo "   • Get details: curl ${BASE_URL}/queue/COMPANY_ID"
echo "   • View failed jobs: curl ${BASE_URL}/queue/status/failed"
echo "   • Restart job: curl -X POST ${BASE_URL}/queue/COMPANY_ID/restart"
echo "   • View server logs: npm run pm2:logs"
echo "   • Check health: curl ${BASE_URL}/health"