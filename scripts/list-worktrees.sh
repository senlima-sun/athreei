#!/bin/bash
# =============================================================================
# List Git Worktrees for athreei
# =============================================================================
# Shows all active worktrees with their branches and paths.
#
# Usage: ./scripts/list-worktrees.sh
# =============================================================================

echo "Active worktrees:"
echo ""
git worktree list
echo ""
echo "To remove a worktree: git worktree remove <path>"
echo "To prune stale entries: git worktree prune"
