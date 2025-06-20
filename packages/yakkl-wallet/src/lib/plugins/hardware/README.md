# Hardware Wallet Plugin System

This directory contains the hardware wallet integration plugins for YAKKL Smart Wallet.

## Architecture

The hardware wallet system follows the YAKKL plugin architecture pattern:

- **Interface**: `IHardwareWalletManager` defines the contract for all hardware wallet implementations
- **Standard Implementation**: `StandardHardwareWalletManager` provides basic features for free users
- **Pro Implementation**: `ProHardwareWalletManager` (future) will provide advanced features for pro users
- **Device-Specific Logic**: Ledger-specific implementation in `hardware/ledger/`

## Features by Plan

### Standard (Free) Features
- Connect one Ledger device
- Discover up to 3 accounts
- Basic transaction signing
- Personal message signing
- Address verification on device

### Pro Features
- Multiple hardware devices
- Discover up to 50 accounts per device
- Bulk transaction signing
- Custom derivation paths
- Extended public key export
- EIP-712 typed data signing

## Usage Example

```typescript
import { pluginRegistry } from '$lib/plugins/registry/PluginRegistry';

// Initialize the plugin registry
await pluginRegistry.initialize(PlanType.MEMBER);

// Check if hardware wallets are supported
const isSupported = await pluginRegistry.hardwareWallet.isSupported();
if (!isSupported) {
  console.log('Hardware wallets not supported in this browser');
  return;
}

// Connect to a Ledger device
try {
  const device = await pluginRegistry.hardwareWallet.connect();
  console.log('Connected to:', device.model);
  
  // Discover accounts
  const accounts = await pluginRegistry.hardwareWallet.discoverAccounts(device.id);
  console.log('Discovered accounts:', accounts);
  
  // Sign a transaction
  const transaction = {
    to: '0x742d35CC6635C0532925a3b8D0B8d9d4A3d5b2B4',
    value: '0x1BC16D674EC80000', // 0.2 ETH
    gasLimit: '0x5208',
    gasPrice: '0x09184e72a000',
    nonce: '0x0',
    chainId: 1
  };
  
  const signature = await pluginRegistry.hardwareWallet.signTransaction(
    device.id,
    accounts[0].derivationPath,
    transaction
  );
  
  console.log('Transaction signature:', signature);
  
} catch (error) {
  if (error instanceof UpgradeRequiredError) {
    console.log('Pro feature required:', error.message);
  } else {
    console.error('Hardware wallet error:', error.message);
  }
}
```

## Browser Support

### Supported Browsers
- **Chrome/Chromium**: Full support via WebHID and WebUSB
- **Edge**: Full support via WebHID and WebUSB

### Unsupported Browsers
- **Firefox**: No WebHID/WebUSB support
- **Safari**: No WebHID/WebUSB support
- **iOS browsers**: No USB APIs available

### Requirements
- **HTTPS**: Required for WebHID/WebUSB APIs
- **User Interaction**: Device connection must be initiated by user action (click)
- **Permissions**: Browser will prompt for device access permission

## Error Handling

The system includes comprehensive error handling for common scenarios:

```typescript
try {
  await pluginRegistry.hardwareWallet.connect();
} catch (error) {
  if (error instanceof DeviceNotConnectedError) {
    // Device was disconnected
  } else if (error instanceof UserRejectedError) {
    // User rejected the operation on device
  } else if (error instanceof WrongAppError) {
    // Wrong app open on device
  } else if (error instanceof UpgradeRequiredError) {
    // Pro feature required
  }
}
```

## Security Considerations

1. **Address Verification**: Always verify addresses on device screen for critical operations
2. **Transaction Review**: Users must review and approve all transactions on device
3. **No Private Key Exposure**: Private keys never leave the hardware device
4. **Secure Transport**: All communication uses secure transport protocols
5. **CSP Compliance**: All code is CSP-compliant for browser extension security

## Package Dependencies

The Ledger plugin requires these additional packages to be installed:

```json
{
  "@ledgerhq/hw-app-eth": "^6.45.4",
  "@ledgerhq/hw-transport-webhid": "^6.29.0",
  "@ledgerhq/hw-transport-webusb": "^6.29.0"
}
```

These are lazy-loaded only when hardware wallet functionality is accessed.