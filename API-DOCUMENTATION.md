# AS-Scraper API Documentation

## Overview
AS-Scraper is a high-performance web scraping API that extracts text content, emails, and links from websites. It supports multi-threaded crawling with configurable depth and page limits.

**Base URL:** `https://as-scraper.afternoonltd.com`

## Endpoints

### 1. Health Check
Verify the service is running and healthy.

**Endpoint:** `GET /health`

**Response:**
```json
{
  "status": "healthy",
  "service": "scraper-api"
}
```

### 2. Scrape Website
Extract content from a website with configurable crawling parameters.

**Endpoint:** `POST /scrape`

**Headers:**
- `Content-Type: application/json`

**Request Body:**
```json
{
  "url": "string",        // Required: The URL to scrape
  "max_depth": integer,   // Optional: Maximum crawl depth (default: 3, max: 10)
  "max_pages": integer,   // Optional: Maximum pages to crawl (default: 250, max: 1000)
  "threads": integer      // Optional: Number of concurrent threads (default: 6, max: 20)
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

## Usage Examples

### Basic Usage (with defaults)
```bash
curl -X POST https://as-scraper.afternoonltd.com/scrape \
  -H "Content-Type: application/json" \
  -d '{"url": "example.com"}'
```

### Custom Depth and Page Limit
```bash
curl -X POST https://as-scraper.afternoonltd.com/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "url": "example.com",
    "max_depth": 2,
    "max_pages": 50
  }'
```

### Custom Thread Count
```bash
curl -X POST https://as-scraper.afternoonltd.com/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "url": "example.com",
    "max_depth": 2,
    "max_pages": 100,
    "threads": 10
  }'
```

### Python Example
```python
import requests
import json

url = "https://as-scraper.afternoonltd.com/scrape"
payload = {
    "url": "example.com",
    "max_depth": 2,
    "max_pages": 100,
    "threads": 8  # Optional: adjust concurrent threads
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
    const response = await axios.post('https://as-scraper.afternoonltd.com/scrape', {
      url: targetUrl,
      max_depth: 2,
      max_pages: 100,
      threads: 8  // Optional: adjust concurrent threads
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
$url = 'https://as-scraper.afternoonltd.com/scrape';
$data = array(
    'url' => 'example.com',
    'max_depth' => 2,
    'max_pages' => 100,
    'threads' => 8  // Optional: adjust concurrent threads
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

## Performance Characteristics

- **Concurrent Threads:** Configurable 1-20 (default: 6)
- **Request Delay:** 250ms between requests (to be respectful to target servers)
- **Typical Speed:** 
  - 1 thread: ~3-4 pages/second
  - 6 threads: ~10-20 pages/second
  - 10+ threads: ~20-40 pages/second
  (Actual speed depends on target server response time)
- **Timeout:** Individual page requests timeout after 30 seconds

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
- Timeout errors for slow websites
- Invalid parameter values

## Best Practices

1. **Start Small:** Test with lower `max_pages` values first to understand the target website structure
2. **Respect Robots.txt:** The scraper automatically respects robots.txt, but be mindful of website terms of service
3. **Monitor Usage:** Keep track of pages scraped to avoid overwhelming target servers
4. **Handle Errors:** Always check the `success` field and handle errors appropriately
5. **Cache Results:** Consider caching scraping results to avoid redundant requests

## Support

For issues, questions, or feature requests, please contact the Afternoon Ltd development team.

---

**Version:** 1.0.0  
**Last Updated:** 2024  
**Maintained by:** Afternoon Ltd Development Team