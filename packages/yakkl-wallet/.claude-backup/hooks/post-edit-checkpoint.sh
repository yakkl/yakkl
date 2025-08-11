#!/bin/bash
# Post-edit checkpoint hook - Creates checkpoint after significant edits

# Track edit count
EDIT_COUNT_FILE=".claude/.edit-count"
mkdir -p .claude

# Increment edit counter
if [ -f "$EDIT_COUNT_FILE" ]; then
    count=$(cat "$EDIT_COUNT_FILE")
    count=$((count + 1))
else
    count=1
fi
echo "$count" > "$EDIT_COUNT_FILE"

# Create checkpoint every 5 edits or for critical files
is_critical=false
if [[ "$CLAUDE_FILE_PATH" =~ (wallet|auth|crypto|security|key|private|transaction)\. ]]; then
    is_critical=true
fi

if [ $((count % 5)) -eq 0 ] || [ "$is_critical" = true ]; then
    echo "🔄 Creating checkpoint after edits"
    
    # Get current branch
    branch=$(git branch --show-current)
    
    # Create checkpoint
    git add -A 2>/dev/null
    git commit -m "CHECKPOINT: After editing $CLAUDE_FILE_PATH (edit #$count)" --no-verify 2>/dev/null || true
    
    # Tag if critical
    if [ "$is_critical" = true ]; then
        git tag -a "checkpoint-$(date +%Y%m%d-%H%M%S)" -m "CRITICAL_EDIT: $CLAUDE_FILE_PATH" 2>/dev/null
        echo "⚠️  Critical file edited - checkpoint tagged"
    fi
    
    # Reset counter after checkpoint
    echo "0" > "$EDIT_COUNT_FILE"
fi

exit 0