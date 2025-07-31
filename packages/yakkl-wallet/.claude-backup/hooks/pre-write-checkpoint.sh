#!/bin/bash
# Pre-write checkpoint hook - Creates checkpoint before new files

# Only checkpoint if we're creating important files
if [[ "$CLAUDE_FILE_PATH" =~ \.(ts|js|svelte|sol|json)$ ]]; then
    # Check if file is new (doesn't exist)
    if [ ! -f "$CLAUDE_FILE_PATH" ]; then
        echo "🔄 Creating checkpoint before new file: $CLAUDE_FILE_PATH"
        
        # Create checkpoint
        git add -A 2>/dev/null
        git commit -m "CHECKPOINT: Before creating $CLAUDE_FILE_PATH" --no-verify 2>/dev/null || true
        git tag -a "checkpoint-$(date +%Y%m%d-%H%M%S)" -m "PRE_CREATE: $CLAUDE_FILE_PATH" 2>/dev/null
        
        echo "✅ Checkpoint created"
    fi
fi

# Always allow the operation to continue
exit 0