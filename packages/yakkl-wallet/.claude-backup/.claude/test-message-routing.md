# Message Routing Test Plan

## What was fixed:

1. **TokenComponentList.svelte** - Changed from sending `{ action: 'getTokenData' }` to `{ type: 'INTERNAL_TOKEN_REQUEST', action: 'getTokenData' }`
2. **unifiedMessageListener.ts** - Added handler for internal wallet messages that checks sender ID to ensure it's from our extension

## How to test:

1. Open the extension in Chrome
2. Click on the sidepanel icon
3. Click "Open Smart Wallet" button
4. The wallet should open normally (not the dapp popup)
5. Check console logs for any `eth_*` messages - there should be none from internal components
6. Token list should load without triggering dapp popups

## Key principle enforced:
- Internal wallet components NEVER send `eth_*` or other Web3 RPC messages
- Those are reserved for external dapps communicating with the wallet
- Internal components use clear message types like `INTERNAL_TOKEN_REQUEST`