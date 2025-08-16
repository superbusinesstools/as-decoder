import request from 'supertest';
import app from '../../src/server';
import db from '../../src/db';
import { initializeDatabase } from '../../src/db';
import fs from 'fs';
import path from 'path';

describe('Queue API', () => {
  beforeAll(() => {
    initializeDatabase();
  });

  beforeEach(() => {
    db.exec('DELETE FROM process_logs');
    db.exec('DELETE FROM companies');
  });

  afterAll(() => {
    db.close();
    const dbPath = path.join(process.cwd(), 'crawler.db');
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
  });

  describe('POST /api/queue', () => {
    it('should successfully queue a company with valid data', async () => {
      const companyData = {
        company_id: 'test-company-001',
        website_url: 'https://example.com',
        source_url: 'https://source.example.com'
      };

      const response = await request(app)
        .post('/api/queue')
        .send(companyData)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Company queued successfully',
        data: {
          company_id: 'test-company-001',
          status: 'pending'
        }
      });

      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.created_at).toBeDefined();

      const logs = db.prepare('SELECT * FROM process_logs WHERE company_id = ?')
        .all(companyData.company_id);
      
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        company_id: 'test-company-001',
        step: 'received',
        status: 'completed',
        message: 'Company queued successfully'
      });
    });

    it('should return 400 for missing company_id', async () => {
      const response = await request(app)
        .post('/api/queue')
        .send({
          website_url: 'https://example.com',
          source_url: 'https://source.example.com'
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Validation error'
      });
      expect(response.body.details).toContain('company_id is required');
    });

    it('should return 400 for missing website_url', async () => {
      const response = await request(app)
        .post('/api/queue')
        .send({
          company_id: 'test-company',
          source_url: 'https://source.example.com'
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Validation error'
      });
      expect(response.body.details).toContain('website_url is required');
    });

    it('should successfully queue a company without source_url (fallback to website_url)', async () => {
      const response = await request(app)
        .post('/api/queue')
        .send({
          company_id: 'test-company',
          website_url: 'https://example.com'
        })
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Company queued successfully',
        data: {
          company_id: 'test-company',
          status: 'pending'
        }
      });
    });

    it('should return 400 for invalid website_url', async () => {
      const response = await request(app)
        .post('/api/queue')
        .send({
          company_id: 'test-company',
          website_url: 'not-a-url',
          source_url: 'https://source.example.com'
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Validation error'
      });
      expect(response.body.details).toContain('must be a valid uri');
    });

    it('should return 400 for invalid source_url', async () => {
      const response = await request(app)
        .post('/api/queue')
        .send({
          company_id: 'test-company',
          website_url: 'https://example.com',
          source_url: 'invalid-url'
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Validation error'
      });
      expect(response.body.details).toContain('must be a valid uri');
    });

    it('should return 409 for duplicate company_id', async () => {
      const companyData = {
        company_id: 'duplicate-company',
        website_url: 'https://example.com',
        source_url: 'https://source.example.com'
      };

      await request(app)
        .post('/api/queue')
        .send(companyData)
        .expect(201);

      const response = await request(app)
        .post('/api/queue')
        .send(companyData)
        .expect(409);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Conflict',
        message: 'Company with ID duplicate-company already exists'
      });
    });

    it('should handle multiple validation errors', async () => {
      const response = await request(app)
        .post('/api/queue')
        .send({
          company_id: '',
          website_url: 'not-a-url',
          source_url: 'also-not-a-url'
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Validation error'
      });
      expect(response.body.details).toContain('company_id is required');
      expect(response.body.details).toContain('must be a valid uri');
    });

    it('should strip unknown fields from request', async () => {
      const response = await request(app)
        .post('/api/queue')
        .send({
          company_id: 'test-company',
          website_url: 'https://example.com',
          source_url: 'https://source.example.com',
          unknown_field: 'should be ignored',
          another_field: 123
        })
        .expect(201);

      expect(response.body.success).toBe(true);

      const company = db.prepare('SELECT * FROM companies WHERE company_id = ?')
        .get('test-company') as any;
      
      expect(company.unknown_field).toBeUndefined();
      expect(company.another_field).toBeUndefined();
    });

    it('should trim whitespace from input fields', async () => {
      const response = await request(app)
        .post('/api/queue')
        .send({
          company_id: '  test-company-trim  ',
          website_url: '  https://example.com  ',
          source_url: '  https://source.example.com  '
        })
        .expect(201);

      expect(response.body.data.company_id).toBe('test-company-trim');

      const company = db.prepare('SELECT * FROM companies WHERE company_id = ?')
        .get('test-company-trim') as any;
      
      expect(company.website_url).toBe('https://example.com');
      expect(company.source_url).toBe('https://source.example.com');
    });
  });

  describe('GET /api/queue/:company_id', () => {
    it('should return company status and logs', async () => {
      const companyData = {
        company_id: 'test-status-company',
        website_url: 'https://example.com',
        source_url: 'https://source.example.com'
      };

      await request(app)
        .post('/api/queue')
        .send(companyData)
        .expect(201);

      db.prepare(`
        INSERT INTO process_logs (company_id, step, status, message)
        VALUES (?, ?, ?, ?)
      `).run('test-status-company', 'crawling', 'started', 'Starting web crawl');

      const response = await request(app)
        .get('/api/queue/test-status-company')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          company: {
            company_id: 'test-status-company',
            website_url: 'https://example.com',
            source_url: 'https://source.example.com',
            status: 'pending'
          },
          logs: expect.arrayContaining([
            expect.objectContaining({
              company_id: 'test-status-company',
              step: 'crawling',
              status: 'started'
            }),
            expect.objectContaining({
              company_id: 'test-status-company',
              step: 'received',
              status: 'completed'
            })
          ])
        }
      });

      expect(response.body.data.logs).toHaveLength(2);
    });

    it('should return 404 for non-existent company', async () => {
      const response = await request(app)
        .get('/api/queue/non-existent-company')
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Not found',
        message: 'Company with ID non-existent-company not found'
      });
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
    });
  });
});