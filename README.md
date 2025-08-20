# AS-Decoder Web Crawler Queue System

A resumable queue management system for web crawling operations with Claude AI integration and CRM automation.

## Quick Deployment

Deploy latest changes to production server:
```bash
npm run deploy
```
This will automatically: pull latest code → install dependencies → build → restart PM2

## Features

- **Resumable Processing**: Steps can be resumed from where they failed
- **Claude AI Integration**: Intelligent content analysis with editable prompts
- **CRM Automation**: Structured data extraction for CRM integration
- **SQLite Database**: Persistent storage with step tracking
- **Process Logging**: Comprehensive tracking of 4-step workflow:
  1. Receive company details (webhook/queue endpoint)
  2. Crawl website (skip if already done)
  3. Process with Claude AI (skip if already done)
  4. Send to CRM (with sub-step tracking)
- **Input Validation**: Request validation with Joi
- **Comprehensive Testing**: Full test coverage

## Installation

```bash
npm install
```

## Configuration

### Environment Variables
Create or update `.env` file:

```bash
# Server Configuration
PORT=20080

# Database Configuration
DB_PATH=crawler.db

# Environment
NODE_ENV=development

# AI Configuration
ANTHROPIC_API_KEY=your_anthropic_api_key_here
CLAUDE_MODEL=claude-3-haiku-20240307

# Crawling Configuration
CRAWL_MAX_DEPTH=3              # How many "clicks" deep to follow links (1=homepage only, 2=homepage+linked pages, 3=deeper)
CRAWL_MAX_PAGES=20             # Maximum total pages to scrape (prevents crawling huge sites)

# Scraper API Configuration
SCRAPER_API_URL=https://as-scraper.afternoonltd.com
SCRAPER_TIMEOUT_SECONDS=240    # Scraper timeout in seconds (default: 4 minutes)
SCRAPER_THREADS=6              # Concurrent threads for scraping (default: 6, range: 1-20)

# Authentication
AUTH_TOKEN=772716ceb4cb117fb2858a7c0147e126841f09ce978ac5cb0dcf1ffb75b33cf2  # Required for API access and dashboard

# Twenty CRM API Configuration
TWENTY_API_URL=https://20.afternoonltd.com
TWENTY_API_KEY=your_twenty_api_key_here
```

### AI Prompt Customization
Edit the AI analysis prompt in `src/services/ai/prompt.txt` to customize how Claude analyzes company websites. Changes take effect immediately without restarting the application.

## Running the Application

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm start           # Start with pm2 (includes auto-watch)
```

### Development with Auto-Restart
```bash
# Option 1: PM2 with watch mode (recommended for production-like environment)
npm run build
npm start            # Automatically watches dist/ folder for changes

# Option 2: Direct development mode
npm run dev          # Uses ts-node for immediate TypeScript execution

# When using PM2 watch mode, rebuild to trigger restart:
npm run build        # PM2 will automatically restart when dist/ changes
```

### Deployment
```bash
# 🚀 One-command deployment (recommended)
npm run deploy

# Manual deployment steps:
git pull origin master
npm install
npm run build
npm run pm2:restart
```

**Note**: The `npm run deploy` script automatically handles all deployment steps and provides status feedback.

### PM2 Management
```bash
npm run pm2:start      # Start with ecosystem config (auto-watch enabled)
npm run pm2:start-watch # Start with explicit watch mode
npm run pm2:restart    # Restart the process
npm run pm2:reload     # Graceful reload (zero-downtime)
npm run pm2:stop       # Stop the process
npm run pm2:logs       # View logs
```

### Testing
```bash
npm test
```

### Utility Scripts
```bash
npm run reset          # Reset database
npm run seed           # Seed test data
npm run scrape         # Test scraping functionality
npm run status         # View processing status and recent requests
npm run restart-jobs   # Restart all failed jobs or specific job by ID
```

#### Testing Scraping with Different Settings
```bash
# Use environment defaults (depth=3, pages=20)
npm run scrape https://example.com

# Override depth and pages
npm run scrape https://example.com --depth 2 --max-pages 10

# Verbose output for debugging
npm run scrape https://example.com --verbose
```

## API Endpoints

### Authentication

All API endpoints (except `/api/health`) require authentication using an auth token. There are two ways to provide the token:

1. **Header**: `X-Auth-Token: YOUR_AUTH_TOKEN`
2. **Query Parameter**: `?token=YOUR_AUTH_TOKEN`

**Current Auth Token**: `772716ceb4cb117fb2858a7c0147e126841f09ce978ac5cb0dcf1ffb75b33cf2`

### Web Dashboard

Access the enhanced status dashboard at: `https://as-decoder.afternoonltd.com/status.html`

**Features:**
- 🔐 Password protected with auth token
- 📊 Summary cards showing status counts
- 🔍 Search by Company ID
- 🎯 Filter by status (pending, processing, completed, failed)
- 🔄 Restart individual or all failed jobs
- 📱 Mobile-responsive design
- ⏱️ Auto-refresh every 10 seconds
- 📝 Shows website URLs and error messages for failed jobs

**Login Instructions:**
1. Navigate to `https://as-decoder.afternoonltd.com/status.html`
2. Enter the auth token: `772716ceb4cb117fb2858a7c0147e126841f09ce978ac5cb0dcf1ffb75b33cf2`
3. The token will be saved in your browser for convenience

### POST /api/queue
Queue a company for processing.

**Request Body:**
```json
{
  "company_id": "unique-company-id",
  "website_url": "https://example.com",
  "source_url": "https://source.example.com"  // Optional - if not provided, fetches from CRM
}
```

**Fields:**
- `company_id` (required): Unique identifier for the company
- `website_url` (required): Company website URL to crawl
- `source_url` (optional): Specific URL to crawl. If not provided, the system will:
  1. Look up the company in Twenty CRM by `company_id`
  2. Use the `sourceUrl` field from CRM if available
  3. Fall back to using `website_url` if CRM lookup fails or no `sourceUrl` found

**Example with source_url:**
```json
{
  "company_id": "abc123",
  "website_url": "https://example.com",
  "source_url": "https://specific.example.com/landing"
}
```

**Example without source_url (CRM lookup):**
```json
{
  "company_id": "abc123",
  "website_url": "https://example.com"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Company queued successfully",
  "data": {
    "id": 1,
    "company_id": "unique-company-id",
    "status": "pending",
    "created_at": "2024-01-01T12:00:00.000Z"
  }
}
```

**CURL Examples:**
```bash
# Queue a company for processing (with auth)
curl -X POST https://as-decoder.afternoonltd.com/api/queue \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: 772716ceb4cb117fb2858a7c0147e126841f09ce978ac5cb0dcf1ffb75b33cf2" \
  -d '{
    "company_id": "test-company-123",
    "website_url": "https://example.com"
  }'

# Queue with optional source_url (with auth)
curl -X POST https://as-decoder.afternoonltd.com/api/queue \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: 772716ceb4cb117fb2858a7c0147e126841f09ce978ac5cb0dcf1ffb75b33cf2" \
  -d '{
    "company_id": "test-company-456",
    "website_url": "https://example.com",
    "source_url": "https://example.com/about"
  }'
```

### GET /api/queue/:company_id
Get company status and process logs.

**CURL Example:**
```bash
curl https://as-decoder.afternoonltd.com/api/queue/test-company-123 \
  -H "X-Auth-Token: 772716ceb4cb117fb2858a7c0147e126841f09ce978ac5cb0dcf1ffb75b33cf2"
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "company": {
      "id": 1,
      "company_id": "unique-company-id",
      "website_url": "https://example.com",
      "source_url": "https://source.example.com",
      "status": "processing",
      "current_step": "ai_processing",
      "raw_data": "...",
      "processed_data": "...",
      "created_at": "2024-01-01T12:00:00.000Z",
      "updated_at": "2024-01-01T12:00:00.000Z"
    },
    "logs": [
      {
        "id": 1,
        "company_id": "unique-company-id",
        "step": "crawling",
        "status": "completed",
        "message": "Website crawl completed",
        "created_at": "2024-01-01T12:00:00.000Z"
      }
    ]
  }
}
```

### GET /api/health
Health check endpoint (no authentication required).

**CURL Example:**
```bash
curl https://as-decoder.afternoonltd.com/api/health
```

### GET /api/queue/status/recent
Get recent processing status for all companies.

**Query Parameters:**
- `limit` (optional): Number of companies to return (default: 20, max: 50)
- `page` (optional): Page number for pagination (default: 1)

**CURL Examples:**
```bash
# Get recent companies (default: 20 items, page 1) with auth
curl https://as-decoder.afternoonltd.com/api/queue/status/recent \
  -H "X-Auth-Token: 772716ceb4cb117fb2858a7c0147e126841f09ce978ac5cb0dcf1ffb75b33cf2"

# Get page 2 with 30 items per page (with auth)
curl "https://as-decoder.afternoonltd.com/api/queue/status/recent?page=2&limit=30" \
  -H "X-Auth-Token: 772716ceb4cb117fb2858a7c0147e126841f09ce978ac5cb0dcf1ffb75b33cf2"
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "companies": [
      {
        "id": 1,
        "company_id": "abc123",
        "status": "completed",
        "current_step": "completed",
        "created_at": "2024-01-01T12:00:00.000Z"
      }
    ],
    "count": 1,
    "total": 10,
    "page": 1,
    "totalPages": 1
  }
}
```

### GET /api/queue/status/failed
Get all failed jobs.

**CURL Example:**
```bash
curl https://as-decoder.afternoonltd.com/api/queue/status/failed \
  -H "X-Auth-Token: 772716ceb4cb117fb2858a7c0147e126841f09ce978ac5cb0dcf1ffb75b33cf2"
```

### POST /api/queue/:company_id/restart
Restart a failed job from the last successful step.

**CURL Example:**
```bash
curl -X POST https://as-decoder.afternoonltd.com/api/queue/test-company-123/restart \
  -H "X-Auth-Token: 772716ceb4cb117fb2858a7c0147e126841f09ce978ac5cb0dcf1ffb75b33cf2"
```

## Monitoring & Status

### CLI Status Monitor
Use the built-in status monitor to quickly check processing progress:

```bash
npm run status
```

This displays:
- 📊 Recent requests (last 10) with status and processing step
- 📈 Quick stats (total, completed, failed, processing)
- 💡 Helpful commands for deeper investigation

### Real-time Logs
Monitor real-time processing with emoji-coded logs:

```bash
npm run pm2:logs
```

Log format:
- 🔄 Processing started
- 🌐 Website crawling
- 🤖 AI processing  
- 📤 CRM sending
- ✅ Completed / ❌ Failed

### API Monitoring
- **Individual Status**: `GET /api/queue/COMPANY_ID` - Detailed status and logs for specific company
- **Recent Overview**: `GET /api/queue/status/recent?limit=20` - List of recent processing requests
- **Failed Jobs**: `GET /api/queue/status/failed` - List of all failed jobs
- **Restart Job**: `POST /api/queue/COMPANY_ID/restart` - Restart a failed job from last successful step
- **Health Check**: `GET /health` - Server status

### Restarting Failed Jobs

**Simple restart commands:**
```bash
npm run restart-jobs               # Restart all failed jobs automatically
npm run restart-jobs COMPANY_ID    # Restart specific job by ID
npm run status                     # Check for failed jobs with full IDs
```

**API endpoints:**
```bash
curl https://as-decoder.afternoonltd.com/api/queue/status/failed      # View failed jobs
curl -X POST https://as-decoder.afternoonltd.com/api/queue/COMPANY_ID/restart  # Restart specific job
```

The system intelligently restarts from the last successful step:
- If crawling failed → restarts from beginning
- If AI processing failed → restarts from AI step (keeps crawled data)
- If CRM sending failed → restarts from CRM step (keeps all previous data)

**Example workflow:**
```bash
# Check processing status
npm run status

# If failed jobs are shown, restart them all
npm run restart-jobs

# Or restart a specific job
npm run restart-jobs dr-petes-003
```

## Processing Workflow

The system processes companies through 4 resumable steps:

1. **Receive Company Data**: Company details are queued via API endpoint
2. **Website Crawling**: Extract content using Scraper API (skipped if raw_data exists)
3. **AI Processing**: Analyze content with Claude AI (skipped if processed_data exists)
4. **CRM Integration**: Send structured data to CRM with sub-step tracking

### Resumable Processing
- If any step fails, the system can resume from that exact step
- No repeated work - expensive operations like crawling and AI analysis won't be re-run
- Sub-step tracking for CRM integration allows partial completion recovery
- Error messages are stored in the database for debugging

### Error Handling & Validation

**Company ID Validation:**
- Twenty CRM requires company IDs to be in UUID format (e.g., `123e4567-e89b-12d3-a456-426614174000`)
- Non-UUID company IDs will be rejected with a clear error message
- Use valid UUIDs when queuing companies for CRM integration

**Scraper Configuration:**
- **Timeout**: Default 240 seconds (configurable via `SCRAPER_TIMEOUT_SECONDS`)
- **Threads**: Default 6 concurrent threads (configurable via `SCRAPER_THREADS`, range: 1-20)
- **Performance**: More threads = faster scraping but higher server load
- **Recommendations**: 
  - Use 1-3 threads for conservative scraping
  - Use 4-8 threads for balanced performance
  - Use 9+ threads for aggressive scraping (use with caution)
- Large or slow websites may timeout - restart the job or increase timeout
- Failed scraping jobs can be restarted from the dashboard

**Error Messages:**
- All errors are stored in the `error_message` column in the database
- View error details in the status dashboard for debugging
- Common errors include timeouts, invalid UUIDs, and API connectivity issues

## AI Integration

### Claude AI Analysis
The system uses Claude AI to extract structured information from website content into the new enhanced format:

```json
{
  "company_data": {
    "name": "Company Name",
    "description": "Detailed company description",
    "industry": "Technology",
    "size_category": "medium",
    "employee_count": 150,
    "employee_range": "100-200",
    "founded_year": 2010,
    "headquarters": "San Francisco, CA",
    "other_locations": ["New York, NY", "Austin, TX"],
    "phone": "+1-555-123-4567",
    "linkedin": "https://linkedin.com/company/example",
    "twitter": "https://twitter.com/example",
    "facebook": "https://facebook.com/example",
    "instagram": "https://instagram.com/example"
  },
  "people": [
    {
      "email": "john.doe@example.com",
      "title": "CEO",
      "first_name": "John",
      "last_name": "Doe",
      "phone": "+1-555-123-4568",
      "linkedin": "https://linkedin.com/in/johndoe"
    }
  ],
  "services": {
    "company_overview": "Business description and mission",
    "offerings": "Products and services offered",
    "target_market": "Target industries and customer segments",
    "tech_stack": "Technologies and platforms used",
    "competitive_intel": "Competitive advantages and differentiators",
    "recent_activity": "Recent news, launches, and developments"
  },
  "quality_signals": [
    "Fortune 500 clients",
    "ISO 27001 certified",
    "Industry awards and recognition"
  ],
  "growth_signals": [
    "200% YoY revenue growth",
    "Expanded to new markets",
    "Recent funding rounds"
  ],
  "industry_metrics": [
    "Technology: 150 employees, $15M ARR",
    "SaaS: 500+ enterprise clients, 2% churn rate"
  ],
  "notes": "Additional valuable information and context"
}
```

### Prompt Customization
Edit `src/services/ai/prompt.txt` to customize AI analysis. The prompt supports template variables:
- `{{company_id}}` - Company identifier
- `{{website_url}}` - Company website URL
- `{{source_url}}` - Source URL
- `{{content}}` - Scraped website content

## Database Schema

### Companies Table
- `id` - Primary key
- `company_id` - Unique company identifier
- `website_url` - Company website URL
- `source_url` - Source URL for crawling
- `status` - Current status (pending/processing/completed/failed)
- `current_step` - Current processing step (pending/crawling/ai_processing/crm_sending/completed)
- `raw_data` - Scraped website content
- `processed_data` - Claude AI analysis results (JSON)
- `created_at` - Record creation timestamp
- `updated_at` - Last update timestamp

### Process Logs Table
- `id` - Primary key
- `company_id` - Foreign key to companies
- `step` - Process step (received/crawling/ai_processing/crm_sending)
- `status` - Step status (started/completed/failed)
- `message` - Optional message
- `data` - Optional JSON data
- `created_at` - Log creation timestamp

## Twenty CRM Integration

The system fully integrates with Twenty CRM through a multi-step process:

### Implementation Status: ✅ **FULLY WORKING**

1. **People Creation**: ✅ Creates people/contacts and links them to companies
2. **Company Updates**: ✅ Updates company fields with AI-extracted data including:
   - Basic info (name, industry, employees, founded year, headquarters)
   - Social links (LinkedIn, Twitter, Facebook, Instagram)
   - Business data (overview, offerings, target market, tech stack, competitive intel, recent activity)
   - Quality signals, growth signals, industry metrics, locations
3. **Notes Addition**: ⚠️ Temporarily disabled due to Twenty API field metadata requirements
4. **Custom Fields**: ✅ Handled through company updates

### Integration Flow
1. Webhook receives company data → Queues for processing
2. Website crawling → Extracts content using Python/Scrapy
3. AI processing → Claude AI analyzes content (with fallback to mock data)
4. Twenty CRM updates → All company and people data updated

### Testing
Run the complete integration test:
```bash
node test-integration.js
```

Each sub-step is tracked and can be resumed independently if failures occur.

## Development

### File Structure
```
src/
├── controllers/          # API controllers
├── db/                  # Database setup and migrations
├── routes/              # Express routes
├── services/            # Business logic
│   ├── ai/             # Claude AI integration
│   │   ├── claudeAI.ts # AI service
│   │   └── prompt.txt  # Editable prompt (enhanced format)
│   ├── twenty/         # Twenty CRM integration
│   │   └── twentyApi.ts # Twenty API service (WORKING)
│   ├── crmApi.ts       # CRM API service for fetching company data
│   ├── crmService.ts   # CRM integration orchestrator (WORKING)
│   ├── processor.ts    # Main processing orchestrator
│   ├── queueService.ts # Queue management
│   └── websiteScraper.ts # Web scraping (Python/Scrapy)
├── types/              # TypeScript types
└── utils/              # Utilities and validation
```

### Adding New AI Providers
To add additional AI providers, extend the AI service in `src/services/ai/` while maintaining the same interface.

### Webhook Integration
The system is designed to receive webhook requests from CRM systems. Companies are automatically processed in the background every 5 seconds.

#### Webhook Flexibility
- **Optional source_url**: Webhooks can omit the `source_url` field - the system will automatically fetch it from the CRM record
- **CRM Fallback**: If CRM lookup fails, the system gracefully falls back to using the provided `website_url`
- **Smart URL Validation**: URLs are automatically validated and normalized for consistent processing