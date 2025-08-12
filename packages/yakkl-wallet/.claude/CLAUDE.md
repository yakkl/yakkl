# CLAUDE.md

This file provides current status and recent updates for Claude Code when working with the YAKKL Smart Wallet project. For detailed architecture and development rules, see `.claude/PROJECT_CONTEXT.md`.

## Quick Reference

### 🚀 Current Sprint Focus
- **Version**: v2.0.1
- **Last Review**: 2025-08-05
- **Primary Goal**: Production-ready with enterprise-grade security

### 📁 Key Documentation
- **Architecture & Rules**: `.claude/PROJECT_CONTEXT.md`
- **Workflow Guide**: `.claude/WORKFLOW.md`
- **Agent Descriptions**: `.claude/agents/*.md`
- **Commands**: `.claude/slash_commands/*.md`

### 🛠️ Essential Commands

- Run the pnpm commands from /yakkl-wallet project directory

```bash
# Development
pnpm run dev:chrome     # Run the pnpm commands from /yakkl root directory
# pnpm test:wallet        # Run wallet tests
# pnpm run check:wallet   # Type checking
# pnpm run lint:wallet    # Linting

# Documentation
/doc-updater            # Update all docs
/changelog              # Generate changelog
/checkpoint create      # Create safety checkpoint

# Context & Help
/context                # Show relevant context
/rules                  # Quick rule reference
```

### Rework prompt given IMPORTANT
- Rework the prompt given if the prompt:
  - Does not provide you with enough detail
  - Does not make sense
  - Contains sensitive information (usually done by mistake)
  - If you feel it could be better for you to create, enhance, or fix all code involved with the prompt

### ⚠️ CRITICAL RULES - DO NOT VIOLATE
1. **NO DYNAMIC IMPORTS** - Use static imports only. Dynamic imports (`await import()`) break webpack in service worker contexts.
   - Exceptions (use ONLY when absolutely necessary):
     - `webextension-polyfill` in client context with browser environment check
     - Circular dependency resolution (must be documented with comment)
     - Provider/blockchain abstraction where different implementations are loaded conditionally
     - Network providers (Alchemy, Infura, etc.) loaded based on configuration
   - All other imports MUST be static at the top of the file
   - If using dynamic import for valid reason, MUST add comment explaining why
2. **Never modify webextension-polyfill import handling** - It has special handling for browser/non-browser contexts
3. **NO BIG NUMBER DISPLAY ERRORS** - Always use proper BigNumber formatting utilities
   - Use `formatBigNumberForDisplay()` for UI values
   - Never display raw BigNumber objects
   - Implement responsive font sizing for large values
   - Test with extreme values (very large and very small numbers)

## Current Status (Last Updated: 2025-08-05)

### Do not touch the following - it may have been done manually
- SimpleTooltip.svelte - I have fixed it and it looks great. Please do not touch
- `export const pre-render = <whatever I have already>`
- `export const ssr = <whatever I have already>  OR if I don't have it then don't create one`

### 🐛 Known Issues & TODOs

#### Priority Bugs to Fix:
1. **Idle Timeout System**
   - Currently locks immediately on idle (no grace period)
   - Missing countdown timer and notifications
   - No badge updates during countdown
   - Settings UI needs idle configuration fields

2. **Wallet Cache & Views**
   - Background services not properly syncing data
   - Views not organized for different data slices
   - RecentActivity component needs view selector
   - Portfolio totals not updating correctly

### 🔧 Active Configuration

#### Feature Flags

#### Plan Types
- `explorer_member` - Basic with Secure Recovery
- `yakkl_pro` - Advanced features
- `early_adopter` - Pro + perks
- `founding_member` - Pro + perks
- `enterprise` - Business features

## Development Workflow
### Starting a New Task
1. Use project-architect for analysis: `Use the project-architect agent to analyze...`
2. Follow recommended agent sequence
3. Create checkpoints before major changes
4. After completing all code then run `pnpm run dev:chrome` if running in the yakkl-wallet project. Fix all warnings and errors - continue this until all warning and errors are gone
5. Update documentation after completion

### Quick Agent Reference
- **project-architect**: Start here for any task
- **wallet-component-builder**: UI components
- **blockchain-integration**: Web3/contracts
- **store-manager**: State management
- **security-auditor**: Security review
- **test-runner**: Testing
- **performance-optimizer**: Optimization
- **v2-migration**: v1→v2 features

### Finished your task and ready to return control back to a human
- ALWAYS run `pnpm run dev:chrome` from the /yakkl-wallet project directory of the mono-repo
- Fix any error or warnings until they are all completed and everything compiles cleaning (repeat if needed)

## Recent Architecture Improvements

### 🏗️ Major Updates (2025-08-12)

#### 🔐 Idle Timeout System Enhancement
- Leveraging existing `IdleManager` infrastructure (SystemWide/AppWide)
- Adding countdown timer with grace period after idle detection
- Badge text/color updates during countdown
- Multiple notification points with audio alerts
- Configurable settings in UI
- Integration with `UnifiedTimerManager` for countdown
- Files: `IdleManagerBase.ts`, `IdleManagerSystemWide.ts`, `IdleManagerAppWide.ts`

#### 📊 View-Specific Cache Architecture (Greenfield)
- **Flat cache structures** optimized for each view type
- **Independent stores**: `account-view.store.ts`, `network-view.store.ts`, `token-view.store.ts`, `watchlist-view.store.ts`
- **Denormalized data** for fast UI rendering
- **View sync service** for data transformation
- **No migration needed** - full v2 greenfield approach

#### 🎨 Enhanced Portfolio UI/UX
- **Orbital Cards Navigation** - Beautiful animated view selector
- **Personalization System** - User-customizable layouts and ordering
- **Smart Sort Algorithm** - AI-powered view arrangement based on usage
- **Gesture Support** - Swipe, drag, pinch interactions
- **Preset Templates** - Trader, HODLer, Analyst, Minimalist modes
- **Persistent Layout Memory** - Remembers user preferences

#### 🤖 AI Integration Architecture
- **Local SLM in Service Worker** - Using Transformers.js (all-MiniLM-L6-v2)
- **Vector-Ready Data Structure** - Optimized for embeddings and search
- **Hybrid AI System** - Local-first with backend fallback for Pro users
- **Privacy-Preserving** - Differential privacy, k-anonymity options
- **Natural Language Queries** - "Show me best performing tokens this week"
- **Backend Integration** - Cloudflare Workers + Hono with JWT auth
- **Tiered Service Model** - Free (local), Pro (GPT-3.5), Enterprise (GPT-4)

### 🏗️ Previous Updates (2025-08-05)

#### Portfolio Rollup System
- Multi-level aggregation (account, chain, grand total)
- Synchronized portfolio and transaction views
- Real-time updates with intelligent caching
- Architecture doc: `.claude/PORTFOLIO_ROLLUP_ARCHITECTURE.md`

#### Security Enhancements
- JWT token invalidation during wallet lock
- Secure token blacklisting with SHA-256 hashing
- Enhanced popup security management
- Files: `jwt-background.ts`, lock management utilities

#### Service Worker Compatibility
- Static imports only (no dynamic imports)
- Message channel error prevention
- Payload validation for all handlers
- Fixed async response errors in browser API

## Recent File Changes

### Browser API Refactoring (2025-07-29)
- **Critical Plan**: `.claude/BROWSER_API_REFACTOR_PLAN.md`
- Proof of concept complete for message-passing architecture
- Test page: `/routes/(wallet)/test-browser-api/+page.svelte`
- Solves SSR conflicts with browser extension APIs

### Implementation Plan (2025-08-12)

#### Phase 1: Idle Timeout Fix (Priority)
1. Enhance `IdleManagerBase.ts` with countdown logic
2. Update Settings interface with idle configuration
3. Create `IdleCountdownModal.svelte` component
4. Wire up in background context
5. Test countdown, reset, and lock behavior

#### Phase 2: View-Specific Caches
1. Create flat view store structures
2. Build view sync service
3. Create view components (AccountsView, NetworksView, TokensView, WatchlistView)
4. Update RecentActivity with view selector
5. Update PortfolioOverview with tabs

#### Phase 3: AI Integration
1. Setup Transformers.js in service worker
2. Create vector-ready data structures
3. Implement hybrid AI service
4. Add natural language query interface
5. Configure backend endpoints

### Key Modified Files (Last Update)
- `/lib/services/base.service.ts` - Real messaging
- `/lib/stores/token.store.ts` - Multi-chain support
- `/lib/components/TokenPortfolio.svelte` - Price formatting
- `/lib/components/pro/AdvancedAnalytics.svelte` - Charts
- `/contexts/background/extensions/chrome/context.ts` - Idle detection
- `/lib/common/browserContext.ts` - Context detection (NEW)
- `/lib/utilities/jwt-background.ts` - Token invalidation (NEW)
- `/lib/services/portfolio-rollup.service.ts` - Portfolio aggregation (NEW)

### Development Notes
- Dropped error logging checks for items 3 and 6 per discussion
- Planning to use Sentry for error logs later
- Browser extension checks deemed unnecessary
- Considering a dialog popup when FAB is clicked
- Ensuring `.claude/agents` and hooks are functioning correctly
- Maintaining consistent git checkpoints during development

## Privacy Note
The YAKKL project includes both public and private repositories. When working in public repositories, do not expose internal details of private packages.

## Architecture Decisions

### Data Storage Strategy
- **View-Specific Caches**: Flat, denormalized structures for each view type
- **Vector Storage**: Hybrid approach with hot (memory), warm (IndexedDB), cold (compressed) tiers
- **AI Embeddings**: 384-dimensional vectors using all-MiniLM-L6-v2
- **Privacy Levels**: Full, anonymous, none - user configurable

### AI Service Architecture
- **Local Models**: ~86MB total (embeddings, classification, generation)
- **Smart Routing**: Local for simple queries, backend for complex
- **JWT Integration**: Existing JWT system for backend auth
- **WebSocket Support**: Real-time AI features for Pro users
- **Fallback Strategy**: Always fallback to local if backend unavailable

### UI/UX Philosophy
- **Beautiful First**: Orbital cards, smooth animations, glass morphism
- **Personalization**: User-customizable layouts with smart defaults
- **Adaptive Intelligence**: Learn from usage patterns
- **Progressive Disclosure**: Show complexity only when needed

---
*For comprehensive project documentation, architecture, and rules, see `.claude/PROJECT_CONTEXT.md`*
