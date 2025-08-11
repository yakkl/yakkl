# Context Command

Shows relevant project context and suggests appropriate agents for the current work.

## Usage
```
/context [area]
```

## Examples
```
# General context
/context

# Specific area context
/context ui
/context blockchain
/context security
/context stores
/context testing
```

## What it does

The context command analyzes your current work area and provides:

1. **Relevant Documentation**
   - Links to applicable sections in PROJECT_CONTEXT.md
   - Related agent descriptions
   - Specific rules that apply

2. **Suggested Workflow**
   - Which agent to start with
   - Recommended agent sequence
   - Common patterns for the task type

3. **Quick References**
   - Essential commands
   - File locations
   - Import patterns
   - Common gotchas

## Context Areas

### UI Development (`/context ui`)
- Component patterns
- Svelte 5 runes usage
- Modal implementation
- Store integration
- **Primary Agent**: wallet-component-builder
- **Rules**: #7-9, #20, #22

### Blockchain (`/context blockchain`)
- Transaction patterns
- Contract integration
- Gas optimization
- Background context requirements
- **Primary Agent**: blockchain-integration
- **Rules**: #4, #5, #6, #10, #15

### Security (`/context security`)
- Key management
- Encryption patterns
- Context isolation
- Logging practices
- **Primary Agent**: security-auditor
- **Rules**: #4, #18, #19

### State Management (`/context stores`)
- Store patterns
- Cross-context communication
- Encryption requirements
- Persistence strategies
- **Primary Agent**: store-manager
- **Rules**: #20.1, #20.2

### Testing (`/context testing`)
- Test patterns
- Mock strategies
- Coverage requirements
- **Primary Agent**: test-runner

## Integration with Workflow

After getting context, typical workflow:
1. Review provided context
2. Use suggested primary agent
3. Follow recommended patterns
4. Check applicable rules
5. Update documentation if needed

The context command helps ensure you're using the right tools and following project conventions from the start.