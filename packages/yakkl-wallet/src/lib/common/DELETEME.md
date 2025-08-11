The logic that checks isNative and calls eth_getBalance is in multiple places:

  1. /lib/common/tokens.ts (lines 30-31):
  if (token.isNative) {
      const balance = await provider.getBalance(userAddress);
  1. This directly calls the provider's getBalance method which internally calls eth_getBalance.
  2. /lib/utilities/balanceUtils.ts (lines 51-54):
  if (token.isNative) {
      if (!provider) return 0n;
      const retBal = await provider.getBalance(address);
  2. Same pattern - checks isNative and calls provider's getBalance.
  3. /lib/services/token.service.ts (lines 90-92):
  if (token.isNative && account && account.balance) {
      balance = parseFloat(account.balance);
  3. This checks if the token is native but uses the pre-fetched account balance instead of calling
  eth_getBalance.

  The actual eth_getBalance RPC call happens through:
  - provider.getBalance(address) which is an ethers.js method
  - This internally sends an eth_getBalance RPC request to the blockchain
  - The background script handles this in /contexts/background/extensions/chrome/eip-6963.ts which calls
  getCurrentlySelectedBalance
  - That function calls getBalance from legacy.ts which uses Alchemy RPC to fetch the balance

  So the flow is:
  1. Token has isNative: true property
  2. Code checks this property
  3. If true, calls provider.getBalance(address)
  4. Provider sends eth_getBalance RPC request
  5. Background script routes to Alchemy API
  6. Balance is returned and formatted from Wei to ETH





Based on my comprehensive review of the yakkl-wallet project, I've identified several areas where inappropriate browser API usage, fetching, and environment variable access occurs in the client context. Here's what I found:

## 🚨 **Browser API Usage Violations in Client Context**

The client context is using `browser_ext` directly instead of the proper client API wrappers. Here are the violations:

### **Runtime API Usage**:
```12:40:packages/yakkl-wallet/src/routes/+layout.ts
port = browser_ext.runtime.connect({ name: YAKKL_INTERNAL }) as RuntimePort;
```

```79:79:packages/yakkl-wallet/src/routes/(sidepanel)/sidepanel/sidepanel/+page.svelte
browser_ext.runtime.sendMessage({ type: 'popout' })
```

**Multiple runtime.sendMessage() calls** in:
- `src/routes/(dapp)/dapp/popups/sign/+page.svelte` (line 273)
- `src/routes/(dapp)/dapp/popups/transactions/+page.svelte` (line 220)
- `src/routes/(dapp)/dapp/popups/accounts/+page.svelte` (line 468)
- `src/routes/(dapp)/dapp/popups/wallet/+page.svelte` (line 151)
- Multiple component files under `src/lib/components/`

### **Tabs API Usage**:
```36:36:packages/yakkl-wallet/src/routes/(wallet)/legal/+page.svelte
browser_ext.tabs.create({ url: e.srcElement.href });
```

### **Notifications API Usage**:
```110:194:packages/yakkl-wallet/src/lib/components/SessionWarning.svelte
await browser_ext.notifications.clear('session-warning');
await browser_ext.notifications.create('session-warning', {...});
browser_ext.notifications.onClicked.addListener(handleNotificationClick);
```

### **Windows API Usage**:
```206:209:packages/yakkl-wallet/src/lib/components/SessionWarning.svelte
const currentWindow = await browser_ext.windows.getCurrent();
await browser_ext.windows.update(currentWindow.id, { focused: true });
```

### **Alarms API Usage**:
```198:281:packages/yakkl-wallet/src/routes/(splash)/popup/+page.svelte
browser_ext.alarms.create('yakkl-splash-alarm', { when: Date.now() + 2000 });
browser_ext.alarms.onAlarm.addListener((m: any) => {...});
```

## 🌐 **Fetch Usage in Client Context**

Found several fetch() calls in client context:

```61:77:packages/yakkl-wallet/src/lib/components/SessionWarning.svelte
const response = await fetch(soundData);
const response = await fetch(defaultData);
```

```86:86:packages/yakkl-wallet/src/lib/components/InAppNotification.svelte
const response = await fetch(soundData);
```

```44:44:packages/yakkl-wallet/src/lib/components/v1/Chatbot.svelte
await apiKeyFetch(...)
```

## 🔑 **VITE_ Environment Variables in Client Context**

Multiple VITE_ prefixed environment variables are being accessed in client context:

### **API Keys**:
```225:269:packages/yakkl-wallet/src/routes/(dapp)/dapp/popups/sign/+page.svelte
import.meta.env.VITE_ALCHEMY_API_KEY_PROD
```

```216:216:packages/yakkl-wallet/src/routes/(dapp)/dapp/popups/transactions/+page.svelte
import.meta.env.VITE_ALCHEMY_API_KEY_PROD
```

### **Configuration URLs**:
```1:6:packages/yakkl-wallet/src/lib/components/v1/TokenTechnicalView.svelte
const URL = import.meta.env.VITE_TRADING_VIEW_LINK;
```

```45:46:packages/yakkl-wallet/src/lib/components/v1/Chatbot.svelte
import.meta.env.VITE_GPT_API_KEY_BACKEND_URL
import.meta.env.VITE_GPT_API_KEY_BACKEND
```

### **Fee Recipients**:
```824:824:packages/yakkl-wallet/src/lib/components/v1/Swap.svelte
feeRecipient: import.meta.env.VITE_YAKKL_FEE_RECIPIENT || 'aifees.eth'
```

## ✅ **Proper Client API Structure**

I noticed you already have a proper client API structure in place:
- `src/contexts/client/api/` contains proper wrapper APIs
- These APIs use `BackgroundAPI` to communicate with the background script
- The APIs include: RuntimeAPI, StorageAPI, TabsAPI, WindowsAPI, NotificationsAPI, ActionAPI, AlarmsAPI, SidePanelAPI

## 📋 **Recommendations**

1. **Replace all `browser_ext` calls** in client context with the appropriate client API wrappers
2. **Move fetch operations** to the background context or use a proper proxy through the background API
3. **Remove VITE_ environment variable access** from client context - these should be handled in the background or passed through a secure communication channel
4. **Use the existing client API structure** consistently throughout the client codebase

The project has good architectural separation in place, but the implementation needs to be updated to respect these boundaries consistently.
