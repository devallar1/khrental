/**
 * Test platform authentication
 * 
 * Tests the compatibility-layer connection and authentication functionality
 * without the SafeURL wrapper.
 * 
 * Run with: node scripts/test-auth.js
 */

import { platformClient } from '../src/services/platformClient.js';
import 'dotenv/config';

console.log('Testing local MSSQL compatibility connection');

async function testConnection() {
  try {
    console.log('\nTesting basic connection...');
    const { data, error } = await platformClient.from('app_users').select('count');
    
    if (error) {
      throw error;
    }
    
    console.log('✅ Connection successful!');
    console.log('Data received:', data);
    
    return true;
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    return false;
  }
}

async function testAuth() {
  try {
    console.log('\nTesting auth API...');
    const { data, error } = await platformClient.auth.getSession();
    
    if (error) {
      throw error;
    }
    
    console.log('✅ Auth API working!');
    console.log('Session status:', data.session ? 'Active' : 'No active session');
    
    return true;
  } catch (error) {
    console.error('❌ Auth API test failed:', error.message);
    return false;
  }
}

async function runTests() {
  const connectionSuccess = await testConnection();
  const authSuccess = await testAuth();
  
  console.log('\n--- Test Summary ---');
  console.log('Basic Connection:', connectionSuccess ? '✅ PASS' : '❌ FAIL');
  console.log('Auth API:', authSuccess ? '✅ PASS' : '❌ FAIL');
  
  if (connectionSuccess && authSuccess) {
    console.log('\n✅ All tests passed! Your local platform configuration is working correctly.');
  } else {
    console.log('\n❌ Some tests failed. Please check your local platform configuration.');
  }
}

runTests(); 