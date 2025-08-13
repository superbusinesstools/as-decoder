import Database from 'better-sqlite3';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const dbPath = path.join(process.cwd(), process.env.DB_PATH || 'crawler.db');
const db: Database.Database = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id TEXT UNIQUE NOT NULL,
      website_url TEXT NOT NULL,
      source_url TEXT NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'failed')),
      raw_data TEXT,
      processed_data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS process_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id TEXT NOT NULL,
      step TEXT NOT NULL CHECK(step IN ('received', 'crawling', 'ai_processing', 'crm_sending')),
      status TEXT NOT NULL CHECK(status IN ('started', 'completed', 'failed')),
      message TEXT,
      data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES companies(company_id)
    );

    CREATE INDEX IF NOT EXISTS idx_companies_company_id ON companies(company_id);
    CREATE INDEX IF NOT EXISTS idx_process_logs_company_id ON process_logs(company_id);
    CREATE INDEX IF NOT EXISTS idx_process_logs_step ON process_logs(step);

    CREATE TRIGGER IF NOT EXISTS update_companies_updated_at
    AFTER UPDATE ON companies
    BEGIN
      UPDATE companies SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;
  `);
}

export default db;