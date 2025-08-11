#!/bin/bash
# Compilation check hook for YAKKL wallet
# Runs pnpm dev:wallet after code changes to ensure compilation succeeds

# Configuration
YAKKL_ROOT="/Users/hansjones/projects/lambdastack/yakkl/crypto/yakkl"
LOG_FILE="$YAKKL_ROOT/.claude/compilation.log"

# Function to check if file is source code
is_source_file() {
    local file=$1
    case "$file" in
        *.ts|*.js|*.svelte|*.tsx|*.jsx|*.mjs|*.cjs)
            return 0
            ;;
        *)
            return 1
            ;;
    esac
}

# Function to run compilation check
run_compilation_check() {
    echo "🔄 Running compilation check..."
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting compilation check" >> "$LOG_FILE"
    
    cd "$YAKKL_ROOT" || {
        echo "❌ Failed to change to YAKKL root directory"
        exit 1
    }
    
    # Run dev:wallet and capture output
    echo "📦 Running: pnpm run dev:wallet"
    
    # Create a temporary file for output
    TEMP_OUTPUT=$(mktemp)
    
    # Run the command with timeout
    timeout 60s pnpm run dev:wallet > "$TEMP_OUTPUT" 2>&1 &
    PID=$!
    
    # Show progress
    echo -n "Compiling"
    for i in {1..10}; do
        if ! kill -0 $PID 2>/dev/null; then
            break
        fi
        echo -n "."
        sleep 1
    done
    echo ""
    
    # Wait for completion or timeout
    wait $PID
    EXIT_CODE=$?
    
    # Check results
    if [ $EXIT_CODE -eq 0 ]; then
        echo "✅ Compilation successful!"
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] Compilation successful" >> "$LOG_FILE"
        
        # Play success sound
        if [ -f "$YAKKL_ROOT/.claude/hooks/task-complete-notify.sh" ]; then
            CLAUDE_HOOK_TYPE="compilation-success" "$YAKKL_ROOT/.claude/hooks/task-complete-notify.sh"
        fi
    elif [ $EXIT_CODE -eq 124 ]; then
        echo "⏱️  Compilation check timed out (normal for dev server)"
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] Dev server started successfully" >> "$LOG_FILE"
        
        # Kill the dev server
        pkill -f "pnpm run dev:wallet" 2>/dev/null
        
        # This is actually success for dev:wallet
        if [ -f "$YAKKL_ROOT/.claude/hooks/task-complete-notify.sh" ]; then
            CLAUDE_HOOK_TYPE="compilation-success" "$YAKKL_ROOT/.claude/hooks/task-complete-notify.sh"
        fi
    else
        echo "❌ Compilation failed!"
        echo "Error output:"
        cat "$TEMP_OUTPUT" | grep -E "Error:|error:|ERROR:" | head -10
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] Compilation failed with code $EXIT_CODE" >> "$LOG_FILE"
        
        # Play error sound
        if [ -f "$YAKKL_ROOT/.claude/hooks/task-complete-notify.sh" ]; then
            CLAUDE_HOOK_TYPE="compilation-error" "$YAKKL_ROOT/.claude/hooks/task-complete-notify.sh"
        fi
        
        echo ""
        echo "⚠️  Fix compilation errors before proceeding!"
    fi
    
    # Cleanup
    rm -f "$TEMP_OUTPUT"
    
    return $EXIT_CODE
}

# Main execution
case "$CLAUDE_HOOK_TYPE" in
    "post-write"|"post-edit"|"post-multi-edit")
        # Check if the changed file is source code
        if [ -n "$CLAUDE_FILE_PATH" ]; then
            if is_source_file "$CLAUDE_FILE_PATH"; then
                echo "🔍 Source code change detected: $CLAUDE_FILE_PATH"
                run_compilation_check
            fi
        else
            # No specific file, but might be multiple files
            echo "🔍 Code changes detected"
            run_compilation_check
        fi
        ;;
    "manual")
        # Manual trigger
        run_compilation_check
        ;;
esac

exit 0