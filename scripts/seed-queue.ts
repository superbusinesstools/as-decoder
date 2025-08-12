import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const PORT = process.env.PORT || 20080;
const BASE_URL = `http://localhost:${PORT}`;

// Predetermined test data
const testCompanies = [
  {
    company_id: 'acme-corp-001',
    website_url: 'https://www.acme-corp.com',
    source_url: 'https://www.linkedin.com/company/acme-corp'
  },
  {
    company_id: 'techstart-002',
    website_url: 'https://www.techstart.io',
    source_url: 'https://www.crunchbase.com/organization/techstart'
  },
  {
    company_id: 'globalsoft-003',
    website_url: 'https://www.globalsoft.net',
    source_url: 'https://www.glassdoor.com/Overview/globalsoft'
  }
];

async function sendToQueue(company: typeof testCompanies[0]) {
  try {
    const response = await fetch(`${BASE_URL}/api/queue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(company)
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log(`✅ Successfully queued: ${company.company_id}`);
      console.log(`   Status: ${data.data.status}`);
      console.log(`   ID: ${data.data.id}`);
    } else {
      console.error(`❌ Failed to queue ${company.company_id}:`);
      console.error(`   Status: ${response.status}`);
      console.error(`   Error: ${data.error || data.message}`);
    }
    
    return data;
  } catch (error) {
    console.error(`❌ Failed to connect to server for ${company.company_id}:`);
    console.error(`   ${error}`);
    console.error(`   Make sure the server is running on port ${PORT}`);
    return null;
  }
}

async function main() {
  console.log(`🚀 Sending test companies to queue endpoint at ${BASE_URL}/api/queue\n`);
  
  for (const company of testCompanies) {
    console.log(`Processing: ${company.company_id}`);
    console.log(`  Website: ${company.website_url}`);
    console.log(`  Source: ${company.source_url}`);
    
    await sendToQueue(company);
    console.log('---');
  }
  
  console.log('\n✨ All companies have been processed!');
  console.log(`📊 Check status at: ${BASE_URL}/api/queue/{company_id}`);
  console.log('\nExample status check commands:');
  testCompanies.forEach(company => {
    console.log(`  curl ${BASE_URL}/api/queue/${company.company_id}`);
  });
}

// Run the script
main().catch(console.error);