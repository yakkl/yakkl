# Runtime.lastError Best Practices

## Overview
The Chrome/Browser extension API requires explicit checking of `runtime.lastError` after certain operations. Failing to check this value results in "Unchecked runtime.lastError" warnings in the console.

## Why Chrome Cares About Unchecked runtime.lastError

1. **Silent Failures Prevention**: Without checking `runtime.lastError`, operations can fail silently, leading to hard-to-debug issues
2. **Developer Awareness**: Forces developers to handle error conditions explicitly
3. **Resource Cleanup**: Ensures proper cleanup when operations fail
4. **User Experience**: Helps maintain extension stability by catching issues early

## Common Scenarios That Trigger the Error

### 1. Back/Forward Cache (bfcache)
When a page is moved to the bfcache, active message channels are closed:
```
Unchecked runtime.lastError: The page keeping the extension port is moved into back/forward cache, so the message channel is closed.
```

### 2. Extension Context Invalidation
When the extension is reloaded or updated:
```
Unchecked runtime.lastError: Extension context invalidated.
```

### 3. Port Disconnection
When attempting to use a disconnected port:
```
Unchecked runtime.lastError: Attempting to use a disconnected port object
```

## Required Checks After These Operations

### Port Operations
```typescript
// ❌ BAD - No error checking
port.postMessage(data);
port.disconnect();

// ✅ GOOD - Proper error checking
port.postMessage(data);
if (browser.runtime.lastError) {
  console.log('Message failed:', browser.runtime.lastError.message);
}

port.disconnect();
if (browser.runtime.lastError) {
  console.log('Disconnect failed:', browser.runtime.lastError.message);
}
```

### Runtime Connections
```typescript
// ❌ BAD
const port = browser.runtime.connect({ name: 'my-port' });

// ✅ GOOD
const port = browser.runtime.connect({ name: 'my-port' });
if (browser.runtime.lastError) {
  console.log('Connection failed:', browser.runtime.lastError.message);
  // Handle connection failure
}
```

### Message Sending
```typescript
// ❌ BAD
browser.runtime.sendMessage({ type: 'hello' });

// ✅ GOOD - With async/await
try {
  await browser.runtime.sendMessage({ type: 'hello' });
  if (browser.runtime.lastError) {
    console.log('Send failed:', browser.runtime.lastError.message);
  }
} catch (error) {
  // Handle promise rejection
}
```

### Event Listeners
```typescript
// ✅ GOOD - Check in disconnect handlers
port.onDisconnect.addListener(() => {
  if (browser.runtime.lastError) {
    console.log('Disconnect reason:', browser.runtime.lastError.message);
  }
  // Clean up
});
```

## Using the Safe Port Utils

We've created utility functions in `$lib/common/port-utils.ts` that handle all the error checking:

```typescript
import { 
  safePortPostMessage, 
  safePortDisconnect, 
  safeRuntimeConnect,
  SafePort 
} from '$lib/common/port-utils';

// Safe posting
if (!safePortPostMessage(port, data)) {
  // Handle failure
}

// Safe disconnect
safePortDisconnect(port);

// Safe connection
const port = safeRuntimeConnect({ name: 'my-port' });
if (!port) {
  // Handle connection failure
}

// Or use the SafePort class
const safePort = new SafePort('my-port');
if (safePort.connect()) {
  safePort.onMessage(handleMessage);
  safePort.postMessage(data);
}
```

## Handling bfcache Scenarios

```typescript
// Listen for bfcache events
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    // Page restored from bfcache - reconnect
    reconnectPort();
  }
});

window.addEventListener('pagehide', (event) => {
  if (event.persisted) {
    // Page entering bfcache - prepare for suspension
    saveState();
  }
});
```

## Best Practices Summary

1. **Always check runtime.lastError** after port operations
2. **Use safe wrapper functions** to centralize error handling
3. **Handle bfcache events** for better user experience
4. **Log errors appropriately** - debug level for expected errors, warn for unexpected
5. **Implement reconnection logic** for critical connections
6. **Clean up resources** when connections fail
7. **Test with extension reloads** to ensure proper error handling

## Common Patterns

### Pattern 1: Resilient Port Connection
```typescript
class ResilientPort {
  private maxRetries = 3;
  private retryDelay = 1000;
  
  async connect() {
    for (let i = 0; i < this.maxRetries; i++) {
      const port = safeRuntimeConnect({ name: 'my-port' });
      if (port) return port;
      
      await new Promise(resolve => setTimeout(resolve, this.retryDelay));
    }
    throw new Error('Failed to connect after retries');
  }
}
```

### Pattern 2: Graceful Degradation
```typescript
function sendMessage(data: any) {
  if (!safePortPostMessage(port, data)) {
    // Try alternative communication method
    fallbackCommunication(data);
  }
}
```

### Pattern 3: State Preservation
```typescript
class StatefulConnection {
  private pendingMessages: any[] = [];
  
  sendMessage(data: any) {
    if (!this.isConnected) {
      this.pendingMessages.push(data);
      this.reconnect();
    } else if (!safePortPostMessage(this.port, data)) {
      this.pendingMessages.push(data);
      this.handleDisconnection();
    }
  }
  
  onReconnect() {
    // Flush pending messages
    while (this.pendingMessages.length > 0) {
      const msg = this.pendingMessages.shift();
      safePortPostMessage(this.port, msg);
    }
  }
}
```

## References
- [Chrome Extension Message Passing](https://developer.chrome.com/docs/extensions/mv3/messaging/)
- [Back/Forward Cache](https://web.dev/bfcache/)
- [Extension Context Invalidated](https://developer.chrome.com/docs/extensions/mv3/background_pages/#lifecycle)