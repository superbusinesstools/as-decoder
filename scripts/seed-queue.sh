#!/bin/bash

# Load environment variables
source "$(dirname "$0")/../.env"

# Use PORT from .env or default to 20080
PORT=${PORT:-20080}
BASE_URL="http://localhost:${PORT}"

echo "🚀 Sending test companies to queue endpoint at ${BASE_URL}/api/queue"
echo ""

# Company 1
echo "Processing: acme-corp-001"
curl -X POST "${BASE_URL}/api/queue" \
  -H "Content-Type: application/json" \
  -d '{
    "company_id": "acme-corp-001",
    "website_url": "https://www.acme-corp.com",
    "source_url": "https://www.linkedin.com/company/acme-corp"
  }' \
  --silent --show-error | jq '.' || echo "Failed to queue acme-corp-001"

echo ""
echo "---"

# Company 2
echo "Processing: techstart-002"
curl -X POST "${BASE_URL}/api/queue" \
  -H "Content-Type: application/json" \
  -d '{
    "company_id": "techstart-002",
    "website_url": "https://www.techstart.io",
    "source_url": "https://www.crunchbase.com/organization/techstart"
  }' \
  --silent --show-error | jq '.' || echo "Failed to queue techstart-002"

echo ""
echo "---"

# Company 3
echo "Processing: globalsoft-003"
curl -X POST "${BASE_URL}/api/queue" \
  -H "Content-Type: application/json" \
  -d '{
    "company_id": "globalsoft-003",
    "website_url": "https://www.globalsoft.net",
    "source_url": "https://www.glassdoor.com/Overview/globalsoft"
  }' \
  --silent --show-error | jq '.' || echo "Failed to queue globalsoft-003"

echo ""
echo "---"
echo ""
echo "✨ All companies have been sent!"
echo "📊 Check status with:"
echo "  curl ${BASE_URL}/api/queue/acme-corp-001 | jq '.'"
echo "  curl ${BASE_URL}/api/queue/techstart-002 | jq '.'"
echo "  curl ${BASE_URL}/api/queue/globalsoft-003 | jq '.'"