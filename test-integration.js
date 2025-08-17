#!/usr/bin/env node

/**
 * End-to-End Integration Test Script
 * Tests the complete flow from webhook to CRM update
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const AFTERNOON_COMPANY_ID = 'bd5bd080-d387-4662-9ddb-aa2ac85888c4';
const SERVER_URL = 'http://localhost:20080';

console.log('🧪 Starting Twenty CRM Integration Test\n');

// Test data payload
const testCompanyData = {
  company_id: AFTERNOON_COMPANY_ID,
  website_url: 'https://afternoonltd.com',
  source_url: 'https://afternoonltd.com' // We'll let it fall back to CRM lookup
};

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function makeRequest(url, method = 'GET', body = null) {
  const fetch = (await import('node-fetch')).default;
  
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    }
  };
  
  if (body) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(url, options);
  const data = await response.json();
  
  return { response, data };
}

async function testServerRunning() {
  console.log('1️⃣ Testing server connectivity...');
  try {
    const { response } = await makeRequest(`${SERVER_URL}/health`);
    if (response.ok) {
      console.log('✅ Server is running and responsive\n');
      return true;
    }
  } catch (error) {
    console.log('❌ Server is not running. Start with: npm start');
    console.log('   Error:', error.message);
    return false;
  }
}

async function testTwentyApiConnectivity() {
  console.log('2️⃣ Testing Twenty API connectivity...');
  try {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    if (!process.env.TWENTY_API_KEY) {
      console.log('❌ TWENTY_API_KEY is not set in environment');
      return false;
    }
    
    const { stdout, stderr } = await execAsync(`curl -s -H "Authorization: Bearer ${process.env.TWENTY_API_KEY}" -H "Content-Type: application/json" "https://20.afternoonltd.com/rest/companies/${AFTERNOON_COMPANY_ID}"`);
    
    if (stderr) {
      console.log('❌ curl error:', stderr);
      return false;
    }
    
    const result = JSON.parse(stdout);
    
    // Handle both single company response and companies array response
    let company = null;
    if (result.data?.company) {
      company = result.data.company;
    } else if (result.data?.companies && result.data.companies.length > 0) {
      company = result.data.companies[0];
    }
    
    if (company) {
      console.log('✅ Twenty API is accessible');
      console.log(`   Found company: ${company.name}`);
      console.log('');
      return true;
    } else {
      console.log('❌ Twenty API responded but no company found');
      console.log('   Response:', stdout.substring(0, 200) + '...');
      return false;
    }
  } catch (error) {
    console.log('❌ Twenty API connectivity test failed');
    console.log('   Make sure TWENTY_API_KEY is set in .env');
    console.log('   Error:', error.message);
    return false;
  }
}

async function testWebhookEndpoint() {
  console.log('3️⃣ Testing webhook endpoint...');
  try {
    const { response, data } = await makeRequest(`${SERVER_URL}/api/queue`, 'POST', testCompanyData);
    
    if (response.ok && data.success) {
      console.log('✅ Webhook endpoint accepted company data');
      console.log(`   Company queued with ID: ${data.data.company_id}`);
      console.log(`   Status: ${data.data.status}`);
      console.log('');
      return true;
    } else {
      console.log('❌ Webhook endpoint failed');
      console.log('   Response:', data);
      return false;
    }
  } catch (error) {
    console.log('❌ Webhook endpoint test failed');
    console.log('   Error:', error.message);
    return false;
  }
}

async function monitorProcessing() {
  console.log('4️⃣ Monitoring processing status...');
  
  let attempts = 0;
  const maxAttempts = 24; // 2 minutes with 5-second intervals
  
  while (attempts < maxAttempts) {
    try {
      const { response, data } = await makeRequest(`${SERVER_URL}/api/queue/${AFTERNOON_COMPANY_ID}`);
      
      if (response.ok && data.success) {
        const company = data.data.company;
        const logs = data.data.logs;
        
        console.log(`   📊 Status: ${company.status}, Step: ${company.current_step} (attempt ${attempts + 1}/${maxAttempts})`);
        
        // Show recent logs
        if (logs && logs.length > 0) {
          const recentLog = logs[logs.length - 1];
          console.log(`   📝 Latest: ${recentLog.step} - ${recentLog.status} - ${recentLog.message}`);
        }
        
        // Check if completed
        if (company.status === 'completed') {
          console.log('✅ Processing completed successfully!');
          console.log('');
          
          // Show all logs
          console.log('📋 Processing logs:');
          logs.forEach(log => {
            const emoji = log.status === 'completed' ? '✅' : 
                         log.status === 'failed' ? '❌' : '🔄';
            console.log(`   ${emoji} ${log.step}: ${log.message} (${log.created_at})`);
          });
          
          return true;
        }
        
        // Check if failed
        if (company.status === 'failed') {
          console.log('❌ Processing failed');
          console.log('');
          
          // Show failure logs
          console.log('📋 Failure logs:');
          logs.forEach(log => {
            if (log.status === 'failed') {
              console.log(`   ❌ ${log.step}: ${log.message}`);
            }
          });
          
          return false;
        }
        
      } else {
        console.log(`   ⚠️ Could not fetch status: ${data.message || 'Unknown error'}`);
      }
      
    } catch (error) {
      console.log(`   ⚠️ Error checking status: ${error.message}`);
    }
    
    attempts++;
    await sleep(5000); // Wait 5 seconds
  }
  
  console.log('⏰ Processing monitoring timed out');
  return false;
}

async function verifyTwentyUpdates() {
  console.log('5️⃣ Verifying Twenty CRM updates...');
  try {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    const { stdout } = await execAsync(`curl -s -H "Authorization: Bearer ${process.env.TWENTY_API_KEY}" -H "Content-Type: application/json" "https://20.afternoonltd.com/rest/companies/${AFTERNOON_COMPANY_ID}"`);
    
    const result = JSON.parse(stdout);
    
    // Handle both single company response and companies array response
    let company = null;
    if (result.data?.company) {
      company = result.data.company;
    } else if (result.data?.companies && result.data.companies.length > 0) {
      company = result.data.companies[0];
    }
    
    if (company) {
      
      console.log('✅ Company data updated in Twenty CRM:');
      console.log(`   Name: ${company.name}`);
      console.log(`   Industry: ${company.industry || 'Not set'}`);
      console.log(`   Employees: ${company.employees || 'Not set'}`);
      console.log(`   Headquarters: ${company.headquarters || 'Not set'}`);
      console.log(`   Overview: ${company.overview ? company.overview.substring(0, 100) + '...' : 'Not set'}`);
      
      // Check for new fields
      if (company.qualitySignals) {
        console.log(`   Quality Signals: ${company.qualitySignals.length} items`);
      }
      if (company.growthSignals) {
        console.log(`   Growth Signals: ${company.growthSignals.length} items`);
      }
      
      console.log('');
      return true;
    }
  } catch (error) {
    console.log('❌ Could not verify Twenty CRM updates');
    console.log('   Error:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🔧 Prerequisites:');
  console.log('   • Server should be running (npm start)');
  console.log('   • TWENTY_API_KEY should be set in .env');
  console.log('   • Claude AI API key should be configured\n');
  
  const tests = [
    testServerRunning,
    testTwentyApiConnectivity,
    testWebhookEndpoint,
    monitorProcessing,
    verifyTwentyUpdates
  ];
  
  let allPassed = true;
  
  for (const test of tests) {
    const result = await test();
    if (!result) {
      allPassed = false;
      break;
    }
  }
  
  console.log('\n🏁 Test Results:');
  if (allPassed) {
    console.log('✅ All tests passed! Twenty CRM integration is working correctly.');
  } else {
    console.log('❌ Some tests failed. Check the output above for details.');
    process.exit(1);
  }
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('Usage: node test-integration.js [options]');
  console.log('');
  console.log('Options:');
  console.log('  --help, -h    Show this help message');
  console.log('');
  console.log('Environment variables required:');
  console.log('  TWENTY_API_KEY    Twenty CRM API key');
  console.log('');
  console.log('This script tests the complete webhook -> queue -> AI -> CRM flow.');
  process.exit(0);
}

// Run the tests
runTests().catch(console.error);