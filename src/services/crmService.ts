import { ProcessedData, CRMProgress } from '../types';
import twentyApi from './twenty/twentyApi';

interface CRMSubStep {
  name: keyof CRMProgress;
  description: string;
  execute: (data: any) => Promise<void>;
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
    
    for (const step of this.subSteps) {
      if (!progress[step.name]) {
        console.log(`  ➡️ Executing: ${step.description}`);
        
        try {
          await step.execute({ companyId, aiResult: processedData.ai_result });
          
          // Update progress
          progress[step.name] = true;
          
          // TODO: Save updated progress back to database
          console.log(`  ✅ Completed: ${step.description}`);
          
        } catch (error) {
          console.error(`  ❌ Failed: ${step.description}`, error);
          throw error;
        }
      } else {
        console.log(`  ⏭️ Skipping: ${step.description} (already completed)`);
      }
    }
    
    console.log(`✅ CRM integration completed for ${companyId}`);
  }

  private async createContact(data: { companyId: string; aiResult: any }): Promise<void> {
    const { companyId, aiResult } = data;
    const people = aiResult.people || [];
    
    if (people.length > 0) {
      await twentyApi.createPeople(companyId, people);
    } else {
      console.log(`ℹ️ No people found in AI result for company ${companyId}`);
    }
  }

  private async updateCompany(data: { companyId: string; aiResult: any }): Promise<void> {
    const { companyId, aiResult } = data;
    await twentyApi.updateCompany(companyId, aiResult);
  }

  private async addNotes(data: { companyId: string; aiResult: any }): Promise<void> {
    const { companyId, aiResult } = data;
    await twentyApi.createNoteWithTarget(companyId, aiResult);
  }

  private async updateCustomFields(data: { companyId: string; aiResult: any }): Promise<void> {
    // Custom fields are handled through the main company update
    // This step is kept for progress tracking compatibility
    console.log(`ℹ️ Custom fields updated via company update for ${data.companyId}`);
  }
}

export default new CRMService();