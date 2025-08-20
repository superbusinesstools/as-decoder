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

  async processContent(content: string, company: Company): Promise<{result: AIAnalysisResult, prompt: string}> {
    const prompt = this.preparePrompt(content, company);
    
    if (!this.anthropic) {
      console.log('🔄 Using mock AI data (Claude API not configured)');
      return {
        result: this.getMockAnalysis(company),
        prompt: prompt
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
        prompt: prompt
      };

    } catch (error) {
      console.error('❌ Claude AI processing failed:', error);
      console.log('🔄 Falling back to mock data');
      return {
        result: this.getMockAnalysis(company),
        prompt: prompt
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
        name: company.company_id.split('-').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' '),
        description: "A technology company specializing in innovative solutions for modern businesses.",
        industry: "Technology",
        size_category: "medium",
        employee_count: 150,
        employee_range: "100-200",
        founded_year: 2010,
        headquarters: "San Francisco, CA",
        other_locations: ["New York, NY", "Austin, TX"],
        phone: "+1-555-123-4567",
        linkedin: "https://linkedin.com/company/example",
        twitter: "https://twitter.com/example",
        facebook: "https://facebook.com/example",
        instagram: "https://instagram.com/example"
      },
      people: [
        {
          email: "john.doe@example.com",
          title: "CEO",
          first_name: "John",
          last_name: "Doe",
          phone: "+1-555-123-4568",
          linkedin: "https://linkedin.com/in/johndoe"
        },
        {
          email: "jane.smith@example.com",
          title: "CTO",
          first_name: "Jane",
          last_name: "Smith",
          linkedin: "https://linkedin.com/in/janesmith"
        }
      ],
      services: {
        company_overview: "Leading technology company focused on delivering innovative solutions for modern business challenges through cutting-edge technology and expert consulting services.",
        offerings: "Custom software development, cloud migration services, data analytics solutions, artificial intelligence implementations, and digital transformation consulting.",
        target_market: "Serves companies of all sizes, from startups to Fortune 500 enterprises, with a focus on businesses looking to modernize their technology infrastructure.",
        tech_stack: "Cloud platforms, AI/ML frameworks, Modern web technologies, Database systems",
        competitive_intel: "Distinguished by agile development approach, rapid delivery capabilities, high quality standards, and a diverse team of expert professionals.",
        recent_activity: "Launched new AI consulting division, expanded to Austin office, hired 25 new engineers"
      },
      quality_signals: [
        "Fortune 500 clients including major banks",
        "ISO 27001 certified",
        "Winner of Tech Innovation Award 2024",
        "4.8/5 star client satisfaction rating"
      ],
      growth_signals: [
        "200% revenue growth in 2024",
        "Expanded from 50 to 150 employees",
        "Opened 2 new offices this year",
        "Series B funding - $25M raised"
      ],
      industry_metrics: [
        "Technology: 150 employees, $15M ARR",
        "SaaS: 500+ enterprise clients, 2% churn rate",
        "Consulting: 95% project success rate"
      ],
      notes: "Additional company information: Strong presence in fintech and healthcare verticals. Known for rapid implementation and excellent customer support."
    };
  }

  // Method to reload prompt from file (useful for development)
  reloadPrompt(): void {
    this.loadPrompt();
  }
}

export default new ClaudeAI();