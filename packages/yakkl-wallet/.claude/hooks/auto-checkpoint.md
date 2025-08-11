# 🔴 Auto-Checkpoint Hook Configuration

This hook automatically creates checkpoints at key moments during development.

## Setup

Add to your Claude settings.json:

```json
{
  "hooks": {
    "preWrite": "git tag -a checkpoint-$(date +%Y%m%d-%H%M%S) -m 'Auto checkpoint before file write'",
    "postWrite": "",
    "preEdit": "git add -A && git commit -m 'WIP: checkpoint before edit' || true",
    "postEdit": "",
    "preMultiEdit": "git add -A && git commit -m 'WIP: checkpoint before multi-edit' || true"
  }
}
```

## Advanced Hook Script

Create `.claude/hooks/checkpoint.sh`:

```bash
#!/bin/bash

# Auto-checkpoint script for Claude Code

checkpoint_type=$1
description=$2

# Function to create checkpoint
create_checkpoint() {
    local type=$1
    local desc=$2
    local timestamp=$(date +%Y%m%d-%H%M%S)
    
    # Check if there are changes
    if [[ -n $(git status --porcelain) ]]; then
        # Stage all changes
        git add -A
        
        # Create checkpoint commit
        git commit -m "CHECKPOINT: $type - $desc" --no-verify
    fi
    
    # Create checkpoint tag
    git tag -a "checkpoint-$timestamp" -m "$type: $desc"
    
    echo "✓ Checkpoint created: checkpoint-$timestamp"
}

# Function to check test status
check_tests() {
    # Run tests and capture exit code
    pnpm test 2>&1
    return $?
}

# Main logic
case $checkpoint_type in
    "pre-write")
        create_checkpoint "PRE_WRITE" "Before file modifications"
        ;;
    "post-test")
        if check_tests; then
            create_checkpoint "TESTS_PASS" "All tests passing"
        else
            echo "⚠️  Tests failing - checkpoint skipped"
        fi
        ;;
    "risky")
        create_checkpoint "RISKY_OP" "$description"
        ;;
    *)
        create_checkpoint "MANUAL" "$description"
        ;;
esac
```

Then reference in settings:
```json
{
  "hooks": {
    "preWrite": ".claude/hooks/checkpoint.sh pre-write",
    "postEdit": "[ -f 'package.json' ] && .claude/hooks/checkpoint.sh post-test"
  }
}
```

## Benefits of Each Approach

### Git Tags/Commits (Checkpoint System):
✅ **Pros:**
- Full version control integration
- Easy to see history with `git log`
- Can include detailed messages
- Works with existing git workflow
- Can be pushed to remote as backup

❌ **Cons:**
- Can clutter git history if too frequent
- Requires manual triggering (unless combined with hooks)

### Claude Hooks:
✅ **Pros:**
- Fully automatic
- Triggers on specific Claude operations
- Can run any script/command
- Integrates with your workflow

❌ **Cons:**
- Only works within Claude Code
- Need to configure hooks properly
- Can slow down operations if too complex