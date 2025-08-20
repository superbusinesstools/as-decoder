import { ProcessedData, CRMProgress } from '../types';
import twentyApi from './twenty/twentyApi';
import queueService from './queueService';

interface CRMSubStep {
  name: keyof CRMProgress;
  description: string;
  execute: (data: any) => Promise<{request: any, response: any}>;
}

interface CRMOperationResult {
  request: any;
  response: any;
}

class CRMService {
  private subSteps: CRMSubStep[] = [
    {
      name: 'contact_created',
      description: 'Create or update contact record',
      execute: this.createContact.bind(this)
    },
    {
      name: 'company_updated', 
      description: 'Update company information',
      execute: this.updateCompany.bind(this)
    },
    {
      name: 'notes_added',
      description: 'Add enrichment data as notes',
      execute: this.addNotes.bind(this)
    },
    {
      name: 'custom_fields_updated',
      description: 'Update custom fields',
      execute: this.updateCustomFields.bind(this)
    }
  ];

  async sendToCRM(companyId: string, processedData: ProcessedData): Promise<void> {
    console.log(`📤 Starting CRM integration for ${companyId}`);
    
    const progress = processedData.crm_progress || {};
    const allRequests: any[] = [];
    const allResponses: any[] = [];
    
    for (const step of this.subSteps) {
      if (!progress[step.name]) {
        console.log(`  ➡️ Executing: ${step.description}`);
        
        try {
          const result = await step.execute({ companyId, aiResult: processedData.ai_result });
          
          // Collect request/response data
          if (Array.isArray(result.request)) {
            allRequests.push(...result.request);
            allResponses.push(...result.response);
          } else {
            allRequests.push(result.request);
            allResponses.push(result.response);
          }
          
          // Update progress
          progress[step.name] = true;
          
          console.log(`  ✅ Completed: ${step.description}`);
          
        } catch (error) {
          console.error(`  ❌ Failed: ${step.description}`, error);
          throw error;
        }
      } else {
        console.log(`  ⏭️ Skipping: ${step.description} (already completed)`);
      }
    }
    
    // Save CRM request/response data to database
    const crmRequest = JSON.stringify(allRequests, null, 2);
    const crmResponse = JSON.stringify(allResponses, null, 2);
    
    queueService.updateCompanyCrmData(companyId, crmRequest, crmResponse);
    
    console.log(`✅ CRM integration completed for ${companyId}`);
  }

  private async createContact(data: { companyId: string; aiResult: any }): Promise<CRMOperationResult> {
    const { companyId, aiResult } = data;
    const people = aiResult.people || [];
    
    if (people.length > 0) {
      return await twentyApi.createPeople(companyId, people);
    } else {
      console.log(`ℹ️ No people found in AI result for company ${companyId}`);
      return { request: [], response: [] };
    }
  }

  private async updateCompany(data: { companyId: string; aiResult: any }): Promise<CRMOperationResult> {
    const { companyId, aiResult } = data;
    return await twentyApi.updateCompany(companyId, aiResult);
  }

  private async addNotes(data: { companyId: string; aiResult: any }): Promise<CRMOperationResult> {
    const { companyId, aiResult } = data;
    return await twentyApi.createNoteWithTarget(companyId, aiResult);
  }

  private async updateCustomFields(data: { companyId: string; aiResult: any }): Promise<CRMOperationResult> {
    // Custom fields are handled through the main company update
    // This step is kept for progress tracking compatibility
    console.log(`ℹ️ Custom fields updated via company update for ${data.companyId}`);
    return { request: { note: 'Custom fields handled via company update' }, response: { success: true } };
  }
}

export default new CRMService();