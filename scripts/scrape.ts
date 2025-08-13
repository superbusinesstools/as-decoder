#!/usr/bin/env ts-node

import { spawn } from 'child_process';
import path from 'path';

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.error('Usage: pnpm scrape <url> [maxDepth]');
    console.error('');
    console.error('Examples:');
    console.error('  pnpm scrape https://example.com');
    console.error('  pnpm scrape https://example.com 3');
    console.error('');
    process.exit(1);
  }
  
  let url = args[0];
  const maxDepth = parseInt(args[1]) || 2;
  
  // Add https:// if no protocol specified
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }
  
  console.log(`🚀 Scraping: ${url}`);
  console.log(`📊 Max depth: ${maxDepth}`);
  console.log('');
  
  try {
    // Call Python scraper directly
    const scraperPath = path.join(__dirname, 'scraper/scrape.py');
    const venvPython = path.join(__dirname, 'scraper/venv/bin/python');
    
    const result = await new Promise<{
      success: boolean;
      content: string;
      emails: string[];
      links: string[];
      pagesVisited: number;
      error?: string;
    }>((resolve) => {
      const pythonProcess = spawn(venvPython, [
        scraperPath,
        url,
        '--depth', maxDepth.toString()
      ], {
        cwd: path.join(__dirname, 'scraper'),
        timeout: 60000  // 60 second timeout
      });

      let output = '';
      let errorOutput = '';

      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      pythonProcess.on('close', (code) => {
        try {
          if (code === 0 && output.trim()) {
            const result = JSON.parse(output.trim());
            resolve(result);
          } else {
            resolve({
              success: false,
              error: `Python scraper failed with code ${code}: ${errorOutput}`,
              content: '',
              emails: [],
              links: [],
              pagesVisited: 0
            });
          }
        } catch (parseError) {
          resolve({
            success: false,
            error: `Failed to parse scraper output: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
            content: output || '',
            emails: [],
            links: [],
            pagesVisited: 0
          });
        }
      });

      pythonProcess.on('error', (error) => {
        resolve({
          success: false,
          error: `Failed to start Python scraper: ${error.message}`,
          content: '',
          emails: [],
          links: [],
          pagesVisited: 0
        });
      });
    });
    
    if (result.success) {
      console.log('✅ Scraping completed successfully!\n');
      console.log('📋 SCRAPED CONTENT:');
      console.log('==========================================');
      console.log(result.content);
      console.log('==========================================\n');
      
      if (result.emails.length > 0) {
        console.log('📧 EMAILS FOUND:');
        result.emails.forEach(email => console.log(`  - ${email}`));
        console.log('');
      }
      
      console.log('📊 STATISTICS:');
      console.log(`  - Pages visited: ${result.pagesVisited}`);
      console.log(`  - Emails found: ${result.emails.length}`);
      console.log(`  - Content length: ${result.content.length} characters`);
    } else {
      console.error('❌ Scraping failed:');
      console.error(`   ${result.error}`);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Unexpected error:');
    console.error(`   ${error instanceof Error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}