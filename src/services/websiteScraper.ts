import { spawn } from 'child_process';
import path from 'path';
import fetch from 'node-fetch';

export class WebsiteScraper {
    private scraperApiUrl: string;

    constructor(_options: { maxDepth?: number } = {}) {
        // maxDepth is now handled in scrapeWebsite method
        this.scraperApiUrl = process.env.SCRAPER_API_URL || 'http://localhost:8080';
    }

    async scrapeWebsite(startUrl: string, maxDepth: number = 2, maxPages: number = 10): Promise<{
        success: boolean;
        content: string[];
        emails: string[];
        links: string[];
        pagesVisited: number;
        error?: string;
    }> {
        // Try API first, fallback to subprocess if API is not available
        try {
            const apiResult = await this.scrapeViaAPI(startUrl, maxDepth, maxPages);
            if (apiResult) {
                return apiResult;
            }
        } catch (error) {
            console.warn('⚠️ Scraper API not available, falling back to subprocess:', error instanceof Error ? error.message : 'Unknown error');
        }

        // Fallback to subprocess method
        return this.scrapeViaSubprocess(startUrl, maxDepth, maxPages);
    }

    private async scrapeViaAPI(startUrl: string, maxDepth: number, maxPages: number): Promise<{
        success: boolean;
        content: string[];
        emails: string[];
        links: string[];
        pagesVisited: number;
        error?: string;
    } | null> {
        try {
            // Check if API is healthy
            const healthResponse = await fetch(`${this.scraperApiUrl}/health`, {
                method: 'GET',
                timeout: 5000
            });
            
            if (!healthResponse.ok) {
                throw new Error(`Health check failed: ${healthResponse.status}`);
            }

            // Make scraping request
            const response = await fetch(`${this.scraperApiUrl}/scrape`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    url: startUrl,
                    max_depth: maxDepth,
                    max_pages: maxPages
                }),
                timeout: 300000  // 5 minute timeout
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API request failed: ${response.status} - ${errorText}`);
            }

            const result = await response.json();
            console.log(`✅ Scraping via API completed for ${startUrl} (${result.pagesVisited} pages)`);
            return result;

        } catch (error) {
            console.error('❌ API scraping failed:', error instanceof Error ? error.message : 'Unknown error');
            return null;
        }
    }

    private async scrapeViaSubprocess(startUrl: string, maxDepth: number, maxPages: number): Promise<{
        success: boolean;
        content: string[];
        emails: string[];
        links: string[];
        pagesVisited: number;
        error?: string;
    }> {
        return new Promise((resolve) => {
            const scraperPath = path.join(__dirname, '../../scripts/scraper/scrape.py');
            
            // Spawn the Python scraper process using the virtual environment
            const venvPython = path.join(__dirname, '../../scripts/scraper/venv/bin/python');
            const pythonProcess = spawn(venvPython, [
                scraperPath,
                startUrl,
                '--depth', maxDepth.toString(),
                '--max-pages', maxPages.toString()
            ], {
                cwd: path.join(__dirname, '../../scripts/scraper'),
                timeout: 120000  // 2 minute timeout for production
            });

            let output = '';
            let errorOutput = '';

            // Collect output
            pythonProcess.stdout.on('data', (data) => {
                output += data.toString();
            });

            pythonProcess.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            // Handle process completion
            pythonProcess.on('close', (code) => {
                try {
                    if (code === 0 && output.trim()) {
                        // Parse JSON output from Python scraper
                        const result = JSON.parse(output.trim());
                        resolve(result);
                    } else {
                        resolve({
                            success: false,
                            error: `Python scraper failed with code ${code}: ${errorOutput}`,
                            content: [],
                            emails: [],
                            links: [],
                            pagesVisited: 0
                        });
                    }
                } catch (parseError) {
                    resolve({
                        success: false,
                        error: `Failed to parse scraper output: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
                        content: [],
                        emails: [],
                        links: [],
                        pagesVisited: 0
                    });
                }
            });

            // Handle process errors
            pythonProcess.on('error', (error) => {
                resolve({
                    success: false,
                    error: `Failed to start Python scraper: ${error.message}`,
                    content: [],
                    emails: [],
                    links: [],
                    pagesVisited: 0
                });
            });
        });
    }
}