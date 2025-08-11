# CLAUDE.md

This file provides current status and recent updates for Claude Code when working with the YAKKL Smart Wallet v2 project. For detailed architecture and development rules, see `.claude/PROJECT_CONTEXT.md`.

## Quick Reference

### 🚀 Current Sprint Focus
- **Version**: v2.0.0-beta
- **Last Review**: 2025-11-01
- **Primary Goal**: Production-ready v2 with enterprise-grade security

### 📁 Key Documentation
- **Architecture & Rules**: `.claude/PROJECT_CONTEXT.md`
- **Workflow Guide**: `.claude/WORKFLOW.md`
- **Agent Descriptions**: `.claude/agents/*.md`
- **Commands**: `.claude/slash_commands/*.md`

### 🛠️ Essential Commands

- Run the pnpm commands from /yakkl root directory and not from project directory like /packages/yakkl-wallet

```bash
# Development
pnpm run dev:wallet      # Start wallet development
pnpm test:wallet        # Run wallet tests
pnpm run check:wallet   # Type checking
pnpm run lint:wallet    # Linting

# Documentation
/doc-updater            # Update all docs
/changelog              # Generate changelog
/checkpoint create      # Create safety checkpoint

# Context & Help
/context                # Show relevant context
/rules                  # Quick rule reference
```

## Current v2 Status (Last Updated: 2025-11-01)

### 🎯 Active Development (This Week)
1. **Documentation System Overhaul**
   - Created PROJECT_CONTEXT.md with full architecture
   - Added project-architect master agent
   - Added workflow-optimizer for better prompts
   - Enhanced all agents with specific rules
   - Added color indicators: 🔴 checkpoint-related, 🟢 workflow-optimizer

2. **Enhanced Agent System**
   - 9 specialized agents for different tasks
   - 3 slash commands for automation
   - Comprehensive checkpoint system with hooks

### ✅ Recently Completed (Last 30 Days)

#### 2025-11-01 Fixes
1. **Fixed**: "(void 0) is not a function" error at login
   - Root cause: Empty token.store.ts file
   - Solution: Restored token store with multi-chain support

2. **Fixed**: "Expected number, M 0,NaN" SVG path error
   - Root cause: Invalid chart data in AdvancedAnalytics
   - Solution: Added validation for NaN values

3. **Fixed**: Pro Trial button visibility
   - Root cause: Missing visible flag update
   - Solution: Set visible = true in updateCountdown()

4. **Enhanced**: Browser idle detection
   - Added browser notifications
   - Badge countdown timer
   - Sound alerts
   - Enhanced notification system

#### Recent Feature Completions
- ✅ Multi-chain portfolio aggregation
- ✅ Import/Export functionality (v2)
- ✅ Service worker with static imports
- ✅ Real blockchain transaction history
- ✅ Enhanced token display formatting
- ✅ Secure Full Recovery (Basic feature)
- ✅ Advanced Analytics with charts

### 🐛 Known Issues & TODOs

1. **Performance**
   - Bundle size approaching limits
   - TODO: Implement code splitting
   - TODO: Optimize imports

### 🔧 Active Configuration

#### Feature Flags
- Multi-chain View: Enabled
- Testnet Display: Configurable
- Idle Detection: 2min threshold, 60s lockdown

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
4. Update documentation after completion

### Quick Agent Reference
- **project-architect**: Start here for any task
- **wallet-component-builder**: UI components
- **blockchain-integration**: Web3/contracts
- **store-manager**: State management
- **security-auditor**: Security review
- **test-runner**: Testing
- **performance-optimizer**: Optimization
- **v2-migration**: v1→v2 features

## Recent File Changes

### Browser API Refactoring (2025-10-29)
- **Critical Plan**: `.claude/BROWSER_API_REFACTOR_PLAN.md`
- Proof of concept complete for message-passing architecture
- Test page: `/routes/(wallet)/test-browser-api/+page.svelte`
- Solves SSR conflicts with browser extension APIs

### Key Modified Files (Last Update)
- `/lib/services/base.service.ts` - Real messaging
- `/lib/stores/token.store.ts` - Multi-chain support
- `/lib/components/TokenPortfolio.svelte` - Price formatting
- `/lib/components/pro/AdvancedAnalytics.svelte` - Charts
- `/contexts/background/extensions/chrome/context.ts` - Idle detection

### Development Notes
- Dropped error logging checks for items 3 and 6 per discussion
- Planning to use Sentry for error logs later
- Browser extension checks deemed unnecessary
- Considering a dialog popup when FAB is clicked
- Ensuring `.claude/agents` and hooks are functioning correctly
- Maintaining consistent git checkpoints during development

## Privacy Note
The YAKKL project includes both public and private repositories. When working in public repositories, do not expose internal details of private packages.

---
*For comprehensive project documentation, architecture, and rules, see `.claude/PROJECT_CONTEXT.md`*
