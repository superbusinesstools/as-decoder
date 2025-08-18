import json
import re
import time
import unicodedata
from itemadapter import ItemAdapter

class ScrapedDataPipeline:
    def __init__(self):
        self.items = []
        self.all_emails = set()
        self.seen_urls = set()  # Track seen URLs to avoid duplicates
        self.start_time = time.time()

    def process_item(self, item, spider):
        adapter = ItemAdapter(item)
        
        # Check for duplicate URLs
        url = adapter.get('url', '')
        if url in self.seen_urls:
            spider.logger.debug(f"Skipping duplicate URL: {url}")
            return item
        self.seen_urls.add(url)
        
        # Clean and process the content
        content = adapter.get('content', '')
        if content:
            # Preserve line breaks and structure
            content = self.clean_text(content)
            content = self.handle_unicode(content)
            adapter['content'] = content
        
        # Extract emails from content
        emails = self.extract_emails(content)
        adapter['emails'] = emails
        self.all_emails.update(emails)
        
        self.items.append(dict(adapter))
        return item

    def close_spider(self, spider):
        # Calculate total time
        total_time = time.time() - self.start_time
        
        # Format content as an array of page contents
        content_array = self.format_content_array()
        
        # Log timing summary
        spider.logger.info(f"Scraping completed: {len(self.items)} pages in {total_time:.2f}s")
        
        result = {
            'success': True,
            'content': content_array,
            'emails': list(self.all_emails),
            'links': [],  # We don't track links separately in this implementation
            'pagesVisited': len(self.items)
        }
        
        # Output JSON to stdout for Node.js to capture
        print(json.dumps(result, indent=2))

    def clean_text(self, text):
        """Clean text while preserving structure for contact information"""
        if not text:
            return ''
        
        # Preserve line breaks and structure
        lines = text.split('\n')
        cleaned_lines = []
        
        for line in lines:
            # Clean each line but preserve important formatting
            cleaned_line = re.sub(r'\s+', ' ', line.strip())
            if cleaned_line:
                cleaned_lines.append(cleaned_line)
        
        # Join with line breaks, limiting consecutive empty lines
        result = '\n'.join(cleaned_lines)
        result = re.sub(r'\n{3,}', '\n\n', result)
        
        return result.strip()
    
    def handle_unicode(self, text):
        """Convert Unicode characters to ASCII equivalents where possible"""
        if not text:
            return ''
        
        # Common replacements
        replacements = {
            '\u2022': '*',  # Bullet point
            '\u2019': "'",  # Right single quotation mark
            '\u2018': "'",  # Left single quotation mark 
            '\u201c': '"',  # Left double quotation mark
            '\u201d': '"',  # Right double quotation mark
            '\u2013': '-',  # En dash
            '\u2014': '--', # Em dash
            '\u2026': '...', # Ellipsis
            '\u00a0': ' ',  # Non-breaking space
            '\u2192': '->',  # Right arrow
            '\u2190': '<-',  # Left arrow
        }
        
        for unicode_char, ascii_char in replacements.items():
            text = text.replace(unicode_char, ascii_char)
        
        # For remaining non-ASCII characters, try to get ASCII equivalent
        # This handles accented characters like é -> e
        text = unicodedata.normalize('NFKD', text)
        text = ''.join([c for c in text if ord(c) < 128 or c in '\n\r\t'])
        
        return text

    def extract_emails(self, text):
        """Extract email addresses from text"""
        if not text:
            return []
        
        # Comprehensive email regex
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        emails = re.findall(email_pattern, text)
        
        # Also look for emails in "Email:" or "Email Address:" contexts
        email_context_pattern = r'(?:email\s*(?:address)?:?\s*)([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,})'
        context_emails = re.findall(email_context_pattern, text, re.IGNORECASE)
        
        emails.extend(context_emails)
        return list(set(emails))  # Remove duplicates

    def format_content_array(self):
        """Format scraped content as an array"""
        if not self.items:
            return []
        
        # Sort by depth (home page first) and then by path
        sorted_items = sorted(self.items, key=lambda x: (x.get('depth', 0), x.get('path', '')))
        
        formatted_pages = []
        for item in sorted_items:
            path = item.get('path', '/')
            content = item.get('content', '')
            if content.strip():
                # Format each page as a string with path header
                formatted_pages.append(f"Page {path}\n\n{content}")
        
        return formatted_pages