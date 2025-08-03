#!/bin/bash
# Pre-multi-edit checkpoint hook - Always checkpoint before bulk edits

echo "🔄 Creating checkpoint before multi-file edit"

# Multi-edits are often refactoring - always checkpoint
timestamp=$(date +%Y%m%d-%H%M%S)

# Get list of files to be edited (if available)
file_count="${CLAUDE_FILE_COUNT:-multiple}"

# Create comprehensive checkpoint
git add -A 2>/dev/null
git commit -m "CHECKPOINT: Before multi-edit operation ($file_count files)" --no-verify 2>/dev/null || true
git tag -a "checkpoint-$timestamp" -m "PRE_MULTI_EDIT: $file_count files" 2>/dev/null

echo "✅ Checkpoint created: checkpoint-$timestamp"
echo "💡 Tip: Use 'git rollback checkpoint-$timestamp' if needed"

exit 0