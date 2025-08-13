import json
import re
from itemadapter import ItemAdapter

class ScrapedDataPipeline:
    def __init__(self):
        self.items = []
        self.all_emails = set()

    def process_item(self, item, spider):
        adapter = ItemAdapter(item)
        
        # Clean and process the content
        content = adapter.get('content', '')
        if content:
            # Preserve line breaks and structure
            content = self.clean_text(content)
            adapter['content'] = content
        
        # Extract emails from content
        emails = self.extract_emails(content)
        adapter['emails'] = emails
        self.all_emails.update(emails)
        
        self.items.append(dict(adapter))
        return item

    def close_spider(self, spider):
        # Format output similar to original scraper
        formatted_content = self.format_scraped_content()
        
        result = {
            'success': True,
            'content': formatted_content,
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

    def format_scraped_content(self):
        """Format scraped content similar to original scraper"""
        if not self.items:
            return ''
        
        # Sort by depth (home page first) and then by path
        sorted_items = sorted(self.items, key=lambda x: (x.get('depth', 0), x.get('path', '')))
        
        formatted_pages = []
        for item in sorted_items:
            path = item.get('path', '/')
            content = item.get('content', '')
            if content.strip():
                formatted_pages.append(f"Page {path}\n\n{content}")
        
        return '\n\n---\n\n'.join(formatted_pages)