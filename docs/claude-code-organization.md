# Claude Code Organization for YAKKL Monorepo

## Overview

The YAKKL monorepo uses a **hybrid orchestration model** for Claude Code, combining centralized coordination with package-specific autonomy. This approach enables efficient cross-package operations while maintaining independence for individual packages.

## Architecture

```
yakkl/
├── .claude/                           # Root orchestrator
│   ├── orchestration/                 # Cross-package coordination
│   │   ├── monorepo-coordinator.md   # Main coordinator
│   │   ├── dependency-analyzer.md    # Dependency management
│   │   ├── impact-analyzer.md        # Change impact assessment
│   │   └── release-manager.md        # Release coordination
│   ├── agents/shared/                 # Shared agents (symlinked by packages)
│   │   ├── architecture-enforcer.md
│   │   ├── security-auditor.md
│   │   ├── performance-optimizer.md
│   │   ├── test-runner.md
│   │   └── documentation-updater.md
│   ├── commands/shared/               # Shared commands
│   ├── hooks/shared/                  # Shared hooks
│   └── scripts/                       # Setup scripts
│
├── packages/
│   ├── yakkl-wallet/
│   │   └── .claude/
│   │       ├── agents/
│   │       │   ├── wallet-component-builder.md  # Package-specific
│   │       │   └── shared -> symlink            # Link to root shared
│   │       └── settings.json
│   │
│   ├── yakkl-core/
│   │   └── .claude/
│   │       ├── agents/
│   │       │   ├── yakkl-core-specialist.md    # Package-specific
│   │       │   └── shared -> symlink           # Link to root shared
│   │       └── settings.json
│   │
│   └── [other packages...]
│
└── scripts/
    └── setup-claude-package.sh        # Automated setup script
```

## How It Works

### 1. Root-Level Orchestration

When working from the monorepo root (`/yakkl`), Claude Code uses orchestration agents to coordinate cross-package changes:

```bash
# From /yakkl directory
$ claude "Move shared utilities from yakkl-wallet to yakkl-core"
```

The root orchestrator will:
1. Analyze dependencies across packages
2. Plan the migration strategy
3. Coordinate changes in affected packages
4. Run tests in dependency order
5. Ensure consistency

### 2. Package-Level Development

When working within a specific package, Claude Code uses package-specific configurations:

```bash
# From /yakkl/packages/yakkl-sdk directory
$ claude "Add new API method for token swaps"
```

The package-level Claude will:
1. Use package-specific agents
2. Access shared agents via symlinks
3. Follow package conventions
4. Run package tests

### 3. Symlink Architecture

Shared components are centralized in the root `.claude/` directory and symlinked by packages:

```bash
packages/yakkl-core/.claude/agents/shared -> ../../../.claude/agents/shared
```

Benefits:
- No duplication of common agents
- Centralized updates
- Consistent behavior across packages
- Easy to maintain

## Setting Up New Packages

### Automated Setup

Use the provided script to set up Claude Code for a new package:

```bash
# From monorepo root
./scripts/setup-claude-package.sh yakkl-new-package
```

This creates:
- `.claude/` directory structure
- Symlinks to shared components
- Package-specific agent template
- CLAUDE.md template
- Settings configuration

### Manual Setup

If setting up manually:

1. Create directory structure:
```bash
mkdir -p packages/yakkl-new/.claude/{agents,commands,hooks}
```

2. Create symlinks:
```bash
ln -s ../../../.claude/agents/shared packages/yakkl-new/.claude/agents/shared
ln -s ../../../.claude/commands/shared packages/yakkl-new/.claude/commands/shared
ln -s ../../../.claude/hooks/shared packages/yakkl-new/.claude/hooks/shared
```

3. Create package-specific agent:
```bash
touch packages/yakkl-new/.claude/agents/yakkl-new-specialist.md
```

4. Create settings.json and CLAUDE.md

## Usage Scenarios

### Scenario 1: Simple Package Change

**Task**: Add a new component to yakkl-ui

```bash
cd packages/yakkl-ui
claude "Create a new TokenBalance component"
```

- Uses yakkl-ui's component-builder.md agent
- Follows UI package patterns
- No cross-package coordination needed

### Scenario 2: Cross-Package Refactoring

**Task**: Extract shared types to yakkl-core

```bash
# From root directory
claude "Extract Transaction types from wallet, sdk, and backend to core"
```

- Root orchestrator coordinates the change
- Analyzes all affected packages
- Updates imports across packages
- Runs tests in dependency order

### Scenario 3: Security Audit

**Task**: Run security audit across all packages

```bash
# From root directory
claude "Run comprehensive security audit"
```

- Uses shared security-auditor.md agent
- Runs parallel audits in each package
- Aggregates findings
- Creates unified report

### Scenario 4: New Feature Implementation

**Task**: Add WalletConnect v3 support

```bash
# From root directory
claude "Implement WalletConnect v3 support"
```

- Orchestrator identifies affected packages:
  - yakkl-wallet (UI integration)
  - yakkl-core (protocol handlers)
  - yakkl-sdk (API methods)
- Coordinates implementation across packages
- Ensures compatibility

## Best Practices

### 1. Choose the Right Starting Point

- **Root level**: Cross-package changes, dependency updates, releases
- **Package level**: Isolated features, bug fixes, package-specific work

### 2. Maintain Symlinks

- Always use symlinks for shared components
- Don't duplicate shared agents
- Update symlinks if directory structure changes

### 3. Document Package Specifics

Each package should have:
- CLAUDE.md with package-specific instructions
- Specialized agents for unique functionality
- Clear dependency documentation

### 4. Use Orchestration for Complex Tasks

Let the root orchestrator handle:
- Breaking changes
- Multi-package features
- Dependency updates
- Release coordination

### 5. Keep Agents Focused

- Shared agents: Common functionality
- Package agents: Domain-specific logic
- Orchestration agents: Coordination only

## Troubleshooting

### Symlinks Not Working

If symlinks appear broken:

```bash
# Recreate symlink
cd packages/[package]/.claude/agents
rm shared
ln -s ../../../.claude/agents/shared shared
```

### Package Not Recognized

Ensure package has:
1. `.claude/` directory
2. Valid symlinks
3. Settings.json file
4. CLAUDE.md file

### Cross-Package Changes Failing

Check:
1. All affected packages have Claude setup
2. Dependencies are correctly declared
3. Tests pass in all packages
4. No circular dependencies

## Advanced Configuration

### Custom Orchestration Rules

Add to root `.claude/orchestration/custom-rules.md`:

```markdown
# Custom Rules for YAKKL

## Package Dependencies
- yakkl-security must never depend on other packages
- yakkl-core cannot import from UI packages
- All packages must depend on yakkl-core for types
```

### Package-Specific Hooks

Create package-specific hooks while using shared ones:

```bash
packages/yakkl-wallet/.claude/hooks/
├── pre-commit.sh          # Package-specific
└── shared/                # Symlink to root shared
    ├── test-runner.sh
    └── lint-check.sh
```

### Environment-Specific Settings

Override settings per environment:

```json
// packages/yakkl-wallet/.claude/settings.json
{
  "extends": "../../../.claude/settings.json",
  "env": {
    "development": {
      "autoTest": true,
      "verboseLogging": true
    },
    "production": {
      "autoTest": false,
      "verboseLogging": false
    }
  }
}
```

## Migration Guide

### From Single Claude Instance

If migrating from a single Claude Code instance:

1. **Backup existing configuration**:
```bash
cp -r .claude .claude-backup
```

2. **Run migration script**:
```bash
./scripts/migrate-to-orchestration.sh
```

3. **Verify symlinks**:
```bash
find packages -type l -name "shared" -ls
```

4. **Test with simple operation**:
```bash
claude "List all packages with their dependencies"
```

### From Multiple Independent Instances

If each package has its own Claude:

1. **Identify shared agents**
2. **Move to root .claude/agents/shared/**
3. **Replace with symlinks**
4. **Add orchestration agents**
5. **Update CLAUDE.md files**

## Maintenance

### Regular Tasks

1. **Weekly**: Check symlink integrity
2. **Monthly**: Review and update shared agents
3. **Quarterly**: Audit package-specific agents
4. **Yearly**: Review orchestration strategy

### Updating Shared Agents

When updating a shared agent:

1. Edit in root `.claude/agents/shared/`
2. Changes automatically available to all packages
3. Test in multiple packages
4. Document changes

### Adding New Shared Functionality

1. Create agent in `.claude/agents/shared/`
2. Document in this guide
3. Notify team members
4. Consider backward compatibility

## Future Enhancements

### Planned Features

1. **Automated dependency graph generation**
2. **Cross-package test orchestration**
3. **Intelligent change impact prediction**
4. **Automated migration tools**
5. **Package extraction automation**

### Potential Improvements

1. **Dynamic agent loading based on context**
2. **Cross-repository orchestration**
3. **AI-powered code migration**
4. **Automated documentation generation**
5. **Performance profiling integration**

## Support

### Getting Help

1. Check this documentation
2. Review package-specific CLAUDE.md files
3. Examine existing agents for patterns
4. Run diagnostic scripts

### Reporting Issues

When reporting Claude Code issues:

1. Specify root or package-level operation
2. Include relevant agent names
3. Provide error messages
4. Note any recent changes

### Contributing

To improve Claude Code setup:

1. Propose changes via PR
2. Update documentation
3. Add tests for new functionality
4. Follow existing patterns