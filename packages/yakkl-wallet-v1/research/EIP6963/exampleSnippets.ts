Part 4: dApp Usage Examples

```typescript
// Example 1: Basic Provider Discovery
window.addEventListener('eip6963:announceProvider', (event) => {
  const { detail } = event;
  console.log('Found provider:', detail.info.name);

  // Store provider reference
  const provider = detail.provider;
});

// Example 2: Connect to Wallet
async function connectWallet() {
  try {
    const accounts = await provider.request({
      method: 'eth_requestAccounts'
    });
    console.log('Connected accounts:', accounts);
  } catch (error) {
    console.error('Failed to connect:', error);
  }
}

// Example 3: Send Transaction
async function sendTransaction() {
  try {
    const txHash = await provider.request({
      method: 'eth_sendTransaction',
      params: [{
        from: '0x...',
        to: '0x...',
        value: '0x...'
      }]
    });
    console.log('Transaction sent:', txHash);
  } catch (error) {
    console.error('Transaction failed:', error);
  }
}

// Example 4: Multiple Provider Handling
function handleMultipleProviders(event: EIP6963AnnounceProviderEvent) {
  const { info, provider } = event.detail;

  if (info.rdns === 'com.yakkl') {
    // Use Yakkl provider
    setupProvider(provider);
  }
}

// Example 5: Provider Events
function setupProviderEvents(provider: EIP1193Provider) {
  provider.on('accountsChanged', (accounts: string[]) => {
    console.log('Accounts changed:', accounts);
  });

  provider.on('chainChanged', (chainId: string) => {
    console.log('Chain changed:', chainId);
  });
}
