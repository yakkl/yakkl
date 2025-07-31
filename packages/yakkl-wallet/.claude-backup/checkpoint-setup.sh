#!/bin/bash

# Quick setup script for checkpoint system

echo "Setting up YAKKL checkpoint system..."

# Add git aliases for quick checkpointing
git config alias.checkpoint '!sh -c "git add -A && git commit -m \"CHECKPOINT: $1\" --no-verify && git tag -a \"checkpoint-$(date +%Y%m%d-%H%M%S)\" -m \"$1\" && echo \"✅ Checkpoint created\"" -'
git config alias.checkpoints 'tag -l "checkpoint-*" --sort=-creatordate -n1'
git config alias.rollback '!sh -c "git stash && git reset --hard $1 && echo \"✅ Rolled back to $1\"" -'

# Create checkpoint log
mkdir -p .claude
touch .claude/checkpoints.log

echo "✅ Checkpoint system configured!"
echo ""
echo "Usage:"
echo "  git checkpoint 'description'  - Create checkpoint"
echo "  git checkpoints              - List checkpoints"
echo "  git rollback checkpoint-tag  - Rollback to checkpoint"
echo ""
echo "Or use Claude commands:"
echo "  /checkpoint create 'description'"
echo "  /checkpoint list"
echo "  /checkpoint revert <tag>"

chmod +x .claude/checkpoint-setup.sh