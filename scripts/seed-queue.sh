#!/bin/bash

# Load environment variables
source "$(dirname "$0")/../.env"

# Use PORT from .env or default to 20080
PORT=${PORT:-20080}
BASE_URL="http://localhost:${PORT}"

echo "🚀 Sending test companies to queue endpoint at ${BASE_URL}/api/queue"
echo ""

# Company 1
echo "Processing: absurd-snacks-001"
curl -X POST "${BASE_URL}/api/queue" \
  -H "Content-Type: application/json" \
  -d '{
    "company_id": "absurd-snacks-001",
    "website_url": "https://absurdsnacks.com/",
    "source_url": "https://www.linkedin.com/company/absurd-snacks"
  }' \
  --silent --show-error | jq '.' || echo "Failed to queue absurd-snacks-001"

echo ""
echo "---"

# Company 2
echo "Processing: drinks-arilla-002"
curl -X POST "${BASE_URL}/api/queue" \
  -H "Content-Type: application/json" \
  -d '{
    "company_id": "drinks-arilla-002",
    "website_url": "https://www.drinksarilla.com",
    "source_url": "https://www.crunchbase.com/organization/drinks-arilla"
  }' \
  --silent --show-error | jq '.' || echo "Failed to queue drinks-arilla-002"

echo ""
echo "---"

# Company 3
echo "Processing: dr-petes-003"
curl -X POST "${BASE_URL}/api/queue" \
  -H "Content-Type: application/json" \
  -d '{
    "company_id": "dr-petes-003",
    "website_url": "https://www.dr-petes.com/",
    "source_url": "https://www.glassdoor.com/Overview/dr-petes"
  }' \
  --silent --show-error | jq '.' || echo "Failed to queue dr-petes-003"

echo ""
echo "---"
echo ""
echo "✨ All companies have been sent!"
echo "📊 Check status with:"
echo "  curl ${BASE_URL}/api/queue/absurd-snacks-001 | jq '.'"
echo "  curl ${BASE_URL}/api/queue/drinks-arilla-002 | jq '.'"
echo "  curl ${BASE_URL}/api/queue/dr-petes-003 | jq '.'"