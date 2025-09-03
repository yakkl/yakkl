/**
 * Provider exports for @yakkl/blockchain
 */

// Types
export * from './types';

// Base provider
export { BaseProvider } from './base/BaseProvider';

// Network providers
export { AlchemyProvider } from './network/AlchemyProvider';

// Provider factory for creating providers
export class ProviderFactory {
  static create(type: string, config: any) {
    switch (type.toLowerCase()) {
      case 'alchemy':
        const { AlchemyProvider } = require('./network/AlchemyProvider');
        return new AlchemyProvider(config);
      // Add more providers as they are implemented
      // case 'infura':
      //   const { InfuraProvider } = require('./network/InfuraProvider');
      //   return new InfuraProvider(config);
      default:
        throw new Error(`Unknown provider type: ${type}`);
    }
  }
}