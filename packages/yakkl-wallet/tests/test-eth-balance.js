// Test script to check ETH balance fetch
// Run this in the browser console after the extension is loaded

async function testEthBalance() {
  console.log('Testing ETH balance fetch...');
  
  // Test 1: Direct message to get balance
  try {
    const response = await chrome.runtime.sendMessage({
      method: 'eth_getBalance',
      params: ['0x742d35Cc6634C0532925a3b844Bc9e7595f8fA69', 'latest'] // Example address
    });
    console.log('Direct eth_getBalance response:', response);
  } catch (error) {
    console.error('Direct eth_getBalance error:', error);
  }
  
  // Test 2: Get accounts
  try {
    const accountsResponse = await chrome.runtime.sendMessage({
      method: 'eth_accounts'
    });
    console.log('eth_accounts response:', accountsResponse);
    
    if (accountsResponse.data && accountsResponse.data.length > 0) {
      // Test balance for first account
      const firstAccount = accountsResponse.data[0];
      console.log('Testing balance for account:', firstAccount);
      
      const balanceResponse = await chrome.runtime.sendMessage({
        method: 'eth_getBalance',
        params: [firstAccount, 'latest']
      });
      console.log('Balance response for', firstAccount, ':', balanceResponse);
    }
  } catch (error) {
    console.error('Accounts/balance test error:', error);
  }
  
  // Test 3: Check if provider is available
  if (window.ethereum) {
    console.log('window.ethereum is available');
    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      console.log('window.ethereum accounts:', accounts);
      
      if (accounts.length > 0) {
        const balance = await window.ethereum.request({
          method: 'eth_getBalance',
          params: [accounts[0], 'latest']
        });
        console.log('window.ethereum balance (hex):', balance);
        console.log('window.ethereum balance (ETH):', parseInt(balance, 16) / 1e18);
      }
    } catch (error) {
      console.error('window.ethereum error:', error);
    }
  } else {
    console.log('window.ethereum not available');
  }
}

// Run the test
testEthBalance();