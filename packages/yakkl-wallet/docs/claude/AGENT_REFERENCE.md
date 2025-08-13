# Claude Code Agent Reference Guide

## Agent Metadata Legend
- 🔴 **CRITICAL** - Essential for safety/stability, always use before risky operations
- 🟠 **HIGH PRIORITY** - Use proactively for important tasks
- 🟢 **RECOMMENDED** - Enhances quality, use when applicable
- 🔵 **SPECIALIZED** - Use for specific domain tasks
- ⚪ **UTILITY** - Helper agents for workflow optimization

## Available Agents

### 🔴 project-architect
**Priority**: CRITICAL  
**Usage**: AUTOMATIC - Must be invoked FIRST for any significant development task  
**Tools**: Read, Grep, Glob, Task  
**Purpose**: Master architect and context expert for YAKKL Smart Wallet v2. Provides architectural guidance and ensures compliance with project rules.  
**When to use**:
- Starting any new feature development
- Making architectural decisions
- Ensuring code consistency
- Understanding codebase structure

### 🔴 security-auditor
**Priority**: CRITICAL  
**Usage**: AUTOMATIC - Use proactively for any security-sensitive changes  
**Tools**: Read, Grep, Glob, Bash, WebFetch  
**Purpose**: Security audit specialist for crypto wallets. Reviews code for vulnerabilities and ensures protection of user funds and private keys.  
**When to use**:
- Any changes to authentication/authorization
- Private key handling modifications
- Transaction signing updates
- Security-sensitive features

### 🔴 checkpoint-manager
**Priority**: CRITICAL  
**Usage**: AUTOMATIC - Use proactively before risky operations  
**Tools**: Bash, Read, Grep  
**Purpose**: Automatic checkpoint creation specialist. Creates git-based restore points for easy rollback.  
**When to use**:
- Before major refactoring
- Before risky operations
- After successful milestones
- When explicitly requested

### 🟠 test-runner
**Priority**: HIGH  
**Usage**: AUTOMATIC - Must be used after implementing features  
**Tools**: Read, Write, MultiEdit, Edit, Bash, Grep, Glob  
**Purpose**: Automated testing specialist for running and fixing tests. Ensures comprehensive test coverage.  
**When to use**:
- After implementing new features
- After fixing bugs
- When tests fail
- For test coverage analysis

### 🟠 performance-optimizer
**Priority**: HIGH  
**Usage**: PROACTIVE - Use to analyze and optimize performance  
**Tools**: Read, Write, MultiEdit, Edit, Bash, Grep, Glob  
**Purpose**: Performance optimization specialist for bundle size, load times, and runtime efficiency.  
**When to use**:
- Analyzing bundle sizes
- Optimizing load times
- Improving runtime performance
- Reducing memory usage

### 🟠 blockchain-integration
**Priority**: HIGH  
**Usage**: PROACTIVE - Use for Web3/blockchain operations  
**Tools**: Read, Write, MultiEdit, Edit, Grep, Glob, Bash, WebFetch  
**Purpose**: Blockchain and Web3 integration specialist for smart contracts, transactions, and DeFi operations.  
**When to use**:
- Smart contract interactions
- Transaction handling
- Gas optimization
- Web3 library integration

### 🟢 documentation-updater
**Priority**: RECOMMENDED  
**Usage**: PROACTIVE - Use after code changes  
**Tools**: Read, Write, MultiEdit, Edit, Bash, Grep, Glob, Task  
**Purpose**: Documentation maintenance specialist that updates all documentation based on code changes.  
**When to use**:
- After implementing features
- After fixing bugs
- When APIs change
- For README updates

### 🟢 workflow-optimizer
**Priority**: RECOMMENDED  
**Usage**: PROACTIVE - Use to improve development efficiency  
**Tools**: Task, TodoWrite  
**Purpose**: Development workflow specialist that optimizes Claude Code interactions and suggests best practices.  
**When to use**:
- Structuring complex tasks
- Improving prompt efficiency
- Optimizing tool usage
- Workflow improvements

### 🔵 store-manager
**Priority**: SPECIALIZED  
**Usage**: PROACTIVE - Use for Svelte store operations  
**Tools**: Read, Write, MultiEdit, Edit, Grep, Glob  
**Purpose**: Svelte store architecture specialist for state management in the YAKKL wallet.  
**When to use**:
- Creating new stores
- Modifying store logic
- Implementing derived stores
- Complex state interactions

### 🔵 wallet-component-builder
**Priority**: SPECIALIZED  
**Usage**: PROACTIVE - Use for UI component development  
**Tools**: Read, Write, MultiEdit, Edit, Grep, Glob, WebFetch  
**Purpose**: Expert in building SvelteKit components for the YAKKL wallet UI with DaisyUI/Tailwind.  
**When to use**:
- Creating new components
- Modifying UI elements
- Implementing UI features
- Component optimization

### 🔵 v2-migration
**Priority**: SPECIALIZED  
**Usage**: PROACTIVE - Use for v2 migration tasks  
**Tools**: Read, Write, MultiEdit, Edit, Grep, Glob, Bash  
**Purpose**: V2 migration specialist for YAKKL wallet. Ensures feature parity and fixes compatibility issues.  
**When to use**:
- Implementing v2 features
- Fixing v1 compatibility
- Ensuring feature parity
- Migration troubleshooting

### ⚪ general-purpose
**Priority**: UTILITY  
**Usage**: MANUAL - Use for complex multi-step research  
**Tools**: All tools available  
**Purpose**: General-purpose agent for researching complex questions and executing multi-step tasks.  
**When to use**:
- Complex searches across codebase
- Multi-step research tasks
- When unsure which specialist to use
- Exploratory analysis

### ⚪ statusline-setup
**Priority**: UTILITY  
**Usage**: MANUAL - Use for status line configuration  
**Tools**: Read, Edit  
**Purpose**: Configure the user's Claude Code status line setting.  
**When to use**:
- Setting up status line
- Modifying status line configuration

### ⚪ output-style-setup
**Priority**: UTILITY  
**Usage**: MANUAL - Use for output style creation  
**Tools**: Read, Write, Edit, Glob, LS, Grep  
**Purpose**: Create a Claude Code output style.  
**When to use**:
- Customizing output formatting
- Creating output templates

## Parallel Execution Patterns

### Recommended Parallel Combinations

**For New Features:**
```
parallel: [project-architect, security-auditor, test-runner]
```

**For Performance Issues:**
```
parallel: [performance-optimizer, test-runner]
```

**For Security Updates:**
```
parallel: [security-auditor, checkpoint-manager, test-runner]
```

**For Documentation:**
```
parallel: [documentation-updater, workflow-optimizer]
```

## Usage Guidelines

### Automatic Invocation
Agents marked with **AUTOMATIC** or **PROACTIVE** will be triggered automatically when:
1. The task matches their specialization
2. The context requires their expertise
3. Risk mitigation is needed

### Manual Invocation
You can explicitly request agents:
- "Use the performance-optimizer to analyze bundle size"
- "Run security-auditor and test-runner in parallel"
- "Create a checkpoint before proceeding"

### Best Practices
1. **Let automation work** - Trust automatic agent invocation
2. **Be specific when needed** - Request specific agents for targeted analysis
3. **Use parallel execution** - Multiple agents can run simultaneously
4. **Critical path first** - project-architect → implementation → test-runner
5. **Safety first** - checkpoint-manager before risky operations

## Agent Communication
- Agents are stateless - each invocation is independent
- Provide detailed context in your request
- Agents return a final report that I'll summarize for you
- Results guide subsequent actions but aren't visible to you directly

## Updates and Maintenance
This reference is maintained as part of the YAKKL Smart Wallet v2 documentation.
Last updated: 2025-08-18