# YAKKL Wallet Agent Instructions

## How to Use Specialized Agents

### Quick Decision Tree
```
Is the task about...
├── Fetching blockchain data? → background-specialist
├── Updating UI components? → client-ui-specialist  
├── Connecting stores to services? → store-bridge-specialist
├── Validating architecture? → architecture-enforcer
└── Multiple contexts? → Use multiple agents in parallel
```

## Agent Invocation Examples

### Example 1: Token Balances Not Updating

```markdown
User: "Token balances aren't updating in the portfolio view"

Main Agent Action:
1. Invoke architecture-enforcer: "Validate token data flow"
2. Invoke store-bridge-specialist: "Trace token update path from background to UI"
3. Invoke background-specialist: "Check token fetching in background"
4. Invoke client-ui-specialist: "Verify PortfolioOverview reactivity"

[Agents work in parallel, each with their own context]

Results:
- Enforcer: "No violations found"
- Bridge: "token.store.ts missing storage listener at line 145"
- Background: "Tokens fetched and stored correctly"
- UI: "Component properly reactive"

Solution: Fix the missing storage listener in token.store.ts
```

### Example 2: Adding New Feature

```markdown
User: "Add a feature to export transaction history as CSV"

Main Agent Action:
1. Invoke architecture-enforcer: "Validate approach for CSV export"
2. Invoke client-ui-specialist: "Create export button in RecentActivity"
3. Invoke store-bridge-specialist: "Add export method to transaction.store"
4. Invoke background-specialist: "Implement CSV generation in background"

Tasks distributed:
- UI Agent: Creates button, handles click
- Store Agent: Adds exportTransactions() method
- Background Agent: Generates CSV from transaction data
- Enforcer: Ensures no direct file access in UI
```

### Example 3: Performance Issue

```markdown
User: "The wallet is slow when switching accounts"

Main Agent Action:
1. Invoke background-specialist: "Profile account switch in background"
2. Invoke store-bridge-specialist: "Check store update efficiency"
3. Invoke client-ui-specialist: "Check for unnecessary re-renders"

[Parallel investigation]

Results identify bottleneck in wallet-cache.store.ts
```

## Agent Task Templates

### For Background Specialist
```markdown
Task: [Specific background task]
Context: Need to [fetch/update/monitor] [data type]
Check: /background/services/[relevant-service].ts
Expected: Updates to STORAGE_YAKKL_[KEY]
```

### For Client UI Specialist
```markdown
Task: [Specific UI task]
Component: [Component name]
Stores needed: [List of stores]
User action: [What triggers this]
Expected: Reactive update when store changes
```

### For Store Bridge Specialist
```markdown
Task: Connect [background service] to [UI component]
Data flow: Background → [Storage key] → [Store] → Component
Service method: [Method name]
Store update: [Update pattern]
```

### For Architecture Enforcer
```markdown
Task: Validate [feature/fix/refactor]
Files changed: [List of files]
Check for: [Specific violations to look for]
Expected: Confirmation of architectural compliance
```

## When to Use Multiple Agents

### Parallel Tasks (Different Contexts)
```javascript
// These can run simultaneously:
- Background agent: Fix token fetching
- UI agent: Add loading spinner
- Store agent: Implement caching
```

### Sequential Tasks (Dependencies)
```javascript
// These must run in order:
1. Architecture enforcer: Validate approach
2. Background agent: Implement data fetching
3. Store agent: Connect to background
4. UI agent: Display the data
```

## Agent Communication Pattern

```markdown
Main Agent (Orchestrator)
├── Receives user request
├── Analyzes which contexts are involved
├── Dispatches to specialized agents
├── Collects results
├── Synthesizes solution
└── Implements fixes

Specialized Agents
├── Work in isolation (own context window)
├── Cannot see other contexts
├── Return specific, focused results
└── Maintain architectural boundaries
```

## Common Multi-Agent Patterns

### Pattern 1: Data Not Displaying
```
1. architecture-enforcer: Validate data flow
2. background-specialist: Verify data fetching
3. store-bridge-specialist: Check store subscriptions
4. client-ui-specialist: Verify component reactivity
```

### Pattern 2: New Feature Implementation
```
1. architecture-enforcer: Design validation
2. background-specialist: Backend implementation
3. store-bridge-specialist: State management
4. client-ui-specialist: UI implementation
```

### Pattern 3: Bug Fix
```
1. architecture-enforcer: Identify violation
2. [Relevant specialist]: Fix the issue
3. architecture-enforcer: Validate fix
```

### Pattern 4: Performance Optimization
```
Parallel:
- background-specialist: Optimize queries
- store-bridge-specialist: Optimize updates
- client-ui-specialist: Optimize rendering
```

## Agent Context Preservation

Each agent maintains its own context:
- **Background**: Only sees /background files
- **UI**: Only sees /src files  
- **Store Bridge**: Sees stores and services
- **Enforcer**: Sees all files but only validates

This prevents:
- Context pollution
- Cross-boundary violations
- Confusion about responsibilities

## Success Metrics

✅ **Good Agent Usage**
- Each agent stays in its domain
- No architecture violations
- Clear separation of concerns
- Parallel execution when possible

❌ **Poor Agent Usage**
- Using one agent for everything
- Agents accessing wrong context
- Sequential when could be parallel
- Ignoring enforcer warnings

## Quick Reference Card

| Task Type | Primary Agent | Support Agents |
|-----------|--------------|----------------|
| Blockchain data issue | background-specialist | store-bridge-specialist |
| UI not updating | client-ui-specialist | store-bridge-specialist |
| Performance issue | All agents (parallel) | architecture-enforcer |
| New feature | architecture-enforcer first | Then others as needed |
| Store not syncing | store-bridge-specialist | background-specialist |
| Architecture violation | architecture-enforcer | None |
| Transaction issue | background-specialist | store-bridge-specialist |
| Component styling | client-ui-specialist | None |
| Data flow tracing | store-bridge-specialist | architecture-enforcer |

## Remember

1. **Agents run in parallel** - Each has its own 200k context
2. **Agents enforce boundaries** - They can't violate architecture
3. **Use the right agent** - Don't use UI agent for blockchain work
4. **Trust the enforcer** - It prevents future problems
5. **Main agent orchestrates** - You coordinate the specialists

This system ensures:
- No orphaned code
- No duplicate implementations  
- Consistent architecture
- Efficient context usage
- Faster, accurate solutions