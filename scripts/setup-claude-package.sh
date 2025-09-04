#!/bin/bash

# Setup Claude configuration for a YAKKL package
# Usage: ./scripts/setup-claude-package.sh <package-name>

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if package name is provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: Package name is required${NC}"
    echo "Usage: $0 <package-name>"
    exit 1
fi

PACKAGE_NAME=$1
PACKAGE_DIR="packages/$PACKAGE_NAME"
ROOT_DIR=$(pwd)

# Check if we're in the root directory
if [ ! -f "pnpm-workspace.yaml" ]; then
    echo -e "${RED}Error: This script must be run from the monorepo root directory${NC}"
    exit 1
fi

# Check if package directory exists
if [ ! -d "$PACKAGE_DIR" ]; then
    echo -e "${RED}Error: Package directory $PACKAGE_DIR does not exist${NC}"
    exit 1
fi

echo -e "${GREEN}Setting up Claude configuration for $PACKAGE_NAME...${NC}"

# Create .claude directory structure
mkdir -p "$PACKAGE_DIR/.claude/agents"
mkdir -p "$PACKAGE_DIR/.claude/commands"
mkdir -p "$PACKAGE_DIR/.claude/hooks"

# Create symlinks to shared components
echo "Creating symlinks to shared components..."

# Symlink shared agents
if [ -d "$ROOT_DIR/.claude/agents/shared" ]; then
    ln -sfn "../../../../.claude/agents/shared" "$PACKAGE_DIR/.claude/agents/shared"
    echo -e "${GREEN}✓${NC} Linked shared agents"
else
    echo -e "${YELLOW}⚠${NC} Shared agents directory not found, skipping symlink"
fi

# Symlink shared commands
if [ -d "$ROOT_DIR/.claude/commands/shared" ]; then
    ln -sfn "../../../../.claude/commands/shared" "$PACKAGE_DIR/.claude/commands/shared"
    echo -e "${GREEN}✓${NC} Linked shared commands"
else
    echo -e "${YELLOW}⚠${NC} Shared commands directory not found, skipping symlink"
fi

# Symlink shared hooks
if [ -d "$ROOT_DIR/.claude/hooks/shared" ]; then
    ln -sfn "../../../../.claude/hooks/shared" "$PACKAGE_DIR/.claude/hooks/shared"
    echo -e "${GREEN}✓${NC} Linked shared hooks"
else
    echo -e "${YELLOW}⚠${NC} Shared hooks directory not found, skipping symlink"
fi

# Create package-specific settings.json if it doesn't exist
if [ ! -f "$PACKAGE_DIR/.claude/settings.json" ]; then
    cat > "$PACKAGE_DIR/.claude/settings.json" << EOF
{
  "package": "$PACKAGE_NAME",
  "description": "Claude configuration for $PACKAGE_NAME package",
  "extends": "../../../.claude/settings.json",
  "customCommands": {
    "build": "pnpm run build",
    "test": "pnpm run test",
    "lint": "pnpm run lint"
  }
}
EOF
    echo -e "${GREEN}✓${NC} Created settings.json"
else
    echo -e "${YELLOW}⚠${NC} settings.json already exists, skipping"
fi

# Create .claudeignore if it doesn't exist
if [ ! -f "$PACKAGE_DIR/.claude/.claudeignore" ]; then
    cat > "$PACKAGE_DIR/.claude/.claudeignore" << EOF
# Claude ignore patterns for $PACKAGE_NAME
node_modules/
dist/
build/
coverage/
*.log
.env
.env.local
EOF
    echo -e "${GREEN}✓${NC} Created .claudeignore"
else
    echo -e "${YELLOW}⚠${NC} .claudeignore already exists, skipping"
fi

# Create a package-specific agent template
AGENT_FILE="$PACKAGE_DIR/.claude/agents/${PACKAGE_NAME}-specialist.md"
if [ ! -f "$AGENT_FILE" ]; then
    cat > "$AGENT_FILE" << EOF
# $(echo $PACKAGE_NAME | sed 's/.*/\u&/') Specialist Agent

## Purpose
Specialized agent for working with the $PACKAGE_NAME package, understanding its specific patterns, dependencies, and requirements.

## Package Overview
- **Location**: packages/$PACKAGE_NAME
- **Purpose**: [Add package purpose here]
- **Key Dependencies**: [List key dependencies]
- **Integration Points**: [List other packages this integrates with]

## Responsibilities
1. Implement $PACKAGE_NAME-specific features
2. Maintain package architecture and patterns
3. Ensure compatibility with dependent packages
4. Optimize package performance
5. Maintain test coverage

## Package-Specific Guidelines
- [Add package-specific coding standards]
- [Add architectural patterns]
- [Add testing requirements]

## Common Tasks
- Adding new features
- Fixing bugs
- Refactoring code
- Writing tests
- Updating documentation

## Commands
\`\`\`bash
# Build the package
pnpm run build

# Run tests
pnpm run test

# Check types
pnpm run typecheck

# Lint code
pnpm run lint
\`\`\`

## Integration with Root Orchestrator
- Reports to: monorepo-coordinator.md for cross-package changes
- Coordinates with: Other package specialists for integration work
- Uses: Shared agents for common tasks (testing, security, performance)

## Best Practices
1. Follow package-specific patterns
2. Maintain backward compatibility
3. Document all public APIs
4. Write comprehensive tests
5. Consider performance implications
6. Coordinate breaking changes
EOF
    echo -e "${GREEN}✓${NC} Created package specialist agent template"
else
    echo -e "${YELLOW}⚠${NC} Package specialist agent already exists, skipping"
fi

# Create a basic CLAUDE.md for the package if it doesn't exist
if [ ! -f "$PACKAGE_DIR/CLAUDE.md" ]; then
    cat > "$PACKAGE_DIR/CLAUDE.md" << EOF
# CLAUDE.md - $PACKAGE_NAME

This file provides guidance to Claude Code when working with the $PACKAGE_NAME package.

## Package Overview
**Purpose**: [Describe the package purpose]
**Type**: [Library/Application/Service/etc]
**Status**: [Development/Production/Deprecated]

## Commands

### Development
- \`pnpm install\` - Install dependencies
- \`pnpm run dev\` - Start development mode
- \`pnpm run build\` - Build the package
- \`pnpm run test\` - Run tests
- \`pnpm run lint\` - Lint code
- \`pnpm run typecheck\` - Check TypeScript types

## Architecture
[Describe the package architecture]

## Key Files and Directories
- \`src/\` - Source code
- \`tests/\` - Test files
- \`dist/\` - Build output

## Dependencies
- Internal: [List internal package dependencies]
- External: [List key external dependencies]

## Integration Points
- Consumed by: [List packages that depend on this]
- Depends on: [List packages this depends on]
- APIs: [List exposed APIs]

## Development Guidelines
1. [Add package-specific guidelines]
2. [Add coding standards]
3. [Add testing requirements]

## Common Issues and Solutions
[Document common development issues and their solutions]
EOF
    echo -e "${GREEN}✓${NC} Created CLAUDE.md template"
else
    echo -e "${YELLOW}⚠${NC} CLAUDE.md already exists, skipping"
fi

# Verify symlinks are working
echo -e "\n${GREEN}Verifying setup...${NC}"
if [ -L "$PACKAGE_DIR/.claude/agents/shared" ] && [ -e "$PACKAGE_DIR/.claude/agents/shared" ]; then
    echo -e "${GREEN}✓${NC} Shared agents symlink is valid"
else
    echo -e "${YELLOW}⚠${NC} Shared agents symlink may not be working correctly"
fi

echo -e "\n${GREEN}✅ Claude configuration setup complete for $PACKAGE_NAME!${NC}"
echo -e "\nNext steps:"
echo "1. Edit $PACKAGE_DIR/CLAUDE.md to add package-specific information"
echo "2. Customize $AGENT_FILE with package details"
echo "3. Add any package-specific agents to $PACKAGE_DIR/.claude/agents/"
echo "4. Update settings.json with package-specific configurations"