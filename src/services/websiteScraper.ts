import fetch from 'node-fetch';

export class WebsiteScraper {
    private scraperApiUrl: string;
    private scraperTimeout: number;
    private scraperThreads: number;

    constructor() {
        this.scraperApiUrl = process.env.SCRAPER_API_URL || 'https://as-scraper.afternoonltd.com';
        // Default timeout of 4 minutes (240 seconds) - convert to milliseconds
        this.scraperTimeout = parseInt(process.env.SCRAPER_TIMEOUT_SECONDS || '240') * 1000;
        // Default threads: 6 (range: 1-20)
        this.scraperThreads = parseInt(process.env.SCRAPER_THREADS || '6');
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
            console.log(`🌐 Scraping ${startUrl} via API (depth: ${maxDepth}, max pages: ${maxPages}, threads: ${this.scraperThreads}, timeout: ${this.scraperTimeout / 1000}s)`);
            
            // Set up timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                controller.abort();
            }, this.scraperTimeout);
            
            // Make scraping request to the API
            const response = await fetch(`${this.scraperApiUrl}/scrape`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    url: startUrl,
                    max_depth: maxDepth,
                    max_pages: maxPages,
                    threads: this.scraperThreads
                }),
                signal: controller.signal as any
            });
            
            clearTimeout(timeoutId);

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

        } catch (error: any) {
            let errorMessage = 'Unknown error';
            
            if (error.name === 'AbortError') {
                errorMessage = `Scraping timeout after ${this.scraperTimeout / 1000} seconds`;
            } else if (error instanceof Error) {
                errorMessage = error.message;
            }
            
            console.error('❌ Scraping failed:', errorMessage);
            
            return {
                success: false,
                content: [],
                emails: [],
                links: [],
                pagesVisited: 0,
                error: errorMessage
            };
        }
    }
}