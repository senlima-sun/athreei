#!/bin/bash
# Detect if a git commit was just made and capture it to aiii memory
# This script is called after Bash tool use

# Read the tool input from stdin
INPUT=$(cat)

# Check if the command was a git commit
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // ""' 2>/dev/null)

if [[ "$COMMAND" == *"git commit"* ]]; then
  # Extract commit info
  COMMIT_MSG=$(git log -1 --pretty=format:"%s" 2>/dev/null)
  COMMIT_SHA=$(git log -1 --pretty=format:"%h" 2>/dev/null)
  BRANCH=$(git branch --show-current 2>/dev/null)

  if [ -n "$COMMIT_SHA" ]; then
    # Output context for Claude to save
    cat << EOF
{
  "hookSpecificOutput": {
    "hookEventName": "PostToolUse",
    "additionalContext": "Git commit detected: [$COMMIT_SHA] $COMMIT_MSG on branch $BRANCH. Consider saving this to aiii Work space."
  }
}
EOF
  fi
fi

exit 0
