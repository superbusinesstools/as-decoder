import queueService from './queueService';
import db from '../db';
import { Company } from '../types';
import { WebsiteScraper } from './websiteScraper';

class ProcessorService {
  private isProcessing = false;
  private intervalId: NodeJS.Timeout | null = null;

  start() {
    if (this.intervalId) {
      console.log('Processor already running');
      return;
    }

    console.log('🚀 Starting background processor...');
    this.intervalId = setInterval(() => {
      this.processPendingCompanies();
    }, 5000); // Check every 5 seconds
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('⏹️ Background processor stopped');
    }
  }

  private async processPendingCompanies() {
    if (this.isProcessing) {
      return; // Skip if already processing
    }

    try {
      const pendingCompanies = this.getPendingCompanies();
      if (pendingCompanies.length === 0) {
        return;
      }

      console.log(`📋 Found ${pendingCompanies.length} pending companies to process`);
      
      for (const company of pendingCompanies) {
        await this.processCompany(company);
      }
    } catch (error) {
      console.error('❌ Error in processPendingCompanies:', error);
    }
  }

  private getPendingCompanies(): Company[] {
    try {
      const stmt = db.prepare(`
        SELECT * FROM companies 
        WHERE status = 'pending' 
        ORDER BY created_at ASC
      `);
      return stmt.all() as Company[];
    } catch (error) {
      console.error('❌ Error getting pending companies:', error);
      return [];
    }
  }

  private async processCompany(company: Company) {
    this.isProcessing = true;
    
    try {
      console.log(`🔄 Processing company: ${company.company_id}`);
      
      // Update status to processing
      queueService.updateCompanyStatus(company.company_id, 'processing');
      
      // Log crawling start
      queueService.addProcessLog({
        company_id: company.company_id,
        step: 'crawling',
        status: 'started',
        message: 'Starting website crawl'
      });

      // Simulate website crawling
      const rawData = await this.simulateWebsiteCrawl(company.website_url);
      
      // Save raw data and log crawling completion
      this.updateCompanyRawData(company.company_id, rawData);
      queueService.addProcessLog({
        company_id: company.company_id,
        step: 'crawling',
        status: 'completed',
        message: 'Website crawl completed',
        data: `${rawData.length} characters extracted`
      });

      // Log AI processing start
      queueService.addProcessLog({
        company_id: company.company_id,
        step: 'ai_processing',
        status: 'started',
        message: 'Starting AI processing'
      });

      // Simulate AI processing
      const processedData = await this.processWithAI(rawData, company);
      
      // Save processed data and log AI completion
      this.updateCompanyProcessedData(company.company_id, processedData);
      queueService.addProcessLog({
        company_id: company.company_id,
        step: 'ai_processing',
        status: 'completed',
        message: 'AI processing completed',
        data: 'Structured data extracted'
      });

      // Mark company as completed
      queueService.updateCompanyStatus(company.company_id, 'completed');
      
      console.log(`✅ Company ${company.company_id} processed successfully`);
      
    } catch (error) {
      console.error(`❌ Error processing company ${company.company_id}:`, error);
      
      queueService.updateCompanyStatus(company.company_id, 'failed');
      queueService.addProcessLog({
        company_id: company.company_id,
        step: 'crawling',
        status: 'failed',
        message: `Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      this.isProcessing = false;
    }
  }

  private async simulateWebsiteCrawl(websiteUrl: string): Promise<string> {
    const scraper = new WebsiteScraper({ maxDepth: 2 });
    
    try {
      const result = await scraper.scrapeWebsite(websiteUrl, 2);
      
      if (result.success && result.content.trim()) {
        return result.content;
      } else {
        throw new Error(result.error || 'Failed to scrape website content');
      }
    } catch (error) {
      console.error(`Error scraping ${websiteUrl}:`, error);
      throw error;
    }
  }

  private async processWithAI(rawData: string, company: Company): Promise<string> {
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Mock AI-processed structured data
    const structuredData = {
      company_info: {
        name: company.company_id.split('-').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' '),
        website: company.website_url,
        source: company.source_url,
        founded: "2010",
        employees: "50-200",
        industry: "Technology"
      },
      extracted_content: {
        description: "Leading technology company specializing in innovative solutions for modern businesses",
        services: [
          "Custom software development",
          "Cloud migration",
          "Data analytics", 
          "Artificial intelligence solutions",
          "Digital transformation consulting"
        ],
        target_market: "Companies of all sizes, from startups to Fortune 500 enterprises",
        key_differentiators: [
          "Agile approach",
          "Rapid delivery",
          "High quality standards",
          "Diverse expert team"
        ]
      },
      metrics: {
        pages_analyzed: 3,
        total_content_length: rawData.length,
        processing_timestamp: new Date().toISOString()
      }
    };

    return JSON.stringify(structuredData, null, 2);
  }

  private updateCompanyRawData(companyId: string, rawData: string): void {
    try {
      const stmt = db.prepare(`
        UPDATE companies 
        SET raw_data = ? 
        WHERE company_id = ?
      `);
      stmt.run(rawData, companyId);
    } catch (error) {
      console.error('❌ Error updating raw data:', error);
      throw error;
    }
  }

  private updateCompanyProcessedData(companyId: string, processedData: string): void {
    try {
      const stmt = db.prepare(`
        UPDATE companies 
        SET processed_data = ? 
        WHERE company_id = ?
      `);
      stmt.run(processedData, companyId);
    } catch (error) {
      console.error('❌ Error updating processed data:', error);
      throw error;
    }
  }
}

export default new ProcessorService();