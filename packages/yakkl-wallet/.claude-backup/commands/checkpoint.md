# 🔴 Checkpoint System

Create and manage development checkpoints to easily revert changes if something goes wrong.

## Usage
```
# Create a checkpoint
/checkpoint create "description"

# List checkpoints
/checkpoint list

# Revert to checkpoint
/checkpoint revert <checkpoint-id>

# Delete old checkpoints
/checkpoint clean
```

## What it does

### Creating Checkpoints
1. Commits current work (if any)
2. Creates a lightweight tag with timestamp
3. Saves current branch state
4. Records checkpoint metadata

### Checkpoint Format
- Tag: `checkpoint-YYYYMMDD-HHMMSS`
- Description stored in tag message
- Branch reference saved

### Reverting
When reverting to a checkpoint:
1. Confirms action with user
2. Creates backup of current state
3. Resets to checkpoint state
4. Shows what changed

### Auto-checkpoint Integration
Can be triggered automatically:
- Before risky operations
- After successful test runs
- On schedule (hourly/daily)

## Examples

```bash
# Before making breaking changes
/checkpoint create "before refactoring auth system"

# After tests pass
/checkpoint create "all tests passing - stable state"

# Revert if things go wrong
/checkpoint revert checkpoint-20240127-143022
```

## Safety Features
- Always creates backup before reverting
- Shows diff before applying revert
- Preserves uncommitted changes in stash
- Can undo revert operation