import { TwentyApiResponse, TwentyCompanyUpdate, TwentyNote, TwentyNoteTarget } from '../../types/twenty.types';

class TwentyApiService {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = process.env.TWENTY_API_URL || 'https://20.afternoonltd.com';
    this.apiKey = process.env.TWENTY_API_KEY || '';
  }

  private async makeRequest(endpoint: string, method: string = 'GET', body?: any): Promise<TwentyApiResponse> {
    const url = `${this.baseUrl}/rest/${endpoint}`;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    try {
      console.log(`📡 Twenty API: ${method} ${url}`);
      
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Twenty API error ${response.status}:`, errorText);
        throw new Error(`Twenty API error: ${response.status} ${response.statusText}. Response: ${errorText}`);
      }

      const data = await response.json() as TwentyApiResponse;
      console.log(`✅ Twenty API response received`);
      
      return data;
    } catch (error) {
      console.error(`❌ Twenty API request failed:`, error);
      throw error;
    }
  }

  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  async updateCompany(companyId: string, aiResult: any): Promise<{request: any, response: any}> {
    console.log(`🏢 Updating company ${companyId} with AI result`);
    
    // Validate UUID format
    if (!this.isValidUUID(companyId)) {
      throw new Error(`Invalid company ID format: "${companyId}" is not a valid UUID. Twenty CRM requires company IDs to be in UUID format (e.g., 123e4567-e89b-12d3-a456-426614174000)`);
    }
    
    if (!this.apiKey) {
      throw new Error('TWENTY_API_KEY is not configured');
    }
    
    const companyData = aiResult.company_data || {};
    const services = aiResult.services || {};
    
    // Build update payload directly from AI result
    const updateData: TwentyCompanyUpdate = {
      // Basic company info
      ...(companyData.name && { name: companyData.name }),
      ...(companyData.industry && { industry: companyData.industry }),
      ...(companyData.employee_count && { employees: companyData.employee_count }),
      ...(companyData.founded_year && { foundedYear: companyData.founded_year }),
      
      // Address fields
      ...(companyData.headquarters && { headquarters: companyData.headquarters }),
      
      // Social links
      ...(companyData.linkedin && { 
        linkedinLink: { 
          primaryLinkUrl: companyData.linkedin,
          primaryLinkLabel: '' 
        } 
      }),
      ...(companyData.twitter && { 
        xLink: { 
          primaryLinkUrl: companyData.twitter,
          primaryLinkLabel: '' 
        } 
      }),
      ...(companyData.facebook && { 
        facebook: { 
          primaryLinkUrl: companyData.facebook,
          primaryLinkLabel: '' 
        } 
      }),
      ...(companyData.instagram && { 
        instagram: { 
          primaryLinkUrl: companyData.instagram,
          primaryLinkLabel: '' 
        } 
      }),
      
      // Service fields
      ...(services.company_overview && { overview: services.company_overview }),
      ...(services.offerings && { offerings: services.offerings }),
      ...(services.target_market && { targetMarket: services.target_market }),
      ...(services.tech_stack && { techStack: services.tech_stack }),
      ...(services.competitive_intel && { competitiveIntel: services.competitive_intel }),
      ...(services.recent_activity && { recentActivity: services.recent_activity }),
      
      // New fields for quality and growth signals
      ...(aiResult.quality_signals && aiResult.quality_signals.length > 0 && { 
        qualitySignals: aiResult.quality_signals 
      }),
      ...(aiResult.growth_signals && aiResult.growth_signals.length > 0 && { 
        growthSignals: aiResult.growth_signals 
      }),
      ...(aiResult.industry_metrics && aiResult.industry_metrics.length > 0 && { 
        industryMetrics: aiResult.industry_metrics 
      }),
      ...(companyData.other_locations && companyData.other_locations.length > 0 && { 
        locations: companyData.other_locations 
      }),
    };

    console.log(`📤 Sending update data to Twenty:`, JSON.stringify(updateData, null, 2));
    const response = await this.makeRequest(`companies/${companyId}`, 'PATCH', updateData);
    console.log(`✅ Company ${companyId} updated successfully`);
    
    return {
      request: { endpoint: `companies/${companyId}`, method: 'PATCH', data: updateData },
      response
    };
  }

  async createPeople(companyId: string, people: any[]): Promise<{request: any, response: any}> {
    if (!people || people.length === 0) {
      console.log(`ℹ️ No people to create for company ${companyId}`);
      return { request: [], response: [] };
    }
    
    // Validate UUID format
    if (!this.isValidUUID(companyId)) {
      throw new Error(`Invalid company ID format: "${companyId}" is not a valid UUID. Twenty CRM requires company IDs to be in UUID format`);
    }

    console.log(`👥 Creating ${people.length} people for company ${companyId}`);
    
    const requests: any[] = [];
    const responses: any[] = [];
    
    // Create people one by one since batch creation might not be supported
    for (const person of people) {
      const personData = {
        ...(person.email && { emails: { primaryEmail: person.email } }),
        ...(person.first_name && { 
          name: { 
            firstName: person.first_name,
            lastName: person.last_name || ''
          } 
        }),
        ...(person.title && { jobTitle: person.title }),
        companyId: companyId,
        ...(person.linkedin && { 
          linkedinLink: { 
            primaryLinkUrl: person.linkedin,
            primaryLinkLabel: '' 
          } 
        }),
        ...(person.twitter && { 
          xLink: { 
            primaryLinkUrl: person.twitter,
            primaryLinkLabel: '' 
          } 
        }),
        ...(person.phone && { 
          phones: { 
            primaryPhoneNumber: person.phone,
            primaryPhoneCountryCode: '',
            primaryPhoneCallingCode: ''
          } 
        }),
      };

      try {
        const response = await this.makeRequest('people', 'POST', personData);
        requests.push({ endpoint: 'people', method: 'POST', data: personData });
        responses.push(response);
        console.log(`✅ Created person: ${person.first_name} ${person.last_name}`);
      } catch (error) {
        console.error(`❌ Failed to create person ${person.first_name} ${person.last_name}:`, error);
        requests.push({ endpoint: 'people', method: 'POST', data: personData });
        responses.push({ error: error instanceof Error ? error.message : 'Unknown error' });
        // Continue with next person rather than failing entire batch
      }
    }
    console.log(`✅ Created ${people.length} people successfully`);
    
    return {
      request: requests,
      response: responses
    };
  }

  async createNoteWithTarget(companyId: string, noteContent: any): Promise<{request: any, response: any}> {
    console.log(`📝 Creating note for company ${companyId}`);
    
    // Create a comprehensive note from remaining AI data
    const noteBody = this.formatNoteContent(noteContent);
    
    const noteData: TwentyNote = {
      title: `AI Enrichment - ${new Date().toLocaleDateString()}`,
      bodyV2: {
        markdown: noteBody, // ✅ RichTextV2 requires markdown field
      },
    };

    const requests: any[] = [];
    const responses: any[] = [];
    
    // Create the note
    const noteResponse = await this.makeRequest('notes', 'POST', noteData);
    requests.push({ endpoint: 'notes', method: 'POST', data: noteData });
    responses.push(noteResponse);
    
    // The actual response structure might be different, let's handle both cases
    let noteId: string | null = null;
    
    if (noteResponse.data?.createNote?.id) {
      noteId = noteResponse.data.createNote.id;
    } else if (noteResponse.data?.notes?.[0]?.id) {
      noteId = noteResponse.data.notes[0].id;
    } else if (noteResponse.data?.id) {
      noteId = noteResponse.data.id;
    } else if (noteResponse.id) {
      noteId = noteResponse.id;
    }
    
    if (noteId) {
      // Link note to company
      const noteTargetData: TwentyNoteTarget = {
        noteId: noteId,
        companyId: companyId,
      };

      const linkResponse = await this.makeRequest('noteTargets', 'POST', noteTargetData);
      requests.push({ endpoint: 'noteTargets', method: 'POST', data: noteTargetData });
      responses.push(linkResponse);
      console.log(`✅ Note created and linked to company ${companyId}`);
    } else {
      console.log(`⚠️ Note created but could not retrieve ID for linking. Response:`, JSON.stringify(noteResponse, null, 2));
    }
    
    return {
      request: requests,
      response: responses
    };
  }

  private formatNoteContent(aiResult: any): string {
    const sections: string[] = [];
    
    // Quality Signals
    if (aiResult.quality_signals?.length > 0) {
      sections.push(`**Quality Signals:**\n${aiResult.quality_signals.map((signal: string) => `• ${signal}`).join('\n')}`);
    }
    
    // Growth Signals
    if (aiResult.growth_signals?.length > 0) {
      sections.push(`**Growth Signals:**\n${aiResult.growth_signals.map((signal: string) => `• ${signal}`).join('\n')}`);
    }
    
    // Industry Metrics
    if (aiResult.industry_metrics?.length > 0) {
      sections.push(`**Industry Metrics:**\n${aiResult.industry_metrics.map((metric: string) => `• ${metric}`).join('\n')}`);
    }
    
    // Additional Notes
    if (aiResult.notes) {
      sections.push(`**Additional Notes:**\n${aiResult.notes}`);
    }
    
    // Key People Details
    if (aiResult.services?.key_people) {
      sections.push(`**Key People:**\n${aiResult.services.key_people}`);
    }
    
    return sections.join('\n\n');
  }
}

export default new TwentyApiService();