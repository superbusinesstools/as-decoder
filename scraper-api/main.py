#!/usr/bin/env python3

import os
import sys
import json
import asyncio
import subprocess
from pathlib import Path
from typing import Optional, List

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl, Field

app = FastAPI(
    title="Website Scraper API",
    description="A REST API for web scraping using Scrapy",
    version="1.0.0"
)

# Enable CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ScrapeRequest(BaseModel):
    url: str = Field(..., description="The URL to scrape")
    max_depth: int = Field(default=2, ge=1, le=5, description="Maximum crawl depth (1-5)")
    max_pages: int = Field(default=10, ge=1, le=50, description="Maximum pages to crawl (1-50)")

class ScrapeResponse(BaseModel):
    success: bool
    content: List[str]
    emails: List[str]
    links: List[str]
    pagesVisited: int
    error: Optional[str] = None

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "scraper-api"}

@app.post("/scrape", response_model=ScrapeResponse)
async def scrape_website(request: ScrapeRequest):
    """
    Scrape a website and return structured content
    
    - **url**: The website URL to scrape
    - **max_depth**: How deep to crawl (default: 2)
    - **max_pages**: Maximum number of pages to scrape (default: 10)
    """
    try:
        # Validate URL format
        if not request.url.startswith(('http://', 'https://')):
            request.url = f'https://{request.url}'
        
        # Get the directory where this script is located
        script_dir = Path(__file__).parent
        
        # Build the scrapy command
        cmd = [
            sys.executable, '-m', 'scrapy', 'crawl', 'website',
            '-a', f'url={request.url}',
            '-a', f'max_depth={request.max_depth}',
            '-a', f'max_pages={request.max_pages}',
            '-s', 'LOG_LEVEL=ERROR'  # Suppress scrapy logs
        ]
        
        # Run scrapy command and capture output
        process = await asyncio.create_subprocess_exec(
            *cmd,
            cwd=script_dir,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        try:
            stdout, stderr = await asyncio.wait_for(
                process.communicate(), 
                timeout=300  # 5 minute timeout
            )
        except asyncio.TimeoutError:
            process.kill()
            await process.wait()
            raise HTTPException(
                status_code=408,
                detail="Scraping timeout after 5 minutes"
            )
        
        if process.returncode != 0:
            error_msg = stderr.decode('utf-8') if stderr else "Unknown error"
            raise HTTPException(
                status_code=500,
                detail=f"Scrapy command failed: {error_msg}"
            )
        
        # Parse JSON output from the spider's pipeline
        output = stdout.decode('utf-8').strip()
        
        if not output:
            raise HTTPException(
                status_code=500,
                detail="No output received from scraper"
            )
        
        try:
            result = json.loads(output)
            return ScrapeResponse(**result)
        except json.JSONDecodeError as e:
            raise HTTPException(
                status_code=500,
                detail=f"Invalid JSON output from scraper: {str(e)}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error: {str(e)}"
        )

@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "Website Scraper API",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "scrape": "/scrape",
            "docs": "/docs"
        }
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)