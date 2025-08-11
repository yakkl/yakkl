# PROJECT_CONTEXT

This document contains the authoritative project context, architecture, and development rules for the YAKKL Smart Wallet v2 project. This should be referenced by all agents and development work.

## Base Context (Always Read First)

**Build Environment**: Building a portable browser extension with some chrome specific exceptions
**Project**: YAKKL Smart Wallet v2 - Browser extension for crypto/digital assets
**Previous**: v1 located at /yakkl/packages/yakkl-wallet-v1 (MVP)
**v1**: If you see .v1.* or -v1.* in addition to yakkl-wallet-v1 they are only there as reference only. Do not modify. If you are confused or question something then create a new file or directory
**upgrade**: You may run across references to migration... or migration plan for user. We do not need a migration plan since this will be a full on replacement or override of existing data as of this moment in time. Leave anything you find related to migrate but do not create or plan on it
**Goal**: Production-ready v2 of YAKKL Smart Wallet with enterprise-grade security and new UX

## Technical Environment

- **Language**: TypeScript (strict mode)
- **UI**: Svelte 5+ (runes: $state, $props, $effect)
- **Framework**: SvelteKit 2+
- **Styling**: Tailwind CSS
- **APIs**: MDN "browser.*" extension APIs (Chrome APIs only for sidepanel). Background context only. Do not use chrome.* APIs except where there is no alternative in browser.* APIs such as sidepanel
- **.tmp**: Anything with *.tmp suffix is not being tracked by git and do not touch it
- **Target**: Manifest V3, Cross-browser (Chrome, Firefox, Edge, Brave). This includes a Market Insight sidepanel and a popup smart wallet. Market Insight sidepanel is open to everyone with no login (except for upgrades or other specific features that require it). YAKKL Smart Wallet popup must be secure at ALL times!

## Core Principles

1. **Security First**: Hardware wallet level security in software
2. **Always Available**: Multi-provider failover, no downtime (Alchemy, Infura, Quicknode, ...)
3. **User Experience**: Simple, elegant, forgiving
4. **Extensible**: SDK for developers, plugin system (modules)

## Project Organization

### 1. Root Structure
- **Location**: `/Users/hansjones/projects/lambdastack/yakkl/crypto/yakkl`
- **Type**: Monorepo using pnpm workspaces

### 2. Packages (Monorepo Projects)

#### Public Repositories:
1. **yakkl-ai** - AI/ML services
2. **yakkl-contracts** - Smart contracts (Foundry)
3. **yakkl-core** - Core utilities (currently unused)
4. **yakkl-sdk** - Developer SDK
5. **yakkl-ui** - Shared UI components
6. **yakkl-uniswap-alpha-router-service** - Uniswap integration
7. **yakkl-wallet** - Main wallet (this project)
8. **yakkl-wallet-v1** - Version 1 snapshot (reference only)
9. **yakkl-mcp** - MCP Servers (one may be the wallet service - MCP Wallet-as-a-Service)

#### Private Repositories:
9. **yakkl-ai-private** - Private AI features
10. **yakkl-backend** - Backend services
11. **yakkl-security** - Security modules
12. **yakkl-wallet-private** - Private wallet features
13. **yakkl-wallet-pro** - Pro features

### 3. Wallet Route Organization

Located in `yakkl-wallet/src/routes/`:

1. **(dapp)** - All dapp specific code in route ($lib/ includes other code)
2. **(sidepanel)** - Sidepanel (unique to chrome - currently the starting point of yakkl from manifest)
3. **(splash)** - Popups that can show before loading anything else if needed - was used early on but not at the moment
4. **(test)** - Test registration routes
5. **(upgrade)** - Not currently used
6. **(wallet)** - Main wallet code base

### 4. Source Structure (`src/`)

1. **config** - Configuration files (verify current usage)
2. **contexts** - Context-specific code organization
3. **data** - Static data
4. **examples** - Code examples (not currently used)
5. **mocks** - Mock data for UI development
6. **lib** - Standard Svelte lib directory
7. **routes** - SvelteKit routes
8. **hooks.client.ts** - Client-side initialization
9. Standard files: `app.css`, `.d.ts`, etc.

### 5. Routes Structure

#### Root Routes:
- `+error.svelte` - Error page
- `+layout.svelte` - Primary layout driver
- `+layout.ts` - Layout TypeScript support

#### (dapp) Routes:
- dApp-related functionality only
- Triggered by EVM dApps via EIPs
- **DO NOT MODIFY** without explicit permission

#### (sidepanel) Routes:
- Main entry point for browser extension
- Referenced in manifest
- Open access by default (no login required)
- Exceptions clearly marked

#### (wallet) Routes:
- **CRITICAL**: Main popup smart wallet
- `+page.svelte` - Dynamic router based on settings/status
- `+layout.svelte` - Default layout
- `+layout.ts` - **IMPORTANT**: Enables prerendering (required)
- `/home` - Main dashboard
- `/legal` - Terms acceptance (first install)
- `/register` - User setup (after legal acceptance)
- `/login` - Dynamic routing target when locked

## Development Rules

### Rule 0: Compilation Must Succeed
**ABSOLUTE REQUIREMENT**: No task is complete until `pnpm run dev:wallet` runs with zero errors from the root directory. This is non-negotiable.

### Rule .5: We build for multi-chain
- Do not name properties or variables with something `eth<whatever>` but keep it more generic but relatable to its purpose

### Rule 1: File Change Limits
Do not make changes to more than 10 source code files without prompting and explaining:
- Files to be altered
- Full paths
- Reason for changes

### Rule 2: Backup Creation
For files with >5 changes (except new functions/classes):
- Create backup: `<filename>.<extension>.<date>.backup`
- Make backup BEFORE any changes

### Rule 3: Code Reuse
1. ALWAYS search for existing functions/classes first
2. Check for similar functionality to extend
3. Modify existing code only if backward compatible
4. NEVER break existing functionality
5. Create new files for new utilities when possible
6. Group changes in similar areas when modifying existing files

### Rule 4: Security Context Isolation
- Critical code (keys, APIs, hashes, digests) ONLY in background context
- Never expose sensitive data to client/content/inpage contexts
- Validate all security-critical operations

### Rule 5: Background Context Imports
```typescript
// Static import at file top
import browser from 'webextension-polyfill';
// Use browser.* for all extension APIs
```

### Rule 6: Background Context Scope
- Includes: background scripts, content.ts
- Excludes: inpage.ts

### Rule 7: Client Context Browser Imports
- NEVER use static `import browser from 'webextension-polyfill'`
- Will cause Svelte SSR build failures

### Rule 8: (old and some files still do it) Client Context Dynamic Imports
```typescript
// Only for browser.* API usage
const browser = await import('webextension-polyfill');
// Use sparingly - prefer message passing
```
### Rule 8.5: (new) Use the browserAPI methodology
- All actual browser.* API access is done in background context
- Client context uses browserAPI interface and passes what service it wants to execute
- This sends a message to a listener in the background context and whatever command is sent it does via actual browser.* APIs
- Background contexts do not use the browserAPI method but uses the standard browser.* APIs directly

### Rule 9: Import Strategy
- Prefer static imports for non-conflicting modules
- NEVER use dynamic imports UNLESS for SSR conflicts or some other conflict where this is the only way around it
- Resolve issues at compile time when possible

### Rule 10: Environment Variables
- NEVER alter .env, .env.mustache, or any .env like file. Let me know what I should change there and I will do it so I know what is happening
- Client context: `import.meta.env.VARIABLE_NAME` (Vite)
- Background context: `process.env.VARIABLE_NAME` (Webpack)
- NEVER expose private data in inpage.ts or anywhere the user can see
- If a environment variable is to be used in the background context it must use `process.env.<variable>` and if used in the client context use `import.meta.env.<variable>`. Add a condition like the following if needed:
```typescript
if (typeof window === 'undefined') {
  return process.env.<whatever>;
} else {
  return import.meta.env.<whatever>;
}
```

### Rule 11: Naming Conventions
- Examine existing code patterns
- Follow established naming conventions
- Maintain consistency across codebase

### Rule 12: Type/Interface Reuse
1. `grep` for existing types/interfaces before creating
2. Use existing types when possible
3. Extend existing types if needed
4. Use slightly different names to avoid confusion
5. NEVER duplicate type names across files

### Rule 13: Code Readability
- Prioritize readability over complexity
- Simple and efficient over compact and cryptic
- Easy to debug and maintain
- Suitable for all developer levels

### Rule 14: Code Documentation
- Comment ALL new code
- Explain what it does
- Document dependencies
- Include usage examples for complex functions

### Rule 15: Message Abstraction
- These should already be done for most everything but if not then:
- NEVER use `browser.runtime.send*` directly
- Create abstracted wrapper functions
- Centralize all messaging abstractions
- Enable single-point modifications

### Rule 16: Connection Resilience
- Implement automatic reconnection for port connections
- Handle disconnections gracefully
- Retry with exponential backoff

### Rule 17: Error Handling
- Intercept disconnect errors
- Log as warnings, not errors
- Mute expected disconnection messages

### Rule 18: Privacy in Logs
- ALWAYS redact sensitive data:
  - Passwords
  - Private keys
  - API keys
  - JWTs
  - Digests
  - etc
- Use redaction utilities before logging

### Rule 19: No Hardcoded Secrets
- Use `.env.mustache` for templates
- Background context accesses via env vars
- Never commit actual secrets
- Validate env setup in CI/CD

### Rule 20: Svelte-Specific Rules

#### 20.05: Static files
- Browser extension require statically created html files
- Do not create SPA related files

#### 20.1: Store Access
- Background context CANNOT access Svelte stores
- Use extension storage APIs for persistence ONLY on data that is not sensitive
- In background context files (where a given listener is that you need to use) create a variable to hold the sensitive value in memory in the background service worker namespace. If the value is needed then a port connection from the client side can send a secure message to retrieve the data and then after use, immediately clear the client side data (var) holding the sensitive value
- Another great option is - Session storage is visible - encrypt if private

#### 20.2: Private Data Storage
- Verify encryption before storing private data
- Use secure storage wrappers
- Validate decryption on retrieval

#### 20.3: Routing
- NEVER use `window.location.href` for navigation
- Use Svelte's `goto` function
- The `goto` maintains the svelte stores which the project uses extensively

#### 20.4: (old - follow new pattern) Type Imports
- OK to `import type` from webextension-polyfill
- Do NOT import runtime code from webextension-polyfill

### Rule 21: Extension Context
- Never mention AI, Claude, or Claude Code
- Maintain professional documentation
- Focus on functionality

### Rule 22: Modal/Dialog Pattern
Use the established Modal component pattern:

```typescript
<script lang="ts">
  import Modal from '$lib/components/Modal.svelte';

  let showNewComponent = $state(false);
</script>

<Modal bind:show={showNewComponent}>
  <div slot="header">Title</div>
  <div slot="body">Content</div>
  <div slot="footer">
    <button on:click={() => showNewComponent = false}>Close</button>
  </div>
</Modal>
```

### Rule 23: Development Workflow
1. Run `pnpm run dev:wallet` from /yakkl root
2. Fix ALL errors except svelte-form warnings
3. Repeat until clean compilation
4. Ensure 100% confidence in functionality

### Rule 24: Mandatory Compilation Check
**CRITICAL**: After ANY source code changes (*.ts, *.svelte, *.js, *.jsx, *.tsx):
1. Must run until all errors and warnings have been fixed

```bash
# MUST run from root directory
cd <path...>/crypto/yakkl
pnpm run dev:wallet
```

**Success Criteria:**
- ✅ ZERO compilation errors
- ✅ svelte-form warnings are acceptable
- ❌ ALL other warnings must be fixed
- ❌ NEVER mark task complete with errors or warnings

**This rule applies to:**
- All agents when modifying code
- All manual code changes
- Before ANY git commits
- Before marking ANY task complete

**Failure Protocol:**
1. Document all errors
2. Fix each error systematically
3. Re-run compilation check
4. Repeat until clean
5. Only then proceed

## Additional Context

### Current Status
- v2 is in active development
- Sidepanel has been updated
- Browser API abstraction layer created
- SDK-like messaging wrapper implemented (needs verification)

### Critical Paths
- Multi-chain support is implemented
- Import/export functionality completed
- Service worker uses static imports

### Testing Requirements
- All code must compile cleanly
- Type checking must pass
- Security-critical code requires extra review
- Performance impact must be considered

## Instructions for Development

### Planning Phase
1. Create detailed plan for approval
2. List all files to be modified
3. Explain architectural changes
4. Get explicit approval before proceeding

### Implementation Phase
1. Follow all rules strictly
2. Create backups as required
3. Test incrementally
4. Validate security implications
   1. Make sure no property named .data is unencrypted. The property .data always has it's content encrypted in persistent storage at all times

### Review Phase
1. Ensure clean compilation
2. Verify no regressions
3. Check security compliance
4. Validate performance

This document is the authoritative source for project context and rules. All development must comply with these guidelines.
