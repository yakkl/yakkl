#!/bin/bash

# Migration script for existing Claude setups to orchestration model
# Usage: ./scripts/migrate-claude-to-orchestration.sh [package-name]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ROOT_DIR=$(pwd)
PACKAGE_NAME=$1

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Claude Code Orchestration Migration  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Check if we're in the root directory
if [ ! -f "pnpm-workspace.yaml" ]; then
    echo -e "${RED}Error: This script must be run from the monorepo root directory${NC}"
    exit 1
fi

# Function to backup existing Claude configuration
backup_claude_config() {
    local pkg_path=$1
    local backup_dir="${pkg_path}/.claude-backup-$(date +%Y%m%d-%H%M%S)"
    
    if [ -d "${pkg_path}/.claude" ]; then
        echo -e "${YELLOW}Backing up existing .claude directory...${NC}"
        cp -r "${pkg_path}/.claude" "$backup_dir"
        echo -e "${GREEN}✓${NC} Backup created at: $backup_dir"
        return 0
    fi
    return 1
}

# Function to identify shared agents
identify_shared_agents() {
    local pkg_path=$1
    local agents_dir="${pkg_path}/.claude/agents"
    
    if [ ! -d "$agents_dir" ]; then
        return
    fi
    
    echo -e "${BLUE}Identifying shareable agents...${NC}"
    
    # List of commonly shared agent patterns
    local shared_patterns=(
        "test-runner"
        "security-auditor"
        "performance-optimizer"
        "documentation-updater"
        "architecture-enforcer"
    )
    
    for pattern in "${shared_patterns[@]}"; do
        for agent in "$agents_dir"/*"$pattern"*.md; do
            if [ -f "$agent" ]; then
                local agent_name=$(basename "$agent")
                echo -e "  ${GREEN}✓${NC} Found shared agent: $agent_name"
                
                # Copy to root shared if not exists
                if [ ! -f "$ROOT_DIR/.claude/agents/shared/$agent_name" ]; then
                    cp "$agent" "$ROOT_DIR/.claude/agents/shared/"
                    echo -e "    → Copied to root shared agents"
                fi
            fi
        done
    done
}

# Function to migrate a single package
migrate_package() {
    local pkg_name=$1
    local pkg_path="packages/$pkg_name"
    
    echo -e "\n${BLUE}Migrating package: $pkg_name${NC}"
    echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    # Check if package exists
    if [ ! -d "$pkg_path" ]; then
        echo -e "${RED}Error: Package $pkg_path does not exist${NC}"
        return 1
    fi
    
    # Backup existing configuration
    if backup_claude_config "$pkg_path"; then
        echo -e "${GREEN}✓${NC} Existing configuration backed up"
    else
        echo -e "${YELLOW}⚠${NC} No existing .claude directory found"
    fi
    
    # Identify and extract shared agents
    identify_shared_agents "$pkg_path"
    
    # Run setup script for the package
    echo -e "${BLUE}Setting up orchestrated configuration...${NC}"
    ./scripts/setup-claude-package.sh "$pkg_name"
    
    # Migrate package-specific agents
    local old_agents="${pkg_path}/.claude-backup-"*/agents
    if ls $old_agents/*.md 2>/dev/null | grep -v shared > /dev/null; then
        echo -e "${BLUE}Migrating package-specific agents...${NC}"
        for agent in $old_agents/*.md; do
            if [ -f "$agent" ]; then
                local agent_name=$(basename "$agent")
                # Skip if it's a shared agent
                if ! grep -q "shared" <<< "$agent_name"; then
                    if [ ! -f "${pkg_path}/.claude/agents/$agent_name" ]; then
                        cp "$agent" "${pkg_path}/.claude/agents/"
                        echo -e "  ${GREEN}✓${NC} Migrated: $agent_name"
                    fi
                fi
            fi
        done
    fi
    
    # Update symlinks to use root shared agents
    echo -e "${BLUE}Updating symlinks...${NC}"
    cd "${pkg_path}/.claude/agents"
    rm -f shared 2>/dev/null
    ln -sfn ../../../../.claude/agents/shared shared
    cd "$ROOT_DIR"
    echo -e "${GREEN}✓${NC} Symlinks updated"
    
    echo -e "${GREEN}✓${NC} Migration complete for $pkg_name"
}

# Function to migrate all packages
migrate_all_packages() {
    echo -e "${BLUE}Migrating all packages...${NC}"
    
    for pkg_dir in packages/*/; do
        if [ -d "$pkg_dir" ]; then
            local pkg_name=$(basename "$pkg_dir")
            migrate_package "$pkg_name"
        fi
    done
}

# Function to verify migration
verify_migration() {
    echo -e "\n${BLUE}Verifying migration...${NC}"
    echo -e "━━━━━━━━━━━━━━━━━━━━━━"
    
    # Check root structure
    echo -e "${BLUE}Root structure:${NC}"
    if [ -d ".claude/orchestration" ]; then
        echo -e "  ${GREEN}✓${NC} Orchestration agents present"
    else
        echo -e "  ${RED}✗${NC} Orchestration agents missing"
    fi
    
    if [ -d ".claude/agents/shared" ]; then
        local shared_count=$(ls .claude/agents/shared/*.md 2>/dev/null | wc -l)
        echo -e "  ${GREEN}✓${NC} Shared agents: $shared_count found"
    else
        echo -e "  ${RED}✗${NC} Shared agents directory missing"
    fi
    
    # Check package symlinks
    echo -e "\n${BLUE}Package symlinks:${NC}"
    for pkg_dir in packages/*/; do
        if [ -L "${pkg_dir}.claude/agents/shared" ]; then
            local pkg_name=$(basename "$pkg_dir")
            if [ -e "${pkg_dir}.claude/agents/shared" ]; then
                echo -e "  ${GREEN}✓${NC} $pkg_name: symlink valid"
            else
                echo -e "  ${YELLOW}⚠${NC} $pkg_name: symlink broken"
            fi
        fi
    done
}

# Main execution
if [ -z "$PACKAGE_NAME" ]; then
    echo -e "${YELLOW}No package specified. Migrating all packages...${NC}"
    
    # Ensure root structure exists
    mkdir -p .claude/{orchestration,agents/shared,commands/shared,hooks/shared,scripts}
    
    migrate_all_packages
else
    # Ensure root structure exists
    mkdir -p .claude/{orchestration,agents/shared,commands/shared,hooks/shared,scripts}
    
    migrate_package "$PACKAGE_NAME"
fi

# Verify the migration
verify_migration

echo -e "\n${GREEN}════════════════════════════════${NC}"
echo -e "${GREEN}  Migration Complete!${NC}"
echo -e "${GREEN}════════════════════════════════${NC}"
echo ""
echo -e "Next steps:"
echo -e "1. Review the migration results above"
echo -e "2. Check backup directories for any custom configurations"
echo -e "3. Update package-specific CLAUDE.md files as needed"
echo -e "4. Test Claude Code at both root and package levels"
echo ""
echo -e "${BLUE}Documentation:${NC} docs/claude-code-organization.md"