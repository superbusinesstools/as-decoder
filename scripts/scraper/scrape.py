#!/usr/bin/env python3

import argparse
import sys
import subprocess
import json
import os
from pathlib import Path

def main():
    parser = argparse.ArgumentParser(description='Scrape a website using Scrapy')
    parser.add_argument('url', help='URL to scrape')
    parser.add_argument('--depth', type=int, default=int(os.getenv('CRAWL_MAX_DEPTH', '2')), help='Maximum crawl depth (default: from CRAWL_MAX_DEPTH env or 2)')
    parser.add_argument('--max-pages', type=int, default=int(os.getenv('CRAWL_MAX_PAGES', '10')), help='Maximum pages to crawl (default: from CRAWL_MAX_PAGES env or 10)')
    parser.add_argument('--output', help='Output file for results (default: stdout)')
    parser.add_argument('--verbose', '-v', action='store_true', help='Verbose output')
    
    args = parser.parse_args()
    
    # Get the directory where this script is located
    script_dir = Path(__file__).parent
    
    # Change to the scraper directory
    os.chdir(script_dir)
    
    # Build the scrapy command
    cmd = [
        'scrapy', 'crawl', 'website',
        '-a', f'url={args.url}',
        '-a', f'max_depth={args.depth}',
        '-a', f'max_pages={args.max_pages}',
        '-s', 'LOG_LEVEL=ERROR'  # Suppress scrapy logs by default
    ]
    
    if args.verbose:
        cmd[-2] = '-s'
        cmd[-1] = 'LOG_LEVEL=INFO'
    
    try:
        # Run scrapy command and capture output
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300  # 5 minute timeout
        )
        
        if result.returncode != 0:
            error_msg = {
                'success': False,
                'error': f'Scrapy command failed: {result.stderr}',
                'content': [],
                'emails': [],
                'links': [],
                'pagesVisited': 0
            }
            output = json.dumps(error_msg, indent=2)
        else:
            # The spider's pipeline outputs JSON to stdout
            output = result.stdout.strip()
            
            # Validate that we got valid JSON
            try:
                json.loads(output)
            except json.JSONDecodeError:
                # If not valid JSON, create error response
                error_msg = {
                    'success': False,
                    'error': 'Invalid JSON output from scraper',
                    'content': [],
                    'emails': [],
                    'links': [],
                    'pagesVisited': 0
                }
                output = json.dumps(error_msg, indent=2)
        
        # Output results
        if args.output:
            with open(args.output, 'w') as f:
                f.write(output)
            print(f"Results saved to {args.output}")
        else:
            print(output)
            
    except subprocess.TimeoutExpired:
        error_msg = {
            'success': False,
            'error': 'Scraping timeout after 5 minutes',
            'content': [],
            'emails': [],
            'links': [],
            'pagesVisited': 0
        }
        output = json.dumps(error_msg, indent=2)
        
        if args.output:
            with open(args.output, 'w') as f:
                f.write(output)
        else:
            print(output)
            
        return 1
        
    except Exception as e:
        error_msg = {
            'success': False,
            'error': f'Unexpected error: {str(e)}',
            'content': [],
            'emails': [],
            'links': [],
            'pagesVisited': 0
        }
        output = json.dumps(error_msg, indent=2)
        
        if args.output:
            with open(args.output, 'w') as f:
                f.write(output)
        else:
            print(output)
            
        return 1
    
    return 0

if __name__ == '__main__':
    sys.exit(main())