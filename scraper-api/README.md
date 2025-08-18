# Website Scraper API

A containerized REST API for web scraping using Scrapy and FastAPI.

## Overview

This is a standalone Docker container that provides web scraping functionality as a REST API. It was extracted from the main AS-Decoder project to create a reusable, scalable microservice.

## Features

- **FastAPI** - Modern Python web framework with automatic OpenAPI documentation
- **Scrapy** - Robust web scraping framework with built-in rate limiting
- **Docker** - Containerized for easy deployment and scaling  
- **Health Checks** - Built-in health monitoring
- **CORS Enabled** - Ready for browser-based clients
- **Async Processing** - Non-blocking request handling

## API Endpoints

### `POST /scrape`

Scrape a website and return structured content.

**Request Body:**
```json
{
  "url": "https://example.com",
  "max_depth": 2,
  "max_pages": 10
}
```

**Response:**
```json
{
  "success": true,
  "content": [
    "Page /\n\nContent from homepage...",
    "Page /about\n\nContent from about page..."
  ],
  "emails": ["contact@example.com"],
  "links": [],
  "pagesVisited": 2
}
```

**Parameters:**
- `url` (string, required): The website URL to scrape
- `max_depth` (integer, 1-5): How deep to crawl (default: 2)
- `max_pages` (integer, 1-50): Maximum pages to scrape (default: 10)

### `GET /health`

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "service": "scraper-api"
}
```

### `GET /docs`

Interactive API documentation (Swagger UI) - available when running.

## Quick Start

### Using Docker Compose (Recommended)

1. **Start the service:**
   ```bash
   docker-compose up --build
   ```

2. **Test the API:**
   ```bash
   curl -X POST "http://localhost:8080/scrape" \
     -H "Content-Type: application/json" \
     -d '{"url": "https://example.com", "max_depth": 1, "max_pages": 3}'
   ```

3. **View API docs:**
   Open http://localhost:8080/docs in your browser

### Using Docker Directly

1. **Build the image:**
   ```bash
   docker build -t scraper-api ./scraper-api
   ```

2. **Run the container:**
   ```bash
   docker run -p 8080:8080 scraper-api
   ```

### Local Development

1. **Install dependencies:**
   ```bash
   cd scraper-api
   pip install -r requirements.txt
   ```

2. **Run the server:**
   ```bash
   python main.py
   # or
   uvicorn main:app --reload --port 8080
   ```

## Configuration

### Environment Variables

- `PORT` - Server port (default: 8080)
- `CRAWL_MAX_DEPTH` - Default crawl depth (default: 2)
- `CRAWL_MAX_PAGES` - Default max pages (default: 10)

### Docker Compose Example

```yaml
services:
  scraper-api:
    build: ./scraper-api
    ports:
      - "8080:8080"
    environment:
      - CRAWL_MAX_DEPTH=3
      - CRAWL_MAX_PAGES=20
```

## Usage Examples

### cURL

```bash
# Basic scraping
curl -X POST "http://localhost:8080/scrape" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'

# Custom parameters
curl -X POST "http://localhost:8080/scrape" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "max_depth": 3, "max_pages": 15}'

# Health check
curl http://localhost:8080/health
```

### JavaScript/Node.js

```javascript
const response = await fetch('http://localhost:8080/scrape', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: 'https://example.com',
    max_depth: 2,
    max_pages: 10
  })
});

const result = await response.json();
console.log(`Scraped ${result.pagesVisited} pages`);
```

### Python

```python
import requests

response = requests.post('http://localhost:8080/scrape', json={
    'url': 'https://example.com',
    'max_depth': 2,
    'max_pages': 10
})

result = response.json()
print(f"Scraped {result['pagesVisited']} pages")
```

## Migration Guide

This API was designed to be extracted from the main AS-Decoder project. Here's how to complete the migration:

### Step 1: Deploy Container Separately

1. **Copy this directory to a new repository:**
   ```bash
   cp -r scraper-api/ ../scraper-api-service/
   cd ../scraper-api-service/
   git init && git add . && git commit -m "Initial commit"
   ```

2. **Deploy to your container platform:**
   - Docker Hub / Container Registry
   - AWS ECS / Fargate
   - Google Cloud Run
   - Kubernetes cluster

### Step 2: Update Main Application

1. **Set the API URL in your main app:**
   ```bash
   # In your main application's environment
   export SCRAPER_API_URL=https://your-scraper-api.com
   ```

2. **Remove Python dependencies:**
   - Delete `scripts/scraper/` directory
   - Remove Python virtual environment
   - Update CI/CD to not install Python dependencies

3. **Test the integration:**
   ```bash
   # Your main app will now use the API automatically
   npm test
   ```

### Step 3: Clean Up

1. **Remove subprocess fallback (optional):**
   - Edit `src/services/websiteScraper.ts`
   - Remove `scrapeViaSubprocess` method
   - Remove imports for `spawn` and `path`

2. **Update documentation:**
   - Update main project README
   - Document the API dependency

## Technical Details

### Architecture

```
┌─────────────────┐    HTTP POST     ┌─────────────────┐
│   Client App    │ ──────────────→  │  FastAPI App    │
│                 │                  │                 │
└─────────────────┘    JSON Response └─────────────────┘
                                             │
                                             ├─ Scrapy Spider
                                             ├─ BeautifulSoup
                                             └─ Content Pipeline
```

### Performance

- **Concurrency**: Async FastAPI handles multiple requests
- **Rate Limiting**: Scrapy built-in delays (1s between requests)
- **Timeouts**: 5-minute max per scraping job
- **Memory**: ~100MB base container size

### Security

- **Non-root user**: Container runs as non-privileged user
- **Input validation**: Pydantic models validate all inputs
- **Resource limits**: Max depth/pages prevent abuse
- **No shell access**: Pure Python execution

## Troubleshooting

### Common Issues

1. **"Connection refused" error:**
   - Check if container is running: `docker ps`
   - Verify port mapping: `docker-compose ps`

2. **Scraping timeout:**
   - Large sites may take >5 minutes
   - Reduce `max_pages` or `max_depth`
   - Check site's robots.txt

3. **Memory issues:**
   - Set Docker memory limits
   - Reduce concurrent requests

### Logs

```bash
# View container logs
docker-compose logs scraper-api

# Follow logs in real-time
docker-compose logs -f scraper-api
```

### Health Monitoring

The `/health` endpoint can be used for:
- Load balancer health checks
- Kubernetes liveness probes
- Monitoring systems

## Development

### Project Structure

```
scraper-api/
├── main.py              # FastAPI application
├── requirements.txt     # Python dependencies  
├── Dockerfile          # Container definition
├── scraper/            # Scrapy project
│   ├── items.py        # Data models
│   ├── pipelines.py    # Data processing
│   ├── settings.py     # Scrapy configuration
│   └── spiders/
│       └── website_spider.py  # Main spider
└── scrapy.cfg         # Scrapy project config
```

### Adding Features

1. **Custom extractors**: Modify `website_spider.py`
2. **New endpoints**: Add routes to `main.py`
3. **Data processing**: Update `pipelines.py`
4. **Configuration**: Add environment variables

### Testing

```bash
# Run basic test
python -c "
import requests
r = requests.post('http://localhost:8080/scrape', 
                 json={'url': 'https://httpbin.org/html'})
print(r.json())
"
```

## License

This project is part of the AS-Decoder system. See main project for licensing terms.

## Support

For issues and questions:
1. Check container logs for errors
2. Verify network connectivity
3. Test with simple URLs first (e.g., httpbin.org)
4. Review Scrapy documentation for advanced features