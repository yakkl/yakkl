#!/bin/bash

# Build Summary Save Script
# Usage: ./scripts/build-summary.sh "title" "content"
# Or: echo "content" | ./scripts/build-summary.sh "title"

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

if [ $# -eq 0 ]; then
  echo "Usage: $0 \"title\" [content]"
  echo "  Or: echo \"content\" | $0 \"title\""
  exit 1
fi

TITLE="$1"

# Check if content is provided as argument or via stdin
if [ $# -eq 2 ]; then
  CONTENT="$2"
elif [ ! -t 0 ]; then
  CONTENT=$(cat)
else
  echo "Error: No content provided"
  exit 1
fi

# Call the Node.js script
node "$SCRIPT_DIR/save-build-summary.js" "$TITLE" "$CONTENT"