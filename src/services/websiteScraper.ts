import fetch from 'node-fetch';

export class WebsiteScraper {
    private scraperApiUrl: string;

    constructor() {
        this.scraperApiUrl = process.env.SCRAPER_API_URL || 'https://as-scraper.afternoonltd.com';
    }

    async scrapeWebsite(startUrl: string, maxDepth: number = 2, maxPages: number = 10): Promise<{
        success: boolean;
        content: string[];
        emails: string[];
        links: string[];
        pagesVisited: number;
        error?: string;
    }> {
        try {
            console.log(`🌐 Scraping ${startUrl} via API (depth: ${maxDepth}, max pages: ${maxPages})`);
            
            // Make scraping request to the API
            const response = await fetch(`${this.scraperApiUrl}/scrape`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    url: startUrl,
                    max_depth: maxDepth,
                    max_pages: maxPages
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API request failed: ${response.status} - ${errorText}`);
            }

            const result = await response.json() as any;
            
            if (!result.success) {
                throw new Error(result.error || 'Scraping failed');
            }
            
            console.log(`✅ Scraping completed for ${startUrl} (${result.pagesVisited} pages visited)`);
            return result;

        } catch (error) {
            console.error('❌ Scraping failed:', error instanceof Error ? error.message : 'Unknown error');
            
            return {
                success: false,
                content: [],
                emails: [],
                links: [],
                pagesVisited: 0,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
}