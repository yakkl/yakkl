/**
 * Basic YAKKL SDK Usage Examples
 * 
 * This file demonstrates how to use the YAKKL SDK for common blockchain operations
 */

import { YakklSDK, GenericRPCProvider, BigNumber, EthereumBigNumber } from '../index';
import { CurrencyCode } from '../../common/bignumber';

/**
 * Example 1: Basic SDK initialization and usage
 */
export async function basicUsageExample() {
  console.log('=== Basic SDK Usage Example ===');
  
  // Initialize the SDK
  const sdk = new YakklSDK();
  await sdk.initialize({
    chainId: 1, // Ethereum mainnet
    features: ['providers', 'explorers']
  });

  // Get the current provider
  const provider = sdk.getProvider();
  if (provider) {
    console.log(`Connected to ${provider.name} on chain ${provider.chainId}`);
    
    // Get latest block number
    const blockNumber = await provider.getBlockNumber();
    console.log('Latest block number:', blockNumber);
    
    // Get ETH balance for Vitalik's address
    const vitalikAddress = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';
    const balance = await provider.getBalance(vitalikAddress);
    const ethBalance = EthereumBigNumber.fromWei(balance.toString(), 18);
    console.log(`Vitalik's ETH balance: ${ethBalance} ETH`);
    
    // Get current gas price
    const gasPrice = await provider.getGasPrice();
    const gasPriceGwei = Number(gasPrice) / 1e9;
    console.log(`Current gas price: ${gasPriceGwei} Gwei`);
  }

  // Cleanup
  await sdk.cleanup();
}

/**
 * Example 2: Transaction history fetching
 */
export async function transactionHistoryExample() {
  console.log('=== Transaction History Example ===');
  
  const sdk = new YakklSDK();
  await sdk.initialize({ chainId: 1 });

  const address = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'; // Vitalik
  
  try {
    // Get recent transaction history
    const history = await sdk.getTransactionHistory(address, {
      limit: 10,
      txType: 'all'
    });
    
    console.log(`Found ${history.transactions.length} transactions`);
    
    // Display first few transactions
    for (const tx of history.transactions.slice(0, 3)) {
      console.log(`TX: ${tx.hash}`);
      console.log(`  Block: ${tx.blockNumber}`);
      console.log(`  From: ${tx.from}`);
      console.log(`  To: ${tx.to}`);
      console.log(`  Value: ${EthereumBigNumber.fromWei(tx.value, 18)} ETH`);
      console.log(`  Gas Used: ${tx.gasUsed}`);
      console.log('---');
    }
    
    // Get token transfers
    const tokenTransfers = await sdk.getTokenTransfers(address, {
      limit: 5,
      tokenType: 'erc20'
    });
    
    console.log(`Found ${tokenTransfers.transfers.length} token transfers`);
    
  } catch (error) {
    console.error('Error fetching transaction history:', error);
  }

  await sdk.cleanup();
}

/**
 * Example 3: Using different providers
 */
export async function multiProviderExample() {
  console.log('=== Multi-Provider Example ===');
  
  const sdk = new YakklSDK();
  await sdk.initialize({ chainId: 1 });

  // Get provider by name (if available)
  const alchemyProvider = sdk.getProviderByName('alchemy');
  if (alchemyProvider) {
    console.log('Using Alchemy provider');
    const blockNumber = await alchemyProvider.getBlockNumber();
    console.log('Block number from Alchemy:', blockNumber);
  }

  // Create a custom RPC provider
  const llamaProvider = GenericRPCProvider.createLlamaRPCProvider(1);
  await llamaProvider.connect(1);
  
  console.log('Using LlamaRPC provider');
  const blockNumber = await llamaProvider.getBlockNumber();
  console.log('Block number from LlamaRPC:', blockNumber);
  
  // Test health check
  const health = await llamaProvider.healthCheck();
  console.log('LlamaRPC health:', health);

  await llamaProvider.disconnect();
  await sdk.cleanup();
}

/**
 * Example 4: BigNumber operations
 */
export async function bigNumberExample() {
  console.log('=== BigNumber Operations Example ===');
  
  // Basic BigNumber operations
  const amount1 = BigNumber.from('1000000000000000000'); // 1 ETH in wei
  const amount2 = BigNumber.from('500000000000000000');  // 0.5 ETH in wei
  
  const sum = amount1.add(amount2);
  console.log('1 ETH + 0.5 ETH =', EthereumBigNumber.fromWei(sum.toString(), 18), 'ETH');
  
  const product = amount1.mul(2);
  console.log('1 ETH * 2 =', EthereumBigNumber.fromWei(product.toString(), 18), 'ETH');
  
  // Ethereum-specific operations
  const ethAmount = EthereumBigNumber.fromEther('2.5');
  console.log('2.5 ETH in wei:', ethAmount.toWei().toString());
  
  // Price calculations
  const ethPriceUSD = 3000;
  const usdValue = EthereumBigNumber.toFiat(ethAmount.toWei().value, ethPriceUSD);
  console.log(`2.5 ETH at $${ethPriceUSD}/ETH = $${usdValue}`);
  
  // Formatted fiat display
  const formatted = EthereumBigNumber.toFormattedFiat(
    ethAmount.toWei().value,
    ethPriceUSD,
    CurrencyCode.USD,
    'en-US',
    2
  );
  console.log('Formatted:', formatted);
}

/**
 * Example 5: Chain switching
 */
export async function chainSwitchingExample() {
  console.log('=== Chain Switching Example ===');
  
  const sdk = new YakklSDK();
  await sdk.initialize({ chainId: 1 }); // Start with Ethereum
  
  console.log('Initial stats:', sdk.getStats());
  
  // Switch to Polygon
  console.log('Switching to Polygon...');
  await sdk.switchChain(137);
  
  const provider = sdk.getProvider();
  if (provider) {
    console.log(`Now connected to chain ${provider.chainId}`);
    const blockNumber = await provider.getBlockNumber();
    console.log('Polygon block number:', blockNumber);
  }
  
  // Switch to Base
  console.log('Switching to Base...');
  await sdk.switchChain(8453);
  
  const baseProvider = sdk.getProvider();
  if (baseProvider) {
    console.log(`Now connected to chain ${baseProvider.chainId}`);
    const blockNumber = await baseProvider.getBlockNumber();
    console.log('Base block number:', blockNumber);
  }
  
  console.log('Final stats:', sdk.getStats());
  await sdk.cleanup();
}

/**
 * Example 6: Health monitoring
 */
export async function healthMonitoringExample() {
  console.log('=== Health Monitoring Example ===');
  
  const sdk = new YakklSDK();
  await sdk.initialize({ chainId: 1 });
  
  // Check overall health
  const overallHealth = await sdk.healthCheck();
  console.log('Overall health:', JSON.stringify(overallHealth, null, 2));
  
  // Check individual provider health
  const provider = sdk.getProvider();
  if (provider) {
    const providerHealth = await provider.healthCheck();
    console.log(`${provider.name} health:`, providerHealth);
  }
  
  await sdk.cleanup();
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  const examples = [
    basicUsageExample,
    bigNumberExample, // This one doesn't require network calls
    // transactionHistoryExample, // Commented out to avoid rate limits in demo
    // multiProviderExample,
    // chainSwitchingExample,
    // healthMonitoringExample
  ];
  
  for (const example of examples) {
    try {
      await example();
      console.log('\n');
    } catch (error) {
      console.error(`Error in ${example.name}:`, error);
      console.log('\n');
    }
  }
}

// Export for use in other files
export default {
  basicUsageExample,
  transactionHistoryExample,
  multiProviderExample,
  bigNumberExample,
  chainSwitchingExample,
  healthMonitoringExample,
  runAllExamples
};