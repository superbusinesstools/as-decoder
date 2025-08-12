import { Request, Response } from 'express';
import queueService from '../services/queueService';
import { validateCompanyQueue } from '../utils/validation';

export class QueueController {
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

      const company = queueService.createCompany(value!);

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