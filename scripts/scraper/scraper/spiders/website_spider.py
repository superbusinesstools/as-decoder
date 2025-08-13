import scrapy
from urllib.parse import urlparse, urljoin
from scrapy.linkextractors import LinkExtractor
from scrapy.spiders import CrawlSpider, Rule
from scraper.items import ScrapedPageItem
import re
import time
from bs4 import BeautifulSoup

class WebsiteSpider(CrawlSpider):
    name = 'website'
    
    def __init__(self, url=None, max_depth=2, max_pages=10, *args, **kwargs):
        super(WebsiteSpider, self).__init__(*args, **kwargs)
        
        if not url:
            raise ValueError("URL parameter is required")
        
        # Ensure URL has protocol
        if not url.startswith(('http://', 'https://')):
            url = f'https://{url}'
        
        self.start_urls = [url]
        self.pages_crawled = 0
        self.max_pages = int(max_pages)
        
        # Set allowed domains to restrict crawling to the same domain
        parsed_url = urlparse(url)
        self.allowed_domains = [parsed_url.netloc]
        
        # Set custom settings for this spider instance
        self.custom_settings = {
            'DEPTH_LIMIT': int(max_depth),
            'CONCURRENT_REQUESTS_PER_DOMAIN': 1,  # Be respectful
            'DOWNLOAD_DELAY': 1,
            'CLOSESPIDER_PAGECOUNT': int(max_pages),  # Stop after max_pages
        }
        
        # Define rules for following links
        self.rules = (
            Rule(
                LinkExtractor(
                    allow_domains=self.allowed_domains,
                    deny_extensions=[
                        'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
                        'zip', 'rar', 'exe', 'dmg', 'jpg', 'jpeg', 'png', 
                        'gif', 'css', 'js', 'ico', 'svg', 'mp4', 'mp3'
                    ],
                    deny=[
                        r'.*\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar|exe|dmg)$',
                        r'.*#.*',  # Skip anchor links on same page
                        r'.*/search\?',  # Skip search result pages
                        r'.*/tag/',  # Skip tag pages
                        r'.*/category/',  # Skip category pages if not needed
                    ]
                ),
                callback='parse_page',
                follow=True
            ),
        )
        
        # Re-compile rules since we set them after __init__
        self._compile_rules()

    def parse_start_url(self, response):
        """Parse start URLs - required for CrawlSpider"""
        self.logger.info(f"Parsing start URL: {response.url}")
        return self.parse_page(response)

    def parse_page(self, response):
        """Parse individual pages and extract content"""
        
        # Record fetch time (time from request to response)
        fetch_time = response.meta.get('download_latency', 0)
        
        self.logger.info(f"parse_page called for: {response.url} (fetch took {fetch_time:.2f}s)")
        
        # Check if we've reached the page limit
        self.pages_crawled += 1
        if self.pages_crawled > self.max_pages:
            self.logger.info(f"Reached max pages limit ({self.max_pages}), stopping")
            return
        
        # Get page path for identification
        parsed_url = urlparse(response.url)
        path = parsed_url.path or '/'
        
        # Time the content extraction
        parse_start = time.time()
        content = self.extract_content(response)
        parse_time = time.time() - parse_start
        
        # Get page title
        title = response.css('title::text').get()
        if title:
            title = title.strip()
        
        # Get current depth from meta
        depth = response.meta.get('depth', 0)
        
        self.logger.info(f"Page {response.url}: fetch={fetch_time:.2f}s, parse={parse_time:.2f}s")
        
        yield ScrapedPageItem(
            url=response.url,
            path=path,
            content=content,
            depth=depth,
            title=title,
            emails=[]  # Will be populated in pipeline
        )

    def extract_content(self, response):
        """Extract main content from the page using BeautifulSoup for better HTML filtering"""
        
        # Parse the HTML with BeautifulSoup (use html.parser for better compatibility)
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Remove script, style, and other non-content elements
        for element in soup(['script', 'style', 'noscript', 'meta', 'link', 'head']):
            element.decompose()
        
        # Remove navigation, headers, footers, and ads
        for selector in ['nav', 'header', 'footer', '.navigation', '.menu', 
                        '.sidebar', '.widget', '.advertisement', '.ad', 
                        '[class*="cookie"]', '[id*="cookie"]']:
            for element in soup.select(selector):
                element.decompose()
        
        # Try to find main content area
        main_content = None
        main_selectors = [
            'main', 'article', '[role="main"]',
            '.content', '.main-content', '#content', '#main',
            '.post-content', '.entry-content', '.article-content'
        ]
        
        for selector in main_selectors:
            main_element = soup.select_one(selector)
            if main_element:
                main_content = main_element
                break
        
        # If no main content found, use body
        if not main_content:
            main_content = soup.body if soup.body else soup
        
        # Extract text with proper spacing
        text = self.extract_text_from_soup(main_content)
        
        # Clean up the content
        return self.clean_content(text)

    def extract_text_from_soup(self, element):
        """Extract text from BeautifulSoup element with proper structure preservation"""
        
        if not element:
            return ''
        
        # Get text with newlines for block elements
        text_parts = []
        
        # Process each element to preserve structure
        for elem in element.descendants:
            if elem.name in ['p', 'div', 'section', 'article', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'td', 'th']:
                # Add newline after block elements
                if elem.string:
                    text_parts.append(elem.string.strip())
                    text_parts.append('\n')
            elif elem.name == 'br':
                # Preserve line breaks
                text_parts.append('\n')
            elif elem.string and elem.parent.name not in ['script', 'style']:
                # Add inline text
                text = elem.string.strip()
                if text:
                    text_parts.append(text + ' ')
        
        # Join and clean up
        text = ''.join(text_parts)
        
        # Clean up excessive whitespace while preserving structure
        text = re.sub(r'\n{3,}', '\n\n', text)  # Limit to 2 newlines max
        text = re.sub(r' {2,}', ' ', text)  # Remove multiple spaces
        text = re.sub(r'\n ', '\n', text)  # Remove spaces at start of lines
        text = re.sub(r' \n', '\n', text)  # Remove spaces at end of lines
        
        return text.strip()

    def clean_content(self, content):
        """Clean content while preserving important formatting"""
        if not content:
            return ''
        
        # Split into lines for processing
        lines = content.split('\n')
        cleaned_lines = []
        
        for line in lines:
            # Clean whitespace but preserve structure
            cleaned_line = re.sub(r'\s+', ' ', line.strip())
            if cleaned_line and len(cleaned_line) > 2:  # Skip very short lines
                cleaned_lines.append(cleaned_line)
        
        # Join lines and limit consecutive line breaks
        result = '\n'.join(cleaned_lines)
        result = re.sub(r'\n{3,}', '\n\n', result)
        
        return result.strip()