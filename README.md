# AS-Decoder Web Crawler Queue System

A resumable queue management system for web crawling operations with Claude AI integration and CRM automation.

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
pnpm install
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
CRAWL_MAX_DEPTH=3      # How many "clicks" deep to follow links (1=homepage only, 2=homepage+linked pages, 3=deeper)
CRAWL_MAX_PAGES=20     # Maximum total pages to scrape (prevents crawling huge sites)

# Twenty CRM API Configuration
TWENTY_API_URL=https://20.afternoonltd.com
TWENTY_API_KEY=your_twenty_api_key_here
```

### AI Prompt Customization
Edit the AI analysis prompt in `src/services/ai/prompt.txt` to customize how Claude analyzes company websites. Changes take effect immediately without restarting the application.

## Running the Application

### Development
```bash
pnpm dev
```

### Production
```bash
pnpm build
pnpm start           # Start with pm2 (includes auto-watch)
```

### Development with Auto-Restart
```bash
# Option 1: PM2 with watch mode (recommended for production-like environment)
pnpm build
pnpm start            # Automatically watches dist/ folder for changes

# Option 2: Direct development mode
pnpm dev              # Uses ts-node for immediate TypeScript execution

# When using PM2 watch mode, rebuild to trigger restart:
pnpm build            # PM2 will automatically restart when dist/ changes
```

### Deployment
```bash
# Auto-deploy: pull changes, build, and restart pm2
pnpm deploy

# Manual deployment steps:
git pull origin master
pnpm install
pnpm build
pnpm run pm2:restart
```

### PM2 Management
```bash
pnpm run pm2:start      # Start with ecosystem config (auto-watch enabled)
pnpm run pm2:start-watch # Start with explicit watch mode
pnpm run pm2:restart    # Restart the process
pnpm run pm2:reload     # Graceful reload (zero-downtime)
pnpm run pm2:stop       # Stop the process
pnpm run pm2:logs       # View logs
```

### Testing
```bash
pnpm test
```

### Utility Scripts
```bash
pnpm run reset          # Reset database
pnpm run seed           # Seed test data
pnpm run scrape         # Test scraping functionality
```

#### Testing Scraping with Different Settings
```bash
# Use environment defaults (depth=3, pages=20)
pnpm scrape https://example.com

# Override depth and pages
pnpm scrape https://example.com --depth 2 --max-pages 10

# Verbose output for debugging
pnpm scrape https://example.com --verbose
```

## API Endpoints

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

### GET /api/queue/:company_id
Get company status and process logs.

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

### GET /health
Health check endpoint.

## Processing Workflow

The system processes companies through 4 resumable steps:

1. **Receive Company Data**: Company details are queued via API endpoint
2. **Website Crawling**: Extract content using Puppeteer and Scrapy (skipped if raw_data exists)
3. **AI Processing**: Analyze content with Claude AI (skipped if processed_data exists)
4. **CRM Integration**: Send structured data to CRM with sub-step tracking

### Resumable Processing
- If any step fails, the system can resume from that exact step
- No repeated work - expensive operations like crawling and AI analysis won't be re-run
- Sub-step tracking for CRM integration allows partial completion recovery

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