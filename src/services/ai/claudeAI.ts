import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';
import { Company } from '../../types';

interface AIAnalysisResult {
  company_data: {
    name: string;
    industry: string;
    size: string;
    description: string;
    founded?: string;
    location?: string;
  };
  notes: Array<{
    title: string;
    content: string;
  }>;
  contacts: {
    emails: string[];
    phones: string[];
    addresses: string[];
    social_media: string[];
  };
  extracted_data: {
    services: string[];
    technologies: string[];
    clients: string[];
    partnerships: string[];
    team_size?: string;
    keywords: string[];
  };
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

  async processContent(content: string, company: Company): Promise<AIAnalysisResult> {
    if (!this.anthropic) {
      console.log('🔄 Using mock AI data (Claude API not configured)');
      return this.getMockAnalysis(company);
    }

    try {
      console.log(`🤖 Processing content for ${company.company_id} with Claude AI`);
      
      const prompt = this.preparePrompt(content, company);
      
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
      return analysis;

    } catch (error) {
      console.error('❌ Claude AI processing failed:', error);
      console.log('🔄 Falling back to mock data');
      return this.getMockAnalysis(company);
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
      if (!parsed.company_data || !parsed.notes || !parsed.contacts || !parsed.extracted_data) {
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
        industry: "Technology",
        size: "medium",
        description: "A technology company specializing in innovative solutions for modern businesses.",
        founded: "2010",
        location: "United States"
      },
      notes: [
        {
          title: "Business Overview",
          content: "Leading technology company focused on delivering innovative solutions for modern business challenges through cutting-edge technology and expert consulting services."
        },
        {
          title: "Key Services & Products",
          content: "Offers custom software development, cloud migration services, data analytics solutions, artificial intelligence implementations, and digital transformation consulting."
        },
        {
          title: "Target Market & Customers",
          content: "Serves companies of all sizes, from startups to Fortune 500 enterprises, with a focus on businesses looking to modernize their technology infrastructure."
        },
        {
          title: "Competitive Advantages",
          content: "Distinguished by agile development approach, rapid delivery capabilities, high quality standards, and a diverse team of expert professionals."
        }
      ],
      contacts: {
        emails: [],
        phones: [],
        addresses: [],
        social_media: []
      },
      extracted_data: {
        services: [
          "Custom software development",
          "Cloud migration",
          "Data analytics",
          "Artificial intelligence solutions",
          "Digital transformation consulting"
        ],
        technologies: [
          "Cloud platforms",
          "AI/ML frameworks",
          "Modern web technologies",
          "Database systems"
        ],
        clients: [],
        partnerships: [],
        keywords: [
          "technology",
          "innovation",
          "software development",
          "digital transformation",
          "cloud solutions"
        ]
      }
    };
  }

  // Method to reload prompt from file (useful for development)
  reloadPrompt(): void {
    this.loadPrompt();
  }
}

export default new ClaudeAI();