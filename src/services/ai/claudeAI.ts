import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { Company } from '../../types';

interface AIAnalysisResult {
  company_data: {
    name: string;
    description: string;
    industry: string;
    size_category: string;
    employee_count?: number;
    employee_range?: string;
    founded_year?: number;
    headquarters?: string;
    other_locations?: string[];
    phone?: string;
    linkedin?: string;
    twitter?: string;
    facebook?: string;
    instagram?: string;
  };
  people: Array<{
    email?: string;
    title?: string;
    first_name?: string;
    middle_name?: string;
    last_name?: string;
    phone?: string;
    linkedin?: string;
    twitter?: string;
    facebook?: string;
    instagram?: string;
  }>;
  services: {
    company_overview?: string;
    offerings?: string;
    proof_points?: string;
    target_market?: string;
    key_people?: string;
    recent_activity?: string;
    tech_stack?: string;
    competitive_intel?: string;
  };
  quality_signals: string[];
  growth_signals: string[];
  industry_metrics: string[];
  notes?: string;
}

class ClaudeAI {
  private anthropic: Anthropic | null = null;
  private promptTemplate: string = '';

  constructor() {
    this.initializeClient();
    this.loadPrompt();
  }

  private initializeClient(): void {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      console.warn('⚠️ ANTHROPIC_API_KEY not found. AI processing will use mock data.');
      return;
    }

    try {
      this.anthropic = new Anthropic({
        apiKey: apiKey,
      });
      console.log('✅ Claude AI client initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Claude AI client:', error);
    }
  }

  private loadPrompt(): void {
    try {
      const promptPath = path.join(__dirname, 'prompt.txt');
      this.promptTemplate = fs.readFileSync(promptPath, 'utf-8');
      console.log('✅ AI prompt loaded from file');
    } catch (error) {
      console.error('❌ Failed to load prompt file:', error);
      // Fallback prompt
      this.promptTemplate = `Analyze the following company website content and extract structured information.

Company: {{company_id}}
Website: {{website_url}}

Content:
{{content}}

Return a JSON object with company information, notes, contacts, and extracted data.`;
    }
  }

  private preparePrompt(content: string, company: Company): string {
    return this.promptTemplate
      .replace('{{company_id}}', company.company_id)
      .replace('{{website_url}}', company.website_url)
      .replace('{{source_url}}', company.source_url)
      .replace('{{content}}', content);
  }

  async processContent(content: string, company: Company): Promise<{result: AIAnalysisResult, prompt: string, data_source: 'claude_ai' | 'mock'}> {
    const prompt = this.preparePrompt(content, company);
    
    if (!this.anthropic) {
      console.log('🔄 Using mock AI data (Claude API not configured)');
      return {
        result: this.getMockAnalysis(company),
        prompt: prompt,
        data_source: 'mock'
      };
    }

    try {
      console.log(`🤖 Processing content for ${company.company_id} with Claude AI`);
      
      const response = await this.anthropic.messages.create({
        model: process.env.CLAUDE_MODEL || 'claude-3-haiku-20240307',
        max_tokens: 4000,
        temperature: 0.3,
        messages: [{
          role: 'user',
          content: prompt
        }]
      });

      const responseText = response.content[0].type === 'text' ? response.content[0].text : '';
      
      // Parse JSON response
      const analysis = this.parseAIResponse(responseText);
      
      console.log(`✅ Claude AI analysis completed for ${company.company_id}`);
      return {
        result: analysis,
        prompt: prompt,
        data_source: 'claude_ai'
      };

    } catch (error) {
      console.error('❌ Claude AI processing failed:', error);
      console.log('🔄 Falling back to mock data');
      return {
        result: this.getMockAnalysis(company),
        prompt: prompt,
        data_source: 'mock'
      };
    }
  }

  private parseAIResponse(responseText: string): AIAnalysisResult {
    try {
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate the structure
      if (!parsed.company_data || !parsed.people || !parsed.services) {
        throw new Error('Invalid response structure');
      }
      
      return parsed as AIAnalysisResult;
    } catch (error) {
      console.error('❌ Failed to parse AI response:', error);
      throw new Error('Invalid AI response format');
    }
  }

  private getMockAnalysis(company: Company): AIAnalysisResult {
    return {
      company_data: {
        name: "[MOCK DATA] " + company.company_id.split('-').slice(0, 2).join('-'),
        description: "⚠️ MOCK DATA: This is mock/test data - AI processing was not available. Real analysis would extract actual company information from the scraped website content.",
        industry: "[MOCK] Technology",
        size_category: "mock",
        employee_count: 0,
        employee_range: "MOCK: 0-0",
        founded_year: 1900,
        headquarters: "MOCK: Test City, XX",
        other_locations: ["MOCK: Test Location 1", "MOCK: Test Location 2"],
        phone: "+1-000-000-0000",
        linkedin: "https://example.com/mock-linkedin",
        twitter: "https://example.com/mock-twitter",
        facebook: "https://example.com/mock-facebook",
        instagram: "https://example.com/mock-instagram"
      },
      people: [
        {
          email: "mock.person1@example.com",
          title: "[MOCK] CEO",
          first_name: "Mock",
          last_name: "Person1",
          phone: "+1-000-000-0001",
          linkedin: "https://example.com/mock-person1"
        },
        {
          email: "mock.person2@example.com",
          title: "[MOCK] CTO", 
          first_name: "Mock",
          last_name: "Person2",
          linkedin: "https://example.com/mock-person2"
        }
      ],
      services: {
        company_overview: "[MOCK] This is mock/test data - no real company analysis was performed. Real AI would analyze the actual scraped website content.",
        offerings: "[MOCK] Mock services - real analysis would extract actual offerings from website content.",
        target_market: "[MOCK] Mock target market - real analysis would identify actual customer segments.",
        tech_stack: "[MOCK] Mock technology stack",
        competitive_intel: "[MOCK] Mock competitive information - real analysis would extract actual differentiators.",
        recent_activity: "[MOCK] Mock recent activity - real analysis would identify current company news/developments."
      },
      quality_signals: [
        "[MOCK] Mock quality signal 1 - real analysis would identify actual company achievements",
        "[MOCK] Mock quality signal 2 - real analysis would extract credibility indicators",
        "[MOCK] Mock quality signal 3 - this is test data only"
      ],
      growth_signals: [
        "[MOCK] Mock growth indicator 1 - real analysis would identify expansion signals",
        "[MOCK] Mock growth indicator 2 - this is test data only",
        "[MOCK] Mock growth indicator 3 - real analysis would extract growth metrics"
      ],
      industry_metrics: [
        "[MOCK] Mock metric 1: This is test data",
        "[MOCK] Mock metric 2: Real analysis would extract industry-specific KPIs",
        "[MOCK] Mock metric 3: No real metrics available"
      ],
      notes: "⚠️ MOCK DATA WARNING: This entire analysis is mock/test data because AI processing was not available (likely due to invalid API key or service unavailability). Real analysis would extract actual company information, contacts, and insights from the scraped website content. The scraped content was available but could not be processed by Claude AI."
    };
  }

  // Method to reload prompt from file (useful for development)
  reloadPrompt(): void {
    this.loadPrompt();
  }
}

export default new ClaudeAI();