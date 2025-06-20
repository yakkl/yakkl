// Ledger account discovery logic

import type { HardwareAccount, DiscoveryOptions } from '../common/HardwareWalletTypes';
import { LedgerEthereumApp } from './LedgerEthereumApp';
import { formatDerivationPath, type LedgerDerivationPath } from './types';

export class LedgerAccountDiscovery {
  private ethApp: LedgerEthereumApp;
  
  constructor(ethApp: LedgerEthereumApp) {
    this.ethApp = ethApp;
  }
  
  async discoverAccounts(
    deviceId: string,
    options: DiscoveryOptions = {}
  ): Promise<HardwareAccount[]> {
    const {
      startIndex = 0,
      count = 5,
      showOnDevice = false
    } = options;
    
    const accounts: HardwareAccount[] = [];
    const basePath: LedgerDerivationPath = {
      purpose: 44,
      coinType: 60,
      account: 0,
      change: 0,
      index: 0
    };
    
    // Discover accounts in parallel for better performance
    const promises: Promise<HardwareAccount>[] = [];
    
    for (let i = startIndex; i < startIndex + count; i++) {
      const path = formatDerivationPath({
        ...basePath,
        index: i
      });
      
      promises.push(
        this.ethApp.getAddress(deviceId, path, showOnDevice)
      );
    }
    
    try {
      const results = await Promise.all(promises);
      accounts.push(...results);
    } catch (error) {
      // If parallel discovery fails, try sequential
      console.warn('Parallel discovery failed, trying sequential:', error);
      
      for (let i = startIndex; i < startIndex + count; i++) {
        try {
          const path = formatDerivationPath({
            ...basePath,
            index: i
          });
          
          const account = await this.ethApp.getAddress(deviceId, path, showOnDevice);
          accounts.push(account);
        } catch (err) {
          // Stop discovery on error
          console.error(`Failed to discover account at index ${i}:`, err);
          break;
        }
      }
    }
    
    return accounts;
  }
  
  async discoverLedgerLiveAccounts(
    deviceId: string,
    options: DiscoveryOptions = {}
  ): Promise<HardwareAccount[]> {
    const {
      startIndex = 0,
      count = 5,
      showOnDevice = false
    } = options;
    
    const accounts: HardwareAccount[] = [];
    
    // Ledger Live uses a different derivation path scheme
    // m/44'/60'/x'/0/0 where x is the account index
    for (let i = startIndex; i < startIndex + count; i++) {
      const path = `m/44'/60'/${i}'/0/0`;
      
      try {
        const account = await this.ethApp.getAddress(deviceId, path, showOnDevice);
        accounts.push(account);
      } catch (error) {
        // Stop discovery on error
        console.error(`Failed to discover Ledger Live account at index ${i}:`, error);
        break;
      }
    }
    
    return accounts;
  }
  
  async getCustomAccount(
    deviceId: string,
    derivationPath: string,
    verify: boolean = true
  ): Promise<HardwareAccount> {
    // Validate the derivation path format
    const pathRegex = /^m\/\d+'?\/\d+'?\/\d+'?\/\d+\/\d+$/;
    if (!pathRegex.test(derivationPath)) {
      throw new Error('Invalid derivation path format. Expected format: m/44\'/60\'/0\'/0/0');
    }
    
    return await this.ethApp.getAddress(deviceId, derivationPath, verify);
  }
}