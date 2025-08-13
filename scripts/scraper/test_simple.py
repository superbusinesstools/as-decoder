#!/usr/bin/env python3

import requests
from bs4 import BeautifulSoup

def test_scrape(url):
    try:
        response = requests.get(url, timeout=10)
        soup = BeautifulSoup(response.text, 'lxml')
        
        # Remove scripts and styles
        for element in soup(['script', 'style', 'noscript']):
            element.decompose()
        
        # Get text
        text = soup.get_text(separator='\n', strip=True)
        
        print("Status:", response.status_code)
        print("Text length:", len(text))
        print("First 500 chars:")
        print(text[:500])
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_scrape("https://example.com")