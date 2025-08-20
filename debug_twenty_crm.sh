#!/bin/bash

# Debug script to send data to Twenty CRM
# Usage: ./debug_twenty_crm.sh <company_id>
# Based on the data structure provided

if [ $# -eq 0 ]; then
    echo "❌ Error: Company ID is required"
    echo "Usage: $0 <company_id>"
    echo "Example: $0 63e22000-686a-4256-860e-b760130da52a"
    exit 1
fi

COMPANY_ID="$1"
TWENTY_API_URL="https://20.afternoonltd.com"
TWENTY_API_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjZThlYjk0My02ZDNkLTQwOGItODY5ZC0zZTVjZDBlMDc3ZDgiLCJ0eXBlIjoiQVBJX0tFWSIsIndvcmtzcGFjZUlkIjoiY2U4ZWI5NDMtNmQzZC00MDhiLTg2OWQtM2U1Y2QwZTA3N2Q4IiwiaWF0IjoxNzU1NDYyOTkzLCJleHAiOjQ5MDkwNjI5OTIsImp0aSI6IjEzOGU4Y2E3LTU2MDAtNGNiZC1iNDBkLTkyYmM4YjQxNjdjNCJ9.GDX0fPGbvHyDY6hyTDbtCkEyidnyDQSp2n8lkzKFPWE"

echo "🚀 Starting Twenty CRM debug requests for company: $COMPANY_ID"

# 0. Clear company data (keep only name)
echo "🧹 Clearing company data (keeping only name)..."
curl -X PATCH "${TWENTY_API_URL}/rest/companies/${COMPANY_ID}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TWENTY_API_KEY}" \
  -d '{
    "industry": null,
    "overview": null,
    "offerings": null,
    "targetMarket": null,
    "techStack": null
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s

echo -e "\n"

# 1. Update company data
echo "📝 Updating company (PATCH /rest/companies/${COMPANY_ID})..."
curl -X PATCH "${TWENTY_API_URL}/rest/companies/${COMPANY_ID}" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TWENTY_API_KEY}" \
  -d '{
    "name": "Acme Ltd",
    "industry": "Software Development",
    "overview": "We are a team of developers specialised in building AI-powered software solutions designed to address various business needs and accelerate digital transformation in the AI-age.",
    "offerings": [
      {
        "name": "Generic AI Tool",
        "description": "AI Tool"
      },
      {
        "name": "Generic Wave Software",
        "description": "Save your data with AI"
      }
    ],
    "targetMarket": "Businesses looking for AI-powered software solutions and digital transformation",
    "techStack": [
      "VueJS",
      "Laravel",
      "Behat",
      "PhpSpec",
      "Tailwind CSS",
      "Cypress",
      "Astro"
    ]
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s

echo -e "\n" 

# 2. Create note
echo "📄 Creating note (POST /rest/notes)..."
curl -X POST "${TWENTY_API_URL}/rest/notes" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TWENTY_API_KEY}" \
  -d '{
    "title": "AI Enrichment - 8/20/2025",
    "bodyV2": {
      "markdown": "**Additional Notes:**\nCompany focuses on AI-powered software development, with blog content centered on technical development environments and tools"
    }
  }' \
  -w "\nHTTP Status: %{http_code}\n" \
  -s

echo -e "\n"

# 3. Create note target (linking note to company)
echo "🔗 Creating note target (POST /rest/noteTargets)..."
curl -X POST "${TWENTY_API_URL}/rest/noteTargets" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TWENTY_API_KEY}" \
  -d "{
    \"noteId\": \"8a1eaae0-c8b2-4e7e-9d8f-2761545d024a\",
    \"companyId\": \"${COMPANY_ID}\"
  }" \
  -w "\nHTTP Status: %{http_code}\n" \
  -s

echo -e "\n✅ All requests completed!"