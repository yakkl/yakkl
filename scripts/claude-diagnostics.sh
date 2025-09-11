#!/bin/bash

# Claude Code Orchestration Diagnostic Script
# Usage: ./scripts/claude-diagnostics.sh [--fix]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Options
FIX_MODE=false
if [ "$1" == "--fix" ]; then
    FIX_MODE=true
fi

# Statistics
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNINGS=0

echo -e "${CYAN}╔══════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║   Claude Code Orchestration Diagnostics   ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════╝${NC}"
echo ""

# Function to check and report
check() {
    local description=$1
    local condition=$2
    local fix_command=$3
    
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    if eval "$condition"; then
        echo -e "${GREEN}✓${NC} $description"
        PASSED_CHECKS=$((PASSED_CHECKS + 1))
        return 0
    else
        echo -e "${RED}✗${NC} $description"
        FAILED_CHECKS=$((FAILED_CHECKS + 1))
        
        if [ "$FIX_MODE" == true ] && [ -n "$fix_command" ]; then
            echo -e "  ${YELLOW}→ Attempting fix...${NC}"
            eval "$fix_command"
            if eval "$condition"; then
                echo -e "  ${GREEN}✓ Fixed!${NC}"
                FAILED_CHECKS=$((FAILED_CHECKS - 1))
                PASSED_CHECKS=$((PASSED_CHECKS + 1))
            else
                echo -e "  ${RED}✗ Fix failed${NC}"
            fi
        elif [ -n "$fix_command" ]; then
            echo -e "  ${YELLOW}→ To fix: $fix_command${NC}"
        fi
        return 1
    fi
}

# Function to warn
warn() {
    local description=$1
    echo -e "${YELLOW}⚠${NC} $description"
    WARNINGS=$((WARNINGS + 1))
}

# Check if in root directory
echo -e "${BLUE}Checking environment...${NC}"
check "In monorepo root directory" \
      "[ -f 'pnpm-workspace.yaml' ]" \
      ""

echo ""
echo -e "${BLUE}Checking root Claude structure...${NC}"

# Check root .claude directory
check "Root .claude directory exists" \
      "[ -d '.claude' ]" \
      "mkdir -p .claude"

check "Orchestration agents directory exists" \
      "[ -d '.claude/orchestration' ]" \
      "mkdir -p .claude/orchestration"

check "Shared agents directory exists" \
      "[ -d '.claude/agents/shared' ]" \
      "mkdir -p .claude/agents/shared"

check "Shared commands directory exists" \
      "[ -d '.claude/commands/shared' ]" \
      "mkdir -p .claude/commands/shared"

check "Shared hooks directory exists" \
      "[ -d '.claude/hooks/shared' ]" \
      "mkdir -p .claude/hooks/shared"

check "Root settings.json exists" \
      "[ -f '.claude/settings.json' ]" \
      "cp scripts/templates/root-settings.json .claude/settings.json 2>/dev/null || echo '{\"project\":\"monorepo\"}' > .claude/settings.json"

check "Root .claudeignore exists" \
      "[ -f '.claude/.claudeignore' ]" \
      "echo 'node_modules/' > .claude/.claudeignore"

# Check orchestration agents
echo ""
echo -e "${BLUE}Checking orchestration agents...${NC}"

for agent in "monorepo-coordinator" "dependency-analyzer" "impact-analyzer" "release-manager"; do
    check "$agent.md exists" \
          "[ -f '.claude/orchestration/$agent.md' ]" \
          ""
done

# Check shared agents
echo ""
echo -e "${BLUE}Checking shared agents...${NC}"

SHARED_AGENT_COUNT=$(ls .claude/agents/shared/*.md 2>/dev/null | wc -l)
if [ "$SHARED_AGENT_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓${NC} Found $SHARED_AGENT_COUNT shared agents"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
else
    echo -e "${YELLOW}⚠${NC} No shared agents found"
    WARNINGS=$((WARNINGS + 1))
fi
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

# Check packages
echo ""
echo -e "${BLUE}Checking package configurations...${NC}"

CONFIGURED_PACKAGES=0
BROKEN_SYMLINKS=0
PACKAGE_COUNT=0

for pkg_dir in packages/*/; do
    if [ -d "$pkg_dir" ]; then
        PACKAGE_COUNT=$((PACKAGE_COUNT + 1))
        pkg_name=$(basename "$pkg_dir")
        
        # Check if package has .claude directory
        if [ -d "${pkg_dir}.claude" ]; then
            CONFIGURED_PACKAGES=$((CONFIGURED_PACKAGES + 1))
            
            # Check symlinks
            if [ -L "${pkg_dir}.claude/agents/shared" ]; then
                if [ -e "${pkg_dir}.claude/agents/shared" ]; then
                    echo -e "  ${GREEN}✓${NC} $pkg_name: configured with valid symlinks"
                else
                    echo -e "  ${RED}✗${NC} $pkg_name: broken symlink"
                    BROKEN_SYMLINKS=$((BROKEN_SYMLINKS + 1))
                    
                    if [ "$FIX_MODE" == true ]; then
                        echo -e "    ${YELLOW}→ Fixing symlink...${NC}"
                        cd "${pkg_dir}.claude/agents"
                        rm -f shared
                        ln -sfn ../../../../.claude/agents/shared shared
                        cd - > /dev/null
                        echo -e "    ${GREEN}✓ Fixed!${NC}"
                        BROKEN_SYMLINKS=$((BROKEN_SYMLINKS - 1))
                    fi
                fi
            else
                echo -e "  ${YELLOW}⚠${NC} $pkg_name: no symlink to shared agents"
                
                if [ "$FIX_MODE" == true ]; then
                    echo -e "    ${YELLOW}→ Creating symlink...${NC}"
                    mkdir -p "${pkg_dir}.claude/agents"
                    cd "${pkg_dir}.claude/agents"
                    ln -sfn ../../../../.claude/agents/shared shared
                    cd - > /dev/null
                    echo -e "    ${GREEN}✓ Created!${NC}"
                fi
            fi
        else
            echo -e "  ${YELLOW}⚠${NC} $pkg_name: not configured"
            
            if [ "$FIX_MODE" == true ]; then
                echo -e "    ${YELLOW}→ Running setup...${NC}"
                ./scripts/setup-claude-package.sh "$pkg_name" > /dev/null 2>&1
                if [ -d "${pkg_dir}.claude" ]; then
                    echo -e "    ${GREEN}✓ Configured!${NC}"
                    CONFIGURED_PACKAGES=$((CONFIGURED_PACKAGES + 1))
                else
                    echo -e "    ${RED}✗ Setup failed${NC}"
                fi
            fi
        fi
    fi
done

echo ""
echo -e "${BLUE}Package Summary:${NC}"
echo -e "  Total packages: $PACKAGE_COUNT"
echo -e "  Configured: $CONFIGURED_PACKAGES"
echo -e "  Not configured: $((PACKAGE_COUNT - CONFIGURED_PACKAGES))"
if [ "$BROKEN_SYMLINKS" -gt 0 ]; then
    echo -e "  ${RED}Broken symlinks: $BROKEN_SYMLINKS${NC}"
fi

# Check scripts
echo ""
echo -e "${BLUE}Checking scripts...${NC}"

check "setup-claude-package.sh exists" \
      "[ -f 'scripts/setup-claude-package.sh' ]" \
      ""

check "setup-claude-package.sh is executable" \
      "[ -x 'scripts/setup-claude-package.sh' ]" \
      "chmod +x scripts/setup-claude-package.sh"

check "migrate-claude-to-orchestration.sh exists" \
      "[ -f 'scripts/migrate-claude-to-orchestration.sh' ]" \
      ""

check "migrate-claude-to-orchestration.sh is executable" \
      "[ -x 'scripts/migrate-claude-to-orchestration.sh' ]" \
      "chmod +x scripts/migrate-claude-to-orchestration.sh"

# Check documentation
echo ""
echo -e "${BLUE}Checking documentation...${NC}"

check "Root CLAUDE.md exists" \
      "[ -f 'CLAUDE.md' ]" \
      ""

check "Orchestration documentation exists" \
      "[ -f 'docs/claude-code-organization.md' ]" \
      ""

# Check for common issues
echo ""
echo -e "${BLUE}Checking for common issues...${NC}"

# Check for duplicate agents
DUPLICATE_AGENTS=$(find packages -name "*.md" -path "*/.claude/agents/*" ! -path "*/shared/*" -exec basename {} \; 2>/dev/null | sort | uniq -d)
if [ -z "$DUPLICATE_AGENTS" ]; then
    echo -e "${GREEN}✓${NC} No duplicate agents found across packages"
else
    warn "Duplicate agents found (consider moving to shared):"
    echo "$DUPLICATE_AGENTS" | while read agent; do
        echo -e "    - $agent"
    done
fi

# Check for old backup directories
OLD_BACKUPS=$(find packages -type d -name ".claude-backup*" 2>/dev/null | wc -l)
if [ "$OLD_BACKUPS" -gt 0 ]; then
    warn "Found $OLD_BACKUPS old backup directories"
    if [ "$FIX_MODE" == true ]; then
        echo -e "  ${YELLOW}→ Cleaning up old backups...${NC}"
        find packages -type d -name ".claude-backup*" -exec rm -rf {} + 2>/dev/null
        echo -e "  ${GREEN}✓ Cleaned!${NC}"
    else
        echo -e "  ${YELLOW}→ To clean: find packages -type d -name '.claude-backup*' -exec rm -rf {} +${NC}"
    fi
fi

# Performance checks
echo ""
echo -e "${BLUE}Performance analysis...${NC}"

# Count total agents
TOTAL_AGENTS=$(find . -name "*.md" -path "*/.claude/agents/*" 2>/dev/null | wc -l)
echo -e "  Total agents: $TOTAL_AGENTS"

# Count shared vs specific
SHARED_COUNT=$(find .claude/agents/shared -name "*.md" 2>/dev/null | wc -l)
SPECIFIC_COUNT=$(find packages -name "*.md" -path "*/.claude/agents/*" ! -path "*/shared/*" 2>/dev/null | wc -l)
echo -e "  Shared agents: $SHARED_COUNT"
echo -e "  Package-specific agents: $SPECIFIC_COUNT"

# Check symlink effectiveness
SYMLINK_COUNT=$(find packages -type l -path "*/.claude/*" 2>/dev/null | wc -l)
echo -e "  Active symlinks: $SYMLINK_COUNT"

# Summary
echo ""
echo -e "${CYAN}═════════════════════════════════════════${NC}"
echo -e "${CYAN}                 Summary                  ${NC}"
echo -e "${CYAN}═════════════════════════════════════════${NC}"

if [ "$FAILED_CHECKS" -eq 0 ] && [ "$WARNINGS" -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed! ($PASSED_CHECKS/$TOTAL_CHECKS)${NC}"
    echo -e "${GREEN}Your Claude Code orchestration is properly configured.${NC}"
    exit 0
elif [ "$FAILED_CHECKS" -eq 0 ]; then
    echo -e "${GREEN}✓ Core checks passed: $PASSED_CHECKS/$TOTAL_CHECKS${NC}"
    echo -e "${YELLOW}⚠ Warnings: $WARNINGS${NC}"
    echo -e "${YELLOW}Some optimizations available. Run with --fix to apply.${NC}"
    exit 0
else
    echo -e "${RED}✗ Failed checks: $FAILED_CHECKS${NC}"
    echo -e "${GREEN}✓ Passed checks: $PASSED_CHECKS${NC}"
    echo -e "${YELLOW}⚠ Warnings: $WARNINGS${NC}"
    
    if [ "$FIX_MODE" == false ]; then
        echo ""
        echo -e "${YELLOW}Run with --fix flag to attempt automatic fixes:${NC}"
        echo -e "  ${CYAN}./scripts/claude-diagnostics.sh --fix${NC}"
    fi
    exit 1
fi