# Rules Command

Quick reference for YAKKL project development rules. Shows applicable rules for current context or specific topics.

## Usage
```
/rules [category|number]
```

## Examples
```
# Show all rule categories
/rules

# Show specific category
/rules security
/rules imports
/rules svelte

# Show specific rule
/rules 4
/rules 20
```

## Rule Categories

### 🛡️ Security Rules
- **Rule #4**: Security Context Isolation
  - Critical code in background context only
  - No sensitive operations in client/content/inpage
  
- **Rule #18**: Privacy in Logs
  - Always redact passwords, keys, JWTs, digests
  - Use redaction utilities before logging
  
- **Rule #19**: No Hardcoded Secrets
  - Use .env.mustache templates
  - Background: process.env.VAR
  - Client: import.meta.env.VAR

### 📦 Import Rules
- **Rule #5**: Background Context Imports
  ```typescript
  import browser from 'webextension-polyfill'; // Static
  ```
  
- **Rule #7**: Client Context Browser Imports
  - NEVER static import webextension-polyfill
  - Will break SSR
  
- **Rule #8**: Client Dynamic Imports
  ```typescript
  const browser = await import('webextension-polyfill');
  ```
  
- **Rule #9**: Import Strategy
  - Static imports preferred
  - Dynamic only for SSR conflicts

### 🎨 Svelte Rules
- **Rule #20**: Svelte-Specific Rules
  - 20.1: No Svelte stores in background
  - 20.2: Encrypt private data storage
  - 20.3: Use goto() not window.location
  - 20.4: Type imports OK, runtime not
  
- **Rule #22**: Modal Pattern
  ```svelte
  <Modal bind:show={showModal}>
    <div slot="header">Title</div>
    <div slot="body">Content</div>
    <div slot="footer">Actions</div>
  </Modal>
  ```

### 🔧 Development Rules
- **Rule #1**: File Change Limits
  - Max 10 files without approval
  
- **Rule #2**: Backup Creation
  - Backup if >5 changes to existing file
  - Format: file.ext.date.backup
  
- **Rule #3**: Code Reuse
  - Always search for existing code first
  - Never break backward compatibility
  
- **Rule #15**: Message Abstraction
  - Never use browser.runtime.send* directly
  - Create wrapper functions

### 💻 Code Quality Rules
- **Rule #11**: Naming Conventions
  - Follow existing patterns
  
- **Rule #12**: Type/Interface Reuse
  - Grep before creating new types
  - Never duplicate type names
  
- **Rule #13**: Code Readability
  - Simple over complex
  - Readable over compact
  
- **Rule #14**: Documentation
  - Comment all new code
  - Explain dependencies

### 🔌 Extension Rules
- **Rule #6**: Background Scope
  - Includes: background, content.ts
  - Excludes: inpage.ts
  
- **Rule #10**: Environment Variables
  - Background: process.env (Webpack)
  - Client: import.meta.env (Vite)
  
- **Rule #16**: Connection Resilience
  - Auto-reconnect for ports
  - Exponential backoff
  
- **Rule #17**: Error Handling
  - Intercept disconnect errors
  - Log as warnings

## Quick Decision Tree

```
Need to access browser API?
├─ In background context?
│  └─ Use static import (Rule #5)
├─ In client context?
│  ├─ Can use message passing?
│  │  └─ Use messages (Rule #15)
│  └─ Must use directly?
│     └─ Dynamic import (Rule #8)
└─ In content/inpage?
   └─ Check security (Rule #4)

Storing data?
├─ Public data?
│  └─ localStorage OK
├─ Private data?
│  └─ Must encrypt (Rule #20.2)
└─ In background?
   └─ Use extension storage

Creating component?
├─ Check existing (Rule #3)
├─ Use Modal pattern (Rule #22)
├─ Svelte 5 runes ($state, $props)
└─ No static browser imports (Rule #7)
```

## Common Violations to Avoid

❌ **console.log(privateKey)** → Rule #18
❌ **import browser from 'webextension-polyfill'** in .svelte → Rule #7
❌ **window.location.href = '/page'** → Rule #20.3
❌ **const apiKey = "sk-123"** → Rule #19
❌ **localStorage.setItem('privateKey', key)** → Rule #20.2

## Full Rules Reference

For complete rule details and examples, see:
`.claude/PROJECT_CONTEXT.md#development-rules`