# CLAUDE.md

This file provides current status and recent updates for Claude Code when working with the YAKKL Smart Wallet v2 project. For detailed architecture and development rules, see `.claude/PROJECT_CONTEXT.md`.

## Quick Reference

### 🚀 Current Sprint Focus
- **Version**: v2.0.0-beta
- **Last Review**: 2025-08-01
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
pnpm run dev:wallet     # Run the pnpm commands from /yakkl root directory
pnpm test:wallet        # Run wallet tests
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

## Current Status (Last Updated: 2025-08-01)

### 🎯 Active Development (This Week)

### Needing fixed ASAP - CRITICAL
1. Display of formatted fiat in PortfolioOverview.svelte (critical)
   1. Either calculates the values too large or attempts to convert before running formatting on the values
   2. Previous attempts have failed. I believe part of the failure is due to attempting to convert to bigint again on the values. There should be no need to do that. Read what is there and format correctly. Let me know if there are conversions or calculations that have to be done on the data
   3. The values in portfolio totals are correct but I'm not certain the proper values are being kept. The portfolio value, depending type such as 'current account', 'total for network', or 'total for all networks'
   4. Values and transactions should be cached at all times. Meaning, if something changes such as market price then the total for the impacted token (including native token like ETH) should be recalculated along with all of the running sub-totals and grand totals. The svelte store should be updated with the data and then the persistent data should be updated (yakklWalletCache)
   5. When the svelte store is updated the svelte reactive $effect(...) should automatically pick that up and then update the UI. At that point, in theory, the UI, svelte store, and persistent storage should be fully in sync
   6. On next market price check for each token the process repeats itself
   7. One thing that I have noticed is the svelte store has initial 0s which is fine and expected. But, I also noticed that we have a routine that checks the native price first and then updates the svelte store with that value before makeing sure the svelte store is populated with the cache as fast and soon as possible. Basically, the store should be in sync with the persistent store before anything else happens so it displays
   8. This checking of the native token first I believe came from what I said a week or so ago but that was wrong. Remove that method and instead do what I stated here and even improve on it if it can be
   9. If the above process is followed for each token price and or quantity update then no need to force an update to cache because it will already have been done per the process above

2. PortfolioOverview.svelte - different ways to calculate
  - As I mentioned above, there are 3 types of summary calculations:
    1. Current Active Account - this means, for the currently active account, summary all of the tokens (including native) that this account is associated with and the process those totals as per above
    2. All accounts for networks - this means, take a look at the network, Ethereum for example, and all of the accounts that have tokens and native for the given network (Ethereum) and then show Ethereum (network) totals so the user can see their portfolio for the given network and this may be one or xxx number of addresses and tokens.
       1. This also impacts the transactions to be displayed in RecentActivity.svelte. For example, in our test case for Ethereum mainnet (chain id 1), we have two accounts that have values for tokens on Ethereum. The sum of those values should be what the user sees and the RecentActivity should also have the same total but it should also have both accounts with sub-totals for each account and then a grand total in the footer of RecentActivity.svelte and this value must match what the user sees in their PortfolioOverview.svelte component.
  - PortfolioOverview should drive the RecentActivity transaction views

3. RecentActivitiy.svelte (critical)
  - This component is no longer seeing transactions. For example, the default eth account being used for testing has at least 75 transactions. This worked until some changes that you made earlier today. Those changes may be been around replacing browser_ext with browserAPI but I'm not certain
  - The .env is present and populated - no issues
  - Webpack has picked it up - no issues
  - Review your changes, if you can, and adjust accordingly
  - Remove the option to change current address or total for given network or total of all networks and accounts. The PortfolioOverview.svelte already has that feature and so it should be driven there or else the user may be confused. Display the correct type (the same value in the toggle button of PortfolioOverview) in the header portion of RecentActivity in a nice font or method

### Do not do or touch the following - it may have been done manually
- SimpleTooltip.svelte - I have fixed it and it looks great. Please do not touch

### 🐛 Known Issues & TODOs

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

### Finished your task and ready to return control back to a human
- ALWAYS run `pnpm run dev:wallet` from the /yakkl root directory of the mono-repo
- Fix any error or warnings until they are all completed and everything compiles cleaning (repeat if needed)



## Recent File Changes

### Browser API Refactoring (2025-07-29)
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
