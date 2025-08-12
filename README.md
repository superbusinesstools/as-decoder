# AS-Decoder Web Crawler Queue System

A queue management system for web crawling operations with SQLite database and comprehensive logging.

## Features

- Queue endpoint to receive company details for crawling
- SQLite database for persistent storage
- Process logging for tracking 4-step workflow:
  1. Receive company details
  2. Crawl website
  3. Process with AI
  4. Send to CRM
- Input validation with Joi
- Comprehensive test coverage

## Installation

```bash
pnpm install
```

## Running the Application

### Development
```bash
pnpm dev
```

### Production
```bash
pnpm build
pnpm start
```

### Testing
```bash
pnpm test
```

## API Endpoints

### POST /api/queue
Queue a company for processing.

**Request Body:**
```json
{
  "company_id": "unique-company-id",
  "website_url": "https://example.com",
  "source_url": "https://source.example.com"
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
      "status": "pending",
      "created_at": "2024-01-01T12:00:00.000Z",
      "updated_at": "2024-01-01T12:00:00.000Z"
    },
    "logs": [
      {
        "id": 1,
        "company_id": "unique-company-id",
        "step": "received",
        "status": "completed",
        "message": "Company queued successfully",
        "created_at": "2024-01-01T12:00:00.000Z"
      }
    ]
  }
}
```

### GET /health
Health check endpoint.

## Database Schema

### Companies Table
- `id` - Primary key
- `company_id` - Unique company identifier
- `website_url` - Company website URL
- `source_url` - Source URL for crawling
- `status` - Current status (pending/processing/completed/failed)
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