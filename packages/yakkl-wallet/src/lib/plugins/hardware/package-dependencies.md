# Required Package Dependencies for Ledger Integration

Add these dependencies to your package.json:

```json
{
  "dependencies": {
    "@ledgerhq/hw-app-eth": "^6.45.4",
    "@ledgerhq/hw-transport-webhid": "^6.29.0",
    "@ledgerhq/hw-transport-webusb": "^6.29.0"
  },
  "devDependencies": {
    "@types/ledgerhq__hw-transport": "^4.21.8"
  }
}
```

## Installation Command

```bash
pnpm add @ledgerhq/hw-app-eth @ledgerhq/hw-transport-webhid @ledgerhq/hw-transport-webusb
pnpm add -D @types/ledgerhq__hw-transport
```

## Import Notes

- These packages are dynamically imported only when hardware wallet features are used
- This keeps the main bundle size small for users who don't use hardware wallets
- The imports are cached after first use for performance

## Bundle Size Impact

- **@ledgerhq/hw-app-eth**: ~50KB
- **@ledgerhq/hw-transport-webhid**: ~15KB  
- **@ledgerhq/hw-transport-webusb**: ~15KB
- **Total**: ~80KB (only loaded when needed)

## Browser Compatibility

These packages require:
- Chrome/Chromium 89+ for WebHID
- Chrome/Chromium 61+ for WebUSB (fallback)
- HTTPS context for security APIs