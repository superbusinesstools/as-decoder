import queueService from './queueService';
import db from '../db';
import { Company, ProcessedData } from '../types';
import { WebsiteScraper } from './websiteScraper';
import crmService from './crmService';
import claudeAI from './ai/claudeAI';

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
        WHERE status IN ('pending', 'processing') AND current_step != 'completed'
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
      console.log(`🔄 Processing company: ${company.company_id} (current step: ${company.current_step})`);
      
      // Update status to processing if it's not already
      if (company.status === 'pending') {
        queueService.updateCompanyStatus(company.company_id, 'processing');
      }
      
      // Step 1: Crawling (skip if raw_data exists)
      if (!company.raw_data && (company.current_step === 'pending' || company.current_step === 'crawling')) {
        await this.performCrawling(company);
        this.updateCurrentStep(company.company_id, 'ai_processing');
      }
      
      // Step 2: AI Processing (skip if processed_data exists)
      if (!company.processed_data && (company.current_step === 'ai_processing')) {
        await this.performAIProcessing(company);
        this.updateCurrentStep(company.company_id, 'crm_sending');
      }
      
      // Step 3: CRM Sending (check if already completed)
      if (company.current_step === 'crm_sending') {
        await this.performCRMSending(company);
        this.updateCurrentStep(company.company_id, 'completed');
        queueService.updateCompanyStatus(company.company_id, 'completed');
      }
      
      console.log(`✅ Company ${company.company_id} processed successfully`);
      
    } catch (error) {
      console.error(`❌ Error processing company ${company.company_id}:`, error);
      
      queueService.updateCompanyStatus(company.company_id, 'failed');
      
      // Map current_step to valid ProcessLog step
      const logStep = company.current_step === 'pending' ? 'crawling' : 
                     company.current_step === 'completed' ? 'crm_sending' : 
                     company.current_step;
      
      queueService.addProcessLog({
        company_id: company.company_id,
        step: logStep,
        status: 'failed',
        message: `Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    } finally {
      this.isProcessing = false;
    }
  }

  private updateCurrentStep(companyId: string, step: 'pending' | 'crawling' | 'ai_processing' | 'crm_sending' | 'completed'): void {
    try {
      const stmt = db.prepare(`
        UPDATE companies 
        SET current_step = ? 
        WHERE company_id = ?
      `);
      stmt.run(step, companyId);
    } catch (error) {
      console.error('❌ Error updating current step:', error);
      throw error;
    }
  }

  private async performCrawling(company: Company): Promise<void> {
    console.log(`🌐 Starting crawling for ${company.company_id} -> ${company.source_url}`);
    
    queueService.addProcessLog({
      company_id: company.company_id,
      step: 'crawling',
      status: 'started',
      message: 'Starting website crawl'
    });

    const rawData = await this.simulateWebsiteCrawl(company.website_url);
    
    this.updateCompanyRawData(company.company_id, rawData);
    console.log(`✅ Crawling completed for ${company.company_id} (${rawData.length} chars extracted)`);
    
    queueService.addProcessLog({
      company_id: company.company_id,
      step: 'crawling',
      status: 'completed',
      message: 'Website crawl completed',
      data: `${rawData.length} characters extracted`
    });
  }

  private async performAIProcessing(company: Company): Promise<void> {
    console.log(`🤖 Starting AI processing for ${company.company_id}`);
    
    queueService.addProcessLog({
      company_id: company.company_id,
      step: 'ai_processing',
      status: 'started',
      message: 'Starting AI processing'
    });

    // Get the raw data
    const rawData = company.raw_data || '';
    
    // Process with Claude AI
    const aiAnalysis = await claudeAI.processContent(rawData, company);
    
    // Create processed data structure
    const processedData: ProcessedData = {
      ai_result: aiAnalysis,
      crm_progress: {
        contact_created: false,
        company_updated: false,
        notes_added: false,
        custom_fields_updated: false
      }
    };
    
    this.updateCompanyProcessedData(company.company_id, JSON.stringify(processedData, null, 2));
    console.log(`✅ AI processing completed for ${company.company_id} (${aiAnalysis.people?.length || 0} people, ${aiAnalysis.quality_signals?.length || 0} quality signals)`);
    
    queueService.addProcessLog({
      company_id: company.company_id,
      step: 'ai_processing',
      status: 'completed',
      message: 'AI processing completed',
      data: 'Structured data extracted'
    });
  }

  private async performCRMSending(company: Company): Promise<void> {
    console.log(`📤 Starting CRM sending for ${company.company_id}`);
    
    queueService.addProcessLog({
      company_id: company.company_id,
      step: 'crm_sending',
      status: 'started',
      message: 'Starting CRM sending'
    });

    // Get processed data
    if (!company.processed_data) {
      throw new Error('No processed data available for CRM sending');
    }

    try {
      const processedData: ProcessedData = JSON.parse(company.processed_data);
      
      // Validate that we have AI results
      if (!processedData.ai_result) {
        throw new Error('No AI result data available for CRM sending');
      }
      
      console.log(`📊 AI result summary:`, {
        has_company_data: !!processedData.ai_result.company_data,
        has_people: !!(processedData.ai_result.people && processedData.ai_result.people.length > 0),
        has_services: !!processedData.ai_result.services,
        quality_signals_count: processedData.ai_result.quality_signals?.length || 0,
        growth_signals_count: processedData.ai_result.growth_signals?.length || 0,
      });
      
      // Use CRM service to send data with sub-step tracking
      await crmService.sendToCRM(company.company_id, processedData);
      
      console.log(`✅ CRM sending completed for ${company.company_id}`);
      
      queueService.addProcessLog({
        company_id: company.company_id,
        step: 'crm_sending',
        status: 'completed',
        message: 'Data sent to CRM successfully'
      });
      
    } catch (error) {
      console.error(`❌ Error parsing processed data for ${company.company_id}:`, error);
      queueService.addProcessLog({
        company_id: company.company_id,
        step: 'crm_sending',
        status: 'failed',
        message: `Failed to parse processed data: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      throw error;
    }
  }

  private async simulateWebsiteCrawl(websiteUrl: string): Promise<string> {
    const maxDepth = parseInt(process.env.CRAWL_MAX_DEPTH || '2');
    const maxPages = parseInt(process.env.CRAWL_MAX_PAGES || '10');
    const scraper = new WebsiteScraper();
    
    try {
      const result = await scraper.scrapeWebsite(websiteUrl, maxDepth, maxPages);
      
      if (result.success && result.content.length > 0) {
        return result.content.join('\n\n');
      } else {
        throw new Error(result.error || 'Failed to scrape website content');
      }
    } catch (error) {
      console.error(`Error scraping ${websiteUrl}:`, error);
      throw error;
    }
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