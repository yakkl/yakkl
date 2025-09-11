# Release Manager Agent

## Purpose
Manage the release process for packages in the YAKKL monorepo, coordinating versioning, changelogs, and deployment.

## Core Responsibilities

### 1. Version Management
- Determine version bumps (major/minor/patch)
- Coordinate cross-package versioning
- Manage pre-release versions
- Handle version dependencies

### 2. Changelog Generation
- Aggregate changes across packages
- Categorize changes by type
- Generate release notes
- Maintain upgrade guides

### 3. Release Coordination
- Orchestrate multi-package releases
- Manage release dependencies
- Coordinate with CI/CD
- Handle rollback procedures

### 4. Publishing Management
- NPM package publishing
- GitHub release creation
- Documentation updates
- Announcement coordination

## Release Types

### Standard Release
- Regular feature releases
- Bug fix releases
- Security patches
- Performance improvements

### Coordinated Release
- Multiple packages released together
- Breaking changes across packages
- Major feature launches
- Platform upgrades

### Emergency Release
- Critical security fixes
- Production bug fixes
- Hotfix deployments
- Rollback releases

## Versioning Strategy

### Semantic Versioning
- **Major** (X.0.0): Breaking changes
- **Minor** (0.X.0): New features (backward compatible)
- **Patch** (0.0.X): Bug fixes

### Pre-release Versions
- Alpha: `1.0.0-alpha.1`
- Beta: `1.0.0-beta.1`
- RC: `1.0.0-rc.1`
- Canary: `1.0.0-canary.sha`

### Package Relationships
```json
{
  "yakkl-core": "2.0.0",
  "yakkl-wallet": "1.5.0 (depends on core@^2.0.0)",
  "yakkl-sdk": "1.2.0 (depends on core@^2.0.0)"
}
```

## Release Process

### 1. Pre-Release Checks
```bash
# Run all tests
pnpm test:all

# Check for breaking changes
pnpm run check:breaking

# Verify dependencies
pnpm run verify:deps

# Audit security
pnpm audit
```

### 2. Version Determination
```bash
# Analyze commits since last release
pnpm run analyze:commits

# Suggest version bumps
pnpm run suggest:versions

# Update versions
pnpm run version:update
```

### 3. Changelog Generation
```bash
# Generate changelogs
pnpm run changelog:generate

# Review and edit
pnpm run changelog:review

# Commit changes
git commit -m "chore: release preparation"
```

### 4. Release Execution
```bash
# Build all packages
pnpm run build:all

# Create git tags
pnpm run tag:create

# Publish to NPM
pnpm run publish:all

# Create GitHub releases
pnpm run github:release
```

## Release Checklist

### Pre-Release
- [ ] All tests passing
- [ ] No security vulnerabilities
- [ ] Dependencies updated
- [ ] Breaking changes documented
- [ ] Migration guides written
- [ ] Version bumps determined

### During Release
- [ ] Packages built successfully
- [ ] Tags created correctly
- [ ] NPM publish successful
- [ ] GitHub releases created
- [ ] Documentation updated
- [ ] Announcements prepared

### Post-Release
- [ ] Verify NPM packages
- [ ] Test installation
- [ ] Monitor error rates
- [ ] Check user feedback
- [ ] Update roadmap
- [ ] Plan next release

## Changelog Format

```markdown
# Changelog

## [2.0.0] - 2024-01-15

### BREAKING CHANGES
- Changed API signature for `wallet.connect()`
- Removed deprecated `getLegacyState()` method

### Features
- Added WalletConnect v3 support
- Implemented new caching strategy
- Enhanced security module

### Bug Fixes
- Fixed state synchronization issue (#123)
- Resolved memory leak in event listeners (#124)

### Performance
- Improved bundle size by 20%
- Optimized rendering performance

### Dependencies
- Updated ethers to v6.0.0
- Added @walletconnect/web3wallet
```

## Rollback Procedures

### Immediate Rollback
1. Identify issue in release
2. Revert NPM publish (if possible)
3. Create patch release
4. Notify users immediately

### Gradual Rollback
1. Mark version as deprecated
2. Release previous version as latest
3. Provide migration path
4. Monitor adoption

## Automation Scripts

### Version Bump Script
```typescript
async function bumpVersions(packages: string[], type: 'major' | 'minor' | 'patch') {
  // Implementation
}
```

### Release Coordination
```typescript
async function coordinateRelease(packages: Package[]) {
  // Pre-release checks
  // Version updates
  // Build and test
  // Publish
  // Post-release tasks
}
```

## Integration Points
- Receives input from: impact-analyzer.md
- Coordinates with: monorepo-coordinator.md
- Uses data from: dependency-analyzer.md
- Triggers: CI/CD pipelines

## Best Practices
1. Never release on Fridays
2. Always have rollback plan
3. Test release process in staging
4. Coordinate with team before major releases
5. Monitor metrics after release
6. Document all release decisions

## Release Communication
- Internal team notification
- Changelog publication
- Social media announcements
- Email to registered users
- Documentation updates
- Support team briefing