import db from '../db';
import { Company, CompanyQueueRequest, ProcessLog } from '../types';

export class QueueService {
  createCompany(data: CompanyQueueRequest): Company {
    const insertCompany = db.prepare(`
      INSERT INTO companies (company_id, website_url, source_url, current_step)
      VALUES (@company_id, @website_url, @source_url, 'pending')
    `);

    const insertLog = db.prepare(`
      INSERT INTO process_logs (company_id, step, status, message)
      VALUES (@company_id, @step, @status, @message)
    `);

    const getCompany = db.prepare(`
      SELECT * FROM companies WHERE company_id = @company_id
    `);

    const transaction = db.transaction(() => {
      insertCompany.run(data);
      
      insertLog.run({
        company_id: data.company_id,
        step: 'received',
        status: 'completed',
        message: 'Company queued successfully'
      });

      return getCompany.get({ company_id: data.company_id }) as Company;
    });

    try {
      return transaction();
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        throw new Error(`Company with ID ${data.company_id} already exists`);
      }
      throw error;
    }
  }

  getCompanyById(companyId: string): Company | undefined {
    const stmt = db.prepare('SELECT * FROM companies WHERE company_id = ?');
    return stmt.get(companyId) as Company | undefined;
  }

  getCompanyLogs(companyId: string): ProcessLog[] {
    const stmt = db.prepare(`
      SELECT * FROM process_logs 
      WHERE company_id = ? 
      ORDER BY created_at DESC
    `);
    return stmt.all(companyId) as ProcessLog[];
  }

  updateCompanyStatus(companyId: string, status: Company['status']): void {
    const stmt = db.prepare(`
      UPDATE companies 
      SET status = ? 
      WHERE company_id = ?
    `);
    stmt.run(status, companyId);
  }

  addProcessLog(log: Omit<ProcessLog, 'id' | 'created_at'>): ProcessLog {
    const stmt = db.prepare(`
      INSERT INTO process_logs (company_id, step, status, message, data)
      VALUES (@company_id, @step, @status, @message, @data)
    `);

    const logData = {
      company_id: log.company_id,
      step: log.step,
      status: log.status,
      message: log.message || null,
      data: log.data || null
    };

    const info = stmt.run(logData);
    
    const getLog = db.prepare('SELECT * FROM process_logs WHERE id = ?');
    return getLog.get(info.lastInsertRowid) as ProcessLog;
  }

  getRecentCompanies(limit: number = 10): Company[] {
    const stmt = db.prepare(`
      SELECT * FROM companies 
      ORDER BY created_at DESC 
      LIMIT ?
    `);
    return stmt.all(limit) as Company[];
  }
}

export default new QueueService();