#!/bin/bash
# Analyze user prompt for risky operations and checkpoint if needed

# Keywords that indicate risky operations
RISKY_KEYWORDS="refactor|migrate|upgrade|replace|remove|delete|security|auth|crypto|private|key|breaking|major"

# Check if prompt contains risky keywords
if echo "$CLAUDE_USER_PROMPT" | grep -iE "$RISKY_KEYWORDS" > /dev/null; then
    echo "⚠️  Detected potentially risky operation in request"
    echo "🔄 Creating safety checkpoint..."
    
    # Create detailed checkpoint
    timestamp=$(date +%Y%m%d-%H%M%S)
    risk_type=$(echo "$CLAUDE_USER_PROMPT" | grep -iEo "$RISKY_KEYWORDS" | head -1)
    
    git add -A 2>/dev/null
    git commit -m "CHECKPOINT: Before risky operation - $risk_type" --no-verify 2>/dev/null || true
    git tag -a "checkpoint-$timestamp" -m "RISKY_OP: $risk_type request" 2>/dev/null
    
    echo "✅ Safety checkpoint created: checkpoint-$timestamp"
    echo "📌 Your request involves: $risk_type"
fi

# Check for test-related prompts (checkpoint after tests)
if echo "$CLAUDE_USER_PROMPT" | grep -iE "test|spec|jest|vitest" > /dev/null; then
    # Set a marker to checkpoint after tests
    echo "test_requested" > .claude/.pending-test-checkpoint
fi

exit 0