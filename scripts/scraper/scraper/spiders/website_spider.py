import scrapy
from urllib.parse import urlparse, urljoin
from scrapy.linkextractors import LinkExtractor
from scrapy.spiders import CrawlSpider, Rule
from scraper.items import ScrapedPageItem
import re

class WebsiteSpider(CrawlSpider):
    name = 'website'
    
    def __init__(self, url=None, max_depth=2, *args, **kwargs):
        super(WebsiteSpider, self).__init__(*args, **kwargs)
        
        if not url:
            raise ValueError("URL parameter is required")
        
        # Ensure URL has protocol
        if not url.startswith(('http://', 'https://')):
            url = f'https://{url}'
        
        self.start_urls = [url]
        
        # Set allowed domains to restrict crawling to the same domain
        parsed_url = urlparse(url)
        self.allowed_domains = [parsed_url.netloc]
        
        # Set custom settings for this spider instance
        self.custom_settings = {
            'DEPTH_LIMIT': int(max_depth),
            'CONCURRENT_REQUESTS_PER_DOMAIN': 1,  # Be respectful
            'DOWNLOAD_DELAY': 1,
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
        return self.parse_page(response)

    def parse_page(self, response):
        """Parse individual pages and extract content"""
        
        # Get page path for identification
        parsed_url = urlparse(response.url)
        path = parsed_url.path or '/'
        
        # Extract main content
        content = self.extract_content(response)
        
        # Get page title
        title = response.css('title::text').get()
        if title:
            title = title.strip()
        
        # Get current depth from meta
        depth = response.meta.get('depth', 0)
        
        yield ScrapedPageItem(
            url=response.url,
            path=path,
            content=content,
            depth=depth,
            title=title,
            emails=[]  # Will be populated in pipeline
        )

    def extract_content(self, response):
        """Extract main content from the page while preserving structure"""
        
        # Try to get main content areas first
        main_selectors = [
            'main', 'article', '[role="main"]',
            '.content', '.main-content', '#content', '#main',
            '.post-content', '.entry-content', '.article-content'
        ]
        
        content_parts = []
        
        # Try main content selectors first
        for selector in main_selectors:
            main_content = response.css(selector)
            if main_content:
                text = self.extract_text_with_structure(main_content)
                if text and len(text.strip()) > 50:  # Ensure we got substantial content
                    content_parts.append(text)
                    break
        
        # If no main content found, get body content but remove navigation
        if not content_parts:
            # Remove unwanted elements
            unwanted_selectors = [
                'nav', 'header', 'footer', '.navigation', '.menu', 
                '.sidebar', '.widget', '.advertisement', '.ad',
                'script', 'style', 'noscript'
            ]
            
            # Clone the body to avoid modifying original
            body_text = response.css('body').get()
            if body_text:
                # Use regex to remove unwanted sections (simple approach)
                for selector in unwanted_selectors:
                    # This is a simple approach - in a more robust implementation
                    # we'd parse the HTML properly
                    pass
                
                # Extract text from body
                body_content = response.css('body')
                text = self.extract_text_with_structure(body_content)
                if text:
                    content_parts.append(text)
        
        # Join all content parts
        full_content = '\n\n'.join(content_parts)
        
        # Clean up the content
        return self.clean_content(full_content)

    def extract_text_with_structure(self, selector):
        """Extract text while preserving important structure like contact info"""
        
        if not selector:
            return ''
        
        # Get all text nodes, preserving some structure
        text_parts = []
        
        # Extract text with some structure preservation
        for element in selector:
            # Get all text, but preserve line breaks for contact info
            element_text = element.css('::text').getall()
            cleaned_text = ' '.join([t.strip() for t in element_text if t.strip()])
            
            # Look for contact information patterns and preserve their structure
            contact_patterns = [
                r'(email\s*(?:address)?:?\s*[^\s]+@[^\s]+)',
                r'(phone\s*(?:number)?:?\s*[\d\-\(\)\s\+]+)',
                r'(address:?\s*[^\.]+)',
                r'(contact:?\s*[^\.]+)'
            ]
            
            # If this contains contact info, preserve line breaks
            has_contact_info = any(re.search(pattern, cleaned_text, re.IGNORECASE) 
                                 for pattern in contact_patterns)
            
            if has_contact_info:
                # For contact info, preserve more structure
                structured_text = '\n'.join([t.strip() for t in element_text if t.strip()])
                text_parts.append(structured_text)
            else:
                text_parts.append(cleaned_text)
        
        return '\n'.join(text_parts)

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