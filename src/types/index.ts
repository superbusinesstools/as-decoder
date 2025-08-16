export interface CompanyQueueRequest {
  company_id: string;
  website_url: string;
  source_url: string;
}

export interface Company {
  id: number;
  company_id: string;
  website_url: string;
  source_url: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  current_step: 'pending' | 'crawling' | 'ai_processing' | 'crm_sending' | 'completed';
  raw_data?: string;
  processed_data?: string;
  created_at: string;
  updated_at: string;
}

export interface ProcessLog {
  id: number;
  company_id: string;
  step: 'received' | 'crawling' | 'ai_processing' | 'crm_sending';
  status: 'started' | 'completed' | 'failed';
  message?: string;
  data?: string;
  created_at: string;
}

export interface CRMProgress {
  contact_created?: boolean;
  company_updated?: boolean;
  notes_added?: boolean;
  custom_fields_updated?: boolean;
}

export interface ProcessedData {
  ai_result: any;
  crm_progress?: CRMProgress;
}