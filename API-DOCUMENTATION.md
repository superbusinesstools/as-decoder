# AS-Scraper API Documentation

## Overview
AS-Scraper is a high-performance web scraping API that extracts text content, emails, and links from websites. It supports multi-threaded crawling with configurable depth and page limits.

**Base URL:** `http://localhost:20070` (local development)
**Production URL:** `https://as-scraper.afternoonltd.com`

## Endpoints

### 1. Health Check
Verify the service is running and healthy.

**Endpoint:** `GET /health`

**Description:** Returns service status for monitoring and health checks.

**Response:**
```json
{
  "status": "healthy",
  "service": "scraper-api"
}
```

**HTTP Status Codes:**
- `200 OK` - Service is healthy
- `503 Service Unavailable` - Service is not ready

### 2. Root Information
Get API information and available endpoints.

**Endpoint:** `GET /`

**Description:** Provides basic API information and endpoint listing.

**Response:**
```json
{
  "message": "Website Scraper API",
  "version": "1.0.0",
  "endpoints": {
    "health": "/health",
    "scrape": "/scrape",
    "docs": "/docs"
  }
}
```

### 3. Scrape Website
Extract content from a website with configurable crawling parameters.

**Endpoint:** `POST /scrape`

**Description:** Main scraping endpoint that crawls websites and extracts structured content.

**Headers:**
- `Content-Type: application/json`

**Request Body:**
```json
{
  "url": "string",          // Required: The URL to scrape
  "max_depth": integer,     // Optional: Maximum crawl depth (default: 3, max: 10)
  "max_pages": integer,     // Optional: Maximum pages to crawl (default: 250, max: 1000)
  "threads": integer,       // Optional: Number of concurrent threads (default: 6, max: 20)
  "timeout_minutes": integer // Optional: Scraping timeout in minutes (default: 20, max: 60)
}
```

**Response:**
```json
{
  "success": true,
  "content": [            // Array of extracted text from each page
    "Page content 1...",
    "Page content 2..."
  ],
  "emails": [             // Array of email addresses found
    "email@example.com"
  ],
  "links": [],            // Array of links (currently not populated)
  "pagesVisited": 5,      // Number of pages actually scraped
  "error": null           // Error message if any
}
```

**HTTP Status Codes:**
- `200 OK` - Scraping completed successfully (check `success` field)
- `408 Request Timeout` - Scraping exceeded timeout limit
- `422 Unprocessable Entity` - Invalid request parameters
- `500 Internal Server Error` - Server error during scraping

**Response Fields:**
- `success` (boolean) - Whether scraping completed without errors
- `content` (array) - Text content extracted from each page
- `emails` (array) - Email addresses found across all pages
- `links` (array) - Links discovered (currently empty)
- `pagesVisited` (integer) - Actual number of pages successfully scraped
- `error` (string|null) - Error description if scraping failed

## Usage Examples

### Basic Usage (with defaults)
```bash
# Local development
curl -X POST http://localhost:20070/scrape \
  -H "Content-Type: application/json" \
  -d '{"url": "example.com"}'

# Production
curl -X POST https://as-scraper.afternoonltd.com/scrape \
  -H "Content-Type: application/json" \
  -d '{"url": "example.com"}'
```

### Custom Depth and Page Limit
```bash
curl -X POST http://localhost:20070/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "url": "example.com",
    "max_depth": 2,
    "max_pages": 50
  }'
```

### Custom Thread Count and Timeout
```bash
curl -X POST http://localhost:20070/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "url": "example.com",
    "max_depth": 2,
    "max_pages": 100,
    "threads": 10,
    "timeout_minutes": 30
  }'
```

### Python Example
```python
import requests
import json

url = "http://localhost:20070/scrape"  # Use production URL in production
payload = {
    "url": "example.com",
    "max_depth": 2,
    "max_pages": 100,
    "threads": 8,  # Optional: adjust concurrent threads
    "timeout_minutes": 30  # Optional: custom timeout
}
headers = {"Content-Type": "application/json"}

response = requests.post(url, json=payload, headers=headers)
data = response.json()

if data["success"]:
    print(f"Scraped {data['pagesVisited']} pages")
    print(f"Found {len(data['emails'])} emails")
    for content in data["content"]:
        print(content[:200] + "...")  # Print first 200 chars
else:
    print(f"Error: {data['error']}")
```

### JavaScript/Node.js Example
```javascript
const axios = require('axios');

async function scrapeWebsite(targetUrl) {
  try {
    const response = await axios.post('http://localhost:20070/scrape', {
      url: targetUrl,
      max_depth: 2,
      max_pages: 100,
      threads: 8,  // Optional: adjust concurrent threads
      timeout_minutes: 30  // Optional: custom timeout
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = response.data;
    console.log(`Scraped ${data.pagesVisited} pages`);
    console.log(`Found ${data.emails.length} emails`);
    
    return data;
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Usage
scrapeWebsite('example.com');
```

### PHP Example
```php
<?php
$url = 'http://localhost:20070/scrape';  // Use production URL in production
$data = array(
    'url' => 'example.com',
    'max_depth' => 2,
    'max_pages' => 100,
    'threads' => 8,  // Optional: adjust concurrent threads
    'timeout_minutes' => 30  // Optional: custom timeout
);

$options = array(
    'http' => array(
        'header'  => "Content-type: application/json\r\n",
        'method'  => 'POST',
        'content' => json_encode($data)
    )
);

$context  = stream_context_create($options);
$result = file_get_contents($url, false, $context);
$response = json_decode($result, true);

if ($response['success']) {
    echo "Scraped " . $response['pagesVisited'] . " pages\n";
    echo "Found " . count($response['emails']) . " emails\n";
} else {
    echo "Error: " . $response['error'] . "\n";
}
?>
```

## Parameters Explained

### url
- **Type:** String
- **Required:** Yes
- **Description:** The website URL to scrape. The protocol (https://) is optional and will be added automatically if missing.
- **Examples:** `"example.com"`, `"https://example.com"`, `"example.com/blog"`

### max_depth
- **Type:** Integer
- **Required:** No
- **Default:** 3
- **Range:** 1-10
- **Description:** Controls how many levels deep the crawler will follow links:
  - `1` = Only scrape the provided URL
  - `2` = Scrape the URL and any pages linked from it
  - `3` = Scrape the URL, linked pages, and pages linked from those pages
  - And so on...

### max_pages
- **Type:** Integer
- **Required:** No
- **Default:** 250
- **Range:** 1-1000
- **Description:** Maximum number of pages to scrape. The crawler will stop after reaching this limit, even if there are more pages to discover within the depth limit.

### threads
- **Type:** Integer
- **Required:** No
- **Default:** 6
- **Range:** 1-20
- **Description:** Number of concurrent threads for parallel scraping. Higher values speed up scraping but increase server load:
  - `1-3` = Conservative (slower, very polite)
  - `4-8` = Balanced (good speed, respectful)
  - `9-15` = Aggressive (fast, higher server load)
  - `16-20` = Maximum (fastest, use with caution)

### timeout_minutes
- **Type:** Integer
- **Required:** No
- **Default:** 20 (configurable via `SCRAPE_TIMEOUT_MINUTES` environment variable)
- **Range:** 1-60
- **Description:** Maximum time in minutes to wait for the entire scraping job to complete. Larger websites or higher page limits may require longer timeouts:
  - `1-5` = Quick scraping (small sites, few pages)
  - `10-20` = Standard scraping (medium sites, 50-250 pages)
  - `30-45` = Large scraping jobs (big sites, 500+ pages)
  - `60` = Maximum timeout (very large sites or slow servers)

## Performance Characteristics

- **Concurrent Threads:** Configurable 1-20 (default: 6)
- **Request Delay:** 250ms between requests (to be respectful to target servers)
- **Typical Speed:** 
  - 1 thread: ~3-4 pages/second
  - 6 threads: ~10-20 pages/second
  - 10+ threads: ~20-40 pages/second
  (Actual speed depends on target server response time)
- **Scraping Timeout:** Configurable job timeout (default: 20 minutes, max: 60 minutes)
- **Page Request Timeout:** Individual page requests timeout after 30 seconds

## Content Extraction

The scraper:
- Extracts all text content from HTML pages
- Removes HTML tags, scripts, styles, and navigation elements
- Preserves text structure with appropriate spacing
- Identifies and extracts email addresses
- Follows robots.txt rules
- Respects the same-domain policy (won't crawl external domains)

## Limitations

1. **Domain Restriction:** The scraper only follows links within the same domain as the initial URL
2. **File Types:** Ignores non-HTML files (PDFs, images, videos, etc.)
3. **JavaScript:** Does not execute JavaScript - only scrapes static HTML content
4. **Rate Limiting:** No built-in rate limiting on the API itself - please be responsible with usage
5. **Response Size:** Very large websites may take longer to process

## Error Handling

The API returns structured error responses:

```json
{
  "success": false,
  "content": [],
  "emails": [],
  "links": [],
  "pagesVisited": 0,
  "error": "Error message describing what went wrong"
}
```

Common errors:
- Invalid URL format
- Target website unreachable
- Timeout errors (job exceeded timeout_minutes limit)
- Invalid parameter values (out of allowed ranges)
- Network connectivity issues
- Target server blocking requests

## Troubleshooting

### Timeout Issues
If you're experiencing timeout errors (HTTP 408), try these solutions:

1. **Increase timeout_minutes:** For large sites, use 30-60 minutes
   ```json
   {"url": "example.com", "timeout_minutes": 45}
   ```

2. **Reduce concurrent load:** Lower the threads parameter
   ```json
   {"url": "example.com", "threads": 3, "timeout_minutes": 30}
   ```

3. **Limit scope:** Reduce max_pages or max_depth
   ```json
   {"url": "example.com", "max_pages": 100, "max_depth": 2}
   ```

4. **Test incrementally:** Start with small limits and increase gradually
   ```bash
   # Test with minimal settings first
   curl -X POST http://localhost:20070/scrape \
     -H "Content-Type: application/json" \
     -d '{"url": "example.com", "max_pages": 10, "max_depth": 1}'
   ```

### Performance Optimization
- **Fast scraping:** Use 10-15 threads for speed (be respectful to target servers)
- **Large sites:** Use lower thread count (3-6) with higher timeout (30-60 minutes)
- **Slow servers:** Reduce threads to 1-3 and increase timeout

### Local Development
For local testing, use the Docker setup:
```bash
# Start the service
pnpm run start

# Test basic functionality
pnpm run test

# View logs for debugging
pnpm run logs
```

## Best Practices

1. **Start Small:** Test with lower `max_pages` values first to understand the target website structure
2. **Set Appropriate Timeouts:** Use realistic timeouts based on expected scraping scope:
   - Small sites (1-50 pages): 5-10 minutes
   - Medium sites (50-250 pages): 10-20 minutes  
   - Large sites (250+ pages): 20-60 minutes
3. **Respect Robots.txt:** The scraper automatically respects robots.txt, but be mindful of website terms of service
4. **Monitor Usage:** Keep track of pages scraped to avoid overwhelming target servers
5. **Handle Errors:** Always check the `success` field and handle errors appropriately
6. **Cache Results:** Consider caching scraping results to avoid redundant requests
7. **Use Reasonable Thread Counts:** Higher isn't always better - respect target servers

## Support

For issues, questions, or feature requests, please contact the Afternoon Ltd development team.

---

## Interactive API Documentation

For interactive API testing and detailed schema information, visit:
- **Local:** `http://localhost:20070/docs` (FastAPI Swagger UI)
- **Production:** `https://as-scraper.afternoonltd.com/docs`

The interactive documentation provides:
- Live API testing interface
- Complete request/response schemas
- Parameter validation details
- Example requests and responses

---

**Version:** 1.0.0  
**Last Updated:** 2025  
**Maintained by:** Afternoon Ltd Development Team