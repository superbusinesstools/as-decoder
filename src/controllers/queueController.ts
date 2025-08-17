import { Request, Response } from 'express';
import queueService from '../services/queueService';
import { validateCompanyQueue } from '../utils/validation';
import crmApi from '../services/crmApi';

export class QueueController {
  private validateAndNormalizeUrl(url: string): string {
    try {
      const parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        console.warn(`⚠ Invalid protocol ${parsedUrl.protocol}, using https://`);
        return `https://${url.replace(/^[^:]+:\/\//, '')}`;
      }
      return parsedUrl.toString();
    } catch (error) {
      console.warn(`⚠ Invalid URL format: ${url}, attempting to fix`);
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return `https://${url}`;
      }
      return url;
    }
  }
  async addToQueue(req: Request, res: Response): Promise<void> {
    try {
      const { error, value } = validateCompanyQueue(req.body);

      if (error) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error
        });
        return;
      }

      let companyData = value!;

      if (!companyData.source_url) {
        console.log(`source_url not provided, fetching from CRM for company ID: ${companyData.company_id}`);
        
        try {
          const crmCompany = await crmApi.getCompanyById(companyData.company_id);
          
          if (crmCompany?.sourceUrl) {
            companyData.source_url = crmCompany.sourceUrl;
            console.log(`✓ Retrieved source_url from CRM: ${crmCompany.sourceUrl}`);
          } else {
            console.warn(`⚠ Company found in CRM but no sourceUrl field available for ID: ${companyData.company_id}`);
            console.log(`→ Falling back to website_url: ${companyData.website_url}`);
            companyData.source_url = this.validateAndNormalizeUrl(companyData.website_url);
          }
        } catch (crmError: any) {
          if (crmError.message?.includes('404')) {
            console.warn(`⚠ Company not found in CRM (ID: ${companyData.company_id})`);
          } else {
            console.error(`✗ CRM API error for company ${companyData.company_id}:`, crmError.message || crmError);
          }
          console.log(`→ Falling back to website_url: ${companyData.website_url}`);
          companyData.source_url = this.validateAndNormalizeUrl(companyData.website_url);
        }
      } else {
        console.log(`✓ Using provided source_url: ${companyData.source_url}`);
      }

      const company = queueService.createCompany(companyData);

      res.status(201).json({
        success: true,
        message: 'Company queued successfully',
        data: {
          id: company.id,
          company_id: company.company_id,
          status: company.status,
          created_at: company.created_at
        }
      });
    } catch (error: any) {
      if (error.message?.includes('already exists')) {
        res.status(409).json({
          success: false,
          error: 'Conflict',
          message: error.message
        });
        return;
      }

      console.error('Queue error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to queue company'
      });
    }
  }

  async getCompanyStatus(req: Request, res: Response): Promise<void> {
    try {
      const { company_id } = req.params;

      const company = queueService.getCompanyById(company_id);
      
      if (!company) {
        res.status(404).json({
          success: false,
          error: 'Not found',
          message: `Company with ID ${company_id} not found`
        });
        return;
      }

      const logs = queueService.getCompanyLogs(company_id);

      res.json({
        success: true,
        data: {
          company,
          logs
        }
      });
    } catch (error) {
      console.error('Get status error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to get company status'
      });
    }
  }
}

export default new QueueController();