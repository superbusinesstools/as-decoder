import { spawn } from 'child_process';
import path from 'path';

export class WebsiteScraper {
    constructor(_options: { maxDepth?: number } = {}) {
        // maxDepth is now handled in scrapeWebsite method
    }

    async scrapeWebsite(startUrl: string, maxDepth: number = 2, maxPages: number = 10): Promise<{
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