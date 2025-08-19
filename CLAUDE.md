# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AS-Decoder is a resumable queue management system that processes companies through a 4-step pipeline:
1. **Webhook Reception** → Company queued via `/api/queue` endpoint
2. **Website Crawling** → Scraper API extracts content (resumable)
3. **AI Processing** → Claude AI analyzes content for structured data extraction (resumable)
4. **Twenty CRM Update** → Updates company records and creates linked people (resumable)

## Essential Commands

```bash
# Development
npm run dev              # Run TypeScript directly with ts-node
npm run build            # Compile TypeScript and copy prompt.txt to dist
npm test                 # Run all tests
npm test -- --watch     # Run tests in watch mode
npm test -- path/to/test.test.ts  # Run specific test file

# Production Deployment
npm run deploy           # One-command deployment (pull, install, build, restart)
npm run pm2:start        # Start with PM2
npm run pm2:restart      # Restart server process
npm run pm2:logs         # View server logs

# Monitoring & Management
npm run status           # Check processing status and failed jobs
npm run restart-jobs     # Restart all failed jobs
npm run restart-jobs COMPANY_ID  # Restart specific failed job

# Database & Testing
npm run reset            # Reset database (WARNING: deletes all data)
npm run seed             # Seed test data

# Lint and Type Checking
npx tsc --noEmit        # TypeScript type checking
```

## Architecture & Processing Flow

### Core Services Architecture

```
src/services/
├── processor.ts         # Main orchestrator - manages 4-step workflow
├── queueService.ts      # Queue management, status tracking, restart logic
├── websiteScraper.ts    # Scraper API client
├── ai/
│   ├── claudeAI.ts     # Claude AI integration with mock fallback
│   └── prompt.txt      # Editable AI prompt (copied to dist on build)
├── twenty/
│   └── twentyApi.ts    # Twenty CRM API client
├── crmService.ts       # CRM update orchestrator
└── crmApi.ts           # CRM data fetching service
```

### Database Schema

**companies table**: Stores company state and progress
- `company_id` (unique) - External company identifier
- `status` - pending/processing/completed/failed
- `current_step` - pending/crawling/ai_processing/crm_sending/completed
- `raw_data` - Scraped website content (allows crawling skip on restart)
- `processed_data` - AI analysis results (allows AI skip on restart)

**process_logs table**: Detailed step tracking for debugging
- Links to company via `company_id`
- Records each step's start/completion/failure

### Resumable Processing Design

The system intelligently resumes from the last successful step:
- **Crawling failed** → Restarts from beginning
- **AI processing failed** → Skips crawling, restarts AI (raw_data preserved)
- **CRM sending failed** → Skips crawling & AI, restarts CRM (all data preserved)

Implementation in `queueService.ts:restartCompany()`:
```typescript
// Determine restart point based on existing data
if (company.raw_data) newStep = 'ai_processing';
if (company.processed_data) newStep = 'crm_sending';
```

### Scraper API Integration

The system uses a dedicated scraper API service for web scraping:
- API Endpoint: `https://as-scraper.afternoonltd.com`
- Supports configurable depth and page limits
- Returns structured content, emails, and links
- Handles multi-threaded crawling with 6 concurrent threads

### Twenty CRM Integration Status

**Working Components** ✅:
- Company field updates (all custom fields)
- People creation with company linking
- Social link mapping (linkedinLink, xLink, etc.)
- Error recovery and partial success handling

**Known Issues** ⚠️:
- Notes creation disabled (API field metadata issue)
- Field name: Must use `linkedinLink` not `linkedIn` for people

## Critical Implementation Details

### Environment Variables
```bash
# Required for production
TWENTY_API_URL=https://20.afternoonltd.com
TWENTY_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here  # Optional - has mock fallback

# Crawling limits
CRAWL_MAX_DEPTH=3   # Link following depth
CRAWL_MAX_PAGES=20  # Total page limit

# Scraper API
SCRAPER_API_URL=https://as-scraper.afternoonltd.com
```

### Build Process Requirements
The build script must copy `prompt.txt` to dist:
```json
"build": "tsc && cp src/services/ai/prompt.txt dist/services/ai/"
```

### API Encoding Fix
CRM API requires sanitized headers to prevent encoding errors:
```typescript
const authHeader = `Bearer ${apiKey}`.replace(/[\x00-\x1F\x7F-\xFF]/g, '');
```

### Queue Processing
- Processes every 5 seconds via `setInterval`
- Single-threaded to prevent race conditions
- PM2 manages process lifecycle with auto-restart

### Error Handling Patterns
- Each step logs to `process_logs` table
- Failed steps update company status to 'failed'
- Restart mechanism checks existing data to skip completed work
- Mock AI fallback when Claude API unavailable

## Testing Strategy

### Integration Testing
```bash
node test-integration.js  # Full pipeline test
```
Tests: Server health → Twenty API auth → Webhook → Processing → CRM verification

### Unit Testing
- Database operations: `tests/db.test.ts`
- Queue management: `tests/queueService.test.ts`
- API endpoints: `tests/api.test.ts`

## Deployment Checklist

1. **Pre-deployment**: Ensure `.env` has required API keys
2. **Deploy**: Run `npm run deploy` (handles everything)
3. **Verify**: Check `npm run status` for failed jobs
4. **Monitor**: Use `npm run pm2:logs` for real-time logs
5. **Recovery**: Use `npm run restart-jobs` for failed jobs

## Common Troubleshooting

### "prompt.txt not found" Error
Run `npm run build` - the build script copies prompt.txt to dist

### "Scraper API Connection" Error
Ensure the SCRAPER_API_URL is set correctly in `.env`:
```bash
SCRAPER_API_URL=https://as-scraper.afternoonltd.com
```

### CRM API "ByteString" Error
API key has invalid characters. Fix applied in `crmApi.ts` sanitizes headers.

### Jobs Stuck in Processing
1. Check logs: `npm run pm2:logs`
2. Mark failed and restart: `npm run restart-jobs`

---
*Last Updated: August 18, 2025*
*Integration Status: 95% Complete (Notes API pending)*
- Always bump the version in package.json when committing