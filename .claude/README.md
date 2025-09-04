# Claude Code Orchestration System

This directory contains the root-level Claude Code configuration for the YAKKL monorepo, implementing a hybrid orchestration model that combines centralized coordination with package-specific autonomy.

## Directory Structure

```
.claude/
├── orchestration/           # Cross-package coordination agents
│   ├── monorepo-coordinator.md
│   ├── dependency-analyzer.md
│   ├── impact-analyzer.md
│   ├── release-manager.md
│   └── example-workflow.md
├── agents/
│   └── shared/             # Shared agents (symlinked by packages)
│       ├── architecture-enforcer.md
│       ├── documentation-updater.md
│       ├── performance-optimizer.md
│       ├── security-auditor.md
│       └── test-runner.md
├── commands/
│   └── shared/             # Shared commands
├── hooks/
│   └── shared/             # Shared hooks
├── scripts/                # Utility scripts
├── settings.json           # Root configuration
├── .claudeignore          # Ignore patterns
└── README.md              # This file
```

## Quick Start

### For Cross-Package Work

From the monorepo root (`/yakkl`):
```bash
claude "Move shared utilities from yakkl-wallet to yakkl-core"
```

The orchestration system will:
1. Analyze dependencies
2. Plan the migration
3. Coordinate changes across packages
4. Run tests in dependency order

### For Package-Specific Work

From a package directory:
```bash
cd packages/yakkl-sdk
claude "Add new API method for token swaps"
```

The package Claude instance will:
1. Use package-specific agents
2. Access shared agents via symlinks
3. Follow package conventions

## Orchestration Agents

### monorepo-coordinator.md
Main coordinator for cross-package changes. Manages execution order, dependencies, and ensures consistency.

### dependency-analyzer.md
Analyzes package dependencies, detects circular dependencies, and suggests optimization strategies.

### impact-analyzer.md
Assesses the impact of changes across packages, calculates risk scores, and provides migration strategies.

### release-manager.md
Coordinates package releases, manages versioning, generates changelogs, and handles publishing.

## Shared Agents

These agents are available to all packages via symlinks:

- **architecture-enforcer.md**: Enforces architectural patterns and conventions
- **documentation-updater.md**: Updates and maintains documentation
- **performance-optimizer.md**: Optimizes performance across the codebase
- **security-auditor.md**: Performs security audits and vulnerability checks
- **test-runner.md**: Manages test execution and coverage

## Package Integration

Each package has its own `.claude/` directory with:
- Package-specific agents
- Symlinks to shared components
- Local settings and configurations

### Setting Up a New Package

```bash
./scripts/setup-claude-package.sh package-name
```

This creates:
- `.claude/` directory structure
- Symlinks to shared components
- Package-specific agent templates
- CLAUDE.md documentation

### Migrating Existing Claude Setup

```bash
./scripts/migrate-claude-to-orchestration.sh [package-name]
```

This will:
- Backup existing configuration
- Extract shareable agents
- Set up symlinks
- Preserve package-specific agents

## Diagnostics

Run diagnostics to check the health of your Claude setup:

```bash
./scripts/claude-diagnostics.sh
```

To automatically fix issues:

```bash
./scripts/claude-diagnostics.sh --fix
```

## Configuration

### Root Settings (settings.json)

```json
{
  "orchestration": {
    "enabled": true,
    "mode": "hybrid",
    "packageDetection": "automatic"
  },
  "features": {
    "crossPackageAnalysis": true,
    "dependencyTracking": true,
    "impactAnalysis": true,
    "releaseCoordination": true
  }
}
```

### Package Settings

Each package can override settings:
```json
{
  "extends": "../../../.claude/settings.json",
  "customCommands": {
    "build": "pnpm run build",
    "test": "pnpm run test"
  }
}
```

## Best Practices

1. **Choose the Right Level**
   - Root: Cross-package changes, releases
   - Package: Isolated features, bug fixes

2. **Maintain Symlinks**
   - Always use symlinks for shared components
   - Run diagnostics regularly

3. **Document Changes**
   - Update package CLAUDE.md files
   - Document cross-package changes

4. **Use Orchestration for Complex Tasks**
   - Breaking changes
   - Multi-package features
   - Dependency updates

## Common Commands

### Analyze Dependencies
```bash
claude "Analyze dependencies across all packages"
```

### Coordinate Release
```bash
claude "Prepare release for yakkl-core, yakkl-sdk, and yakkl-wallet"
```

### Security Audit
```bash
claude "Run comprehensive security audit"
```

### Performance Analysis
```bash
claude "Analyze and optimize bundle sizes"
```

## Troubleshooting

### Broken Symlinks
```bash
# Fix all symlinks
./scripts/claude-diagnostics.sh --fix
```

### Package Not Recognized
```bash
# Set up Claude for a package
./scripts/setup-claude-package.sh package-name
```

### Migration Issues
```bash
# Re-run migration for a package
./scripts/migrate-claude-to-orchestration.sh package-name
```

## Documentation

- Main documentation: `/docs/claude-code-organization.md`
- Example workflows: `.claude/orchestration/example-workflow.md`
- Package docs: `packages/*/CLAUDE.md`

## Contributing

When adding new features:
1. Update shared agents if applicable
2. Document in this README
3. Add examples to example-workflow.md
4. Update diagnostic checks

## Support

For issues or questions:
1. Check `/docs/claude-code-organization.md`
2. Run diagnostics
3. Review example workflows
4. Check package-specific CLAUDE.md files