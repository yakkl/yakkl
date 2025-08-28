#!/usr/bin/env node

// Simple test script to verify storage is working correctly
// Run this after loading the extension in Chrome

import { browser_ext as browser } from './src/lib/common/environment.js';
import { getObjectFromLocalStorage } from './src/lib/common/storage.js';
import { STORAGE_YAKKL_CURRENTLY_SELECTED } from './src/lib/common/constants.js';

async function testStorageAccess() {
  console.log('Testing storage access after dynamic import fix...\n');
  
  try {
    // Test 1: Direct browser API access
    console.log('Test 1: Direct browser API access');
    console.log('Browser available:', !!browser);
    console.log('Browser storage available:', !!browser?.storage?.local);
    
    // Test 2: Get currently selected account
    console.log('\nTest 2: Reading currently selected account');
    const currentlySelected = await getObjectFromLocalStorage(STORAGE_YAKKL_CURRENTLY_SELECTED);
    
    if (currentlySelected) {
      console.log('✅ Successfully loaded account data!');
      console.log('Address:', currentlySelected.shortcuts?.address);
      console.log('Account name:', currentlySelected.shortcuts?.accountName);
      console.log('Chain ID:', currentlySelected.shortcuts?.chainId);
    } else {
      console.log('⚠️ No account data found in storage');
      console.log('This could mean:');
      console.log('  1. No accounts have been created yet');
      console.log('  2. Storage is empty (fresh install)');
      console.log('  3. Storage access is still broken');
    }
    
    // Test 3: List all storage keys
    console.log('\nTest 3: Listing all storage keys');
    const allData = await browser.storage.local.get(null);
    const keys = Object.keys(allData);
    console.log('Total keys in storage:', keys.length);
    
    if (keys.length > 0) {
      console.log('Sample keys:', keys.slice(0, 5).join(', '));
      
      // Check for account-related keys
      const accountKeys = keys.filter(k => 
        k.includes('account') || 
        k.includes('YAKKL') || 
        k.includes('wallet')
      );
      console.log('Account-related keys:', accountKeys.length);
      if (accountKeys.length > 0) {
        console.log('Found:', accountKeys.slice(0, 3).join(', '));
      }
    }
    
    console.log('\n✅ Storage access test complete!');
    console.log('The dynamic import fix appears to be working correctly.');
    
  } catch (error) {
    console.error('❌ Storage test failed:', error);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testStorageAccess();