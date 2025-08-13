# YAKKL Smart Wallet v2 - Project Overview

**Version**: v2.0.1  
**Last Updated**: 2025-08-18  
**Primary Goal**: Production-ready crypto wallet with enterprise-grade security and exceptional UX

## Project Description
YAKKL Smart Wallet is a next-generation browser extension crypto wallet built with SvelteKit, focusing on security, performance, and user experience. The wallet features advanced AI integration, multi-chain support, and a revolutionary view-based caching architecture.

## Code Style Guidelines
- **Indentation**: 2 spaces (no tabs)
- **Imports**: Static imports only (NO dynamic imports except documented exceptions)
- **TypeScript**: Strict mode, explicit types for all public APIs
- **Components**: SvelteKit components with TypeScript
- **Styling**: Tailwind CSS with DaisyUI components
- **Naming**: camelCase for variables/functions, PascalCase for components/classes
- **File Structure**: Feature-based organization in `$lib/`

## Frequently Used Commands

```bash
# Development (run from /yakkl-wallet directory)
pnpm run dev:chrome     # Start development server
pnpm test:wallet        # Run wallet tests
pnpm run check:wallet   # Type checking
pnpm run lint:wallet    # Linting
pnpm run build          # Production build

# Git Operations
git status              # Check current changes
git diff                # Review modifications
git commit -m "message" # Commit changes
git push               # Push to remote

# Testing & Quality
pnpm run test          # Run all tests
pnpm run test:unit     # Unit tests only
pnpm run test:e2e      # End-to-end tests
pnpm run coverage      # Generate coverage report
```

## Project-Specific Workflows

### Starting a New Task
1. Use project-architect agent for initial analysis
2. Create checkpoint before major changes
3. Follow recommended agent sequence
4. Run tests after implementation
5. Update documentation

### Code Review Process
1. Run linting and type checking
2. Security audit for sensitive changes
3. Performance analysis for new features
4. Documentation updates
5. Create PR with detailed description

### Deployment Procedure
1. Ensure all tests pass
2. Update version numbers
3. Build production bundle
4. Test in staging environment
5. Deploy to production

## Development Environment

### Required Tools
- Node.js v20+
- pnpm v8+
- Chrome/Brave browser for extension development
- VS Code with recommended extensions

### Setup Instructions
1. Clone repository
2. Install dependencies: `pnpm install`
3. Copy `.env.example` to `.env`
4. Start development: `pnpm run dev:chrome`

## Team-Specific Instructions

### Communication Protocols
- Use agents for complex tasks
- Create checkpoints before risky operations
- Document architectural decisions
- Update CLAUDE.md with learnings

### Prompt Enhancement Guidelines
Rework prompts if they:
- Lack sufficient detail for implementation
- Contain ambiguous requirements
- Include sensitive information
- Could benefit from architectural review

## Critical Rules - DO NOT VIOLATE
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
4. **Never use chrome.* browser extension calls** - Use browser.* using the MDN browser APIs. For example, do not do chrome.runtime.sendMessage but instead use browser.runtime.sendMessage

## Agent Reference

### Quick Agent Selection
- **🔴 CRITICAL**: project-architect, security-auditor, checkpoint-manager
- **🟠 HIGH PRIORITY**: test-runner, performance-optimizer, blockchain-integration
- **🟢 RECOMMENDED**: documentation-updater, workflow-optimizer
- **🔵 SPECIALIZED**: store-manager, wallet-component-builder, v2-migration

### Agent Usage Patterns
```
# For new features
parallel: [project-architect, security-auditor, test-runner]

# For performance issues
parallel: [performance-optimizer, test-runner]

# For security updates
parallel: [security-auditor, checkpoint-manager, test-runner]
```

For detailed agent descriptions and usage, see: @/docs/claude/AGENT_REFERENCE.md

## Current Status & Known Issues

### Protected Files - DO NOT MODIFY
- SimpleTooltip.svelte - Manually optimized
- `export const prerender` configurations
- `export const ssr` configurations

### Active Issues (Priority Order)

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

### Task Completion Checklist
1. Run `pnpm run dev:chrome` from /yakkl-wallet directory
2. Fix all warnings and errors
3. Run tests to ensure nothing broke
4. Update relevant documentation
5. Create checkpoint if significant changes were made

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

# Included Documentation

## Core Rules & Guidelines
@/docs/claude/RULES.md

## Architecture Documentation
@/docs/claude/WALLET_ARCHITECTURE.md
@/docs/claude/AI_CACHING_SYSTEM.md
@/docs/claude/DATA_ROLLUP_SYSTEM.md

## Development Resources
@/docs/claude/DEVELOPMENT_PATTERNS.md
@/docs/claude/CLAUDE_AGENTS_GUIDE.md
@/docs/claude/AGENT_REFERENCE.md

## Project Status
@/docs/claude/ROUTES_STRUCTURE.md
@/docs/claude/V2_MIGRATION_STATUS.md
