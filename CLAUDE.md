## YAKKL (mono-repo)

YAKKL is a core product line the emcompasses a number of other projects. The flagship project is the YAKKL Smart Wallet. This is what we believe is the most secure digital wallet in the crypto space and beyond. In addition it is the most user friendly with an incredible UI. It has built-in guides if the user needs to know what to do next. It support a free version that is called an Explorer Membership. It has a more advanced set of features and guides in the Pro version. The Pro version as two unique memberships beyond the Pro Membership:
- Founding Memember: Pro level features plus other perks for those that enroll within the first 60 days of official release
- Early Adopter Member: Pro level features plus other perks that may not include similar perks of the Founding members. This applies to users enrolling after the Founding Member enroll date and then for another 60 days

**Structure**: 11+ projects using pnpm workspaces
**Focus**: Browser extension ecosystem plus security, backend, MCP servers, agents and smart contracts

## Claude Code Organization

### Architecture Overview
This monorepo uses a **hybrid orchestration model** for Claude Code:

1. **Root Orchestrator** (`.claude/`) - Central coordination and shared components
2. **Package Instances** (`packages/*/.claude/`) - Package-specific configurations with symlinks to shared components

### Root Claude Structure
```
.claude/
├── orchestration/          # Cross-package coordination agents
│   ├── monorepo-coordinator.md
│   ├── dependency-analyzer.md
│   ├── impact-analyzer.md
│   └── release-manager.md
├── agents/shared/          # Shared agents for all packages
│   ├── architecture-enforcer.md
│   ├── security-auditor.md
│   ├── performance-optimizer.md
│   ├── test-runner.md
│   └── documentation-updater.md
├── commands/shared/        # Shared commands
├── hooks/shared/          # Shared hooks
└── scripts/               # Setup and maintenance scripts
```

### Package Claude Structure
Each package has its own `.claude/` directory with:
- Package-specific agents
- Symlinks to root shared components
- Local settings and configurations

### Working with Claude Code

#### At Root Level
Use when:
- Making cross-package changes
- Analyzing dependencies
- Coordinating releases
- Running monorepo-wide operations

```bash
# From /yakkl directory
claude "Refactor shared utilities from wallet to core"
```

#### At Package Level
Use when:
- Working on package-specific features
- Making isolated changes
- Testing package functionality

```bash
# From /yakkl/packages/yakkl-wallet directory
claude "Add new wallet connection method"
```

### Claude Code Coordination Flow
1. **Simple Package Changes**: Use package-level Claude
2. **Cross-Package Changes**: Start at root level
3. **Complex Features**: Root orchestrates, packages execute
4. **Dependency Updates**: Root analyzes, then coordinates

### Setup New Package with Claude
Run from root directory:
```bash
./scripts/setup-claude-package.sh <package-name>
```

This creates the Claude structure with proper symlinks.

## Projects
- **yakkl-wallet**: Main browser extension (primary work) - super app
- **yakkl-wallet-private**: Parts of the super app that is private
- **yakkl-wallet-pro**: Pro parts of yakkl-wallet and yakkl-wallet may have stubs referencing these
- **yakkl-sdk**: Developer SDK
- **yakkl-contracts**: Smart contracts
- **yakkl-ui**: Shared components
- **yakkl-ai**: AI services
- **yakkl-ai-private**: AI services that are internal eyes only
- **yakkl-core**: Core code that may run in many different projects in the mono repo
- **yakkl-backend**: Backend services that are mainly Cloudflare Workers, Google Cloude, Digital Ocean, and other infrastructure solutions
- **yakkl-security**: Where our critical security features live that are not public
- **yakkl-mcp**: MCP Servers with one being digital wallet as a service for all MCPs
- **yakkl-wallet-v1**: Original MVP wallet and this will soon be archived
- **yakkl-uniswap-alpha-router-service**: This is a Uniswap router that may be obsolete with the Uniswap 4

## Project Dependencies
- I will document this as we move core and ui items that should belong in their own project so that other projects can benifit from the shared work

## Cross-Project Rules
1. Changes affecting multiple packages require planning
2. Breaking changes need impact analysis
3. Build from root (/yakkl directory) - only applies to yakkl-wallet: `pnpm run dev:wallet`

## When Working Cross-Project
- Consider dependencies between packages
- Update package.json if adding new deps
- Test affected packages
- Requires permission for any cross-project changes
  
## All changes
- All changes, regardless of project, must have a plan created and approved before any code changes take place
- ALL plans require the best effort for identifying the files that may be impacted or changed in the plan
