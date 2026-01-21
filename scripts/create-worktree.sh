#!/bin/bash
# =============================================================================
# Git Worktree Helper for athreei
# =============================================================================
# Creates a new worktree with symlinked .env files so all worktrees share
# the same database connection and secrets.
#
# Usage:
#   ./scripts/create-worktree.sh <branch-name>
#   ./scripts/create-worktree.sh feature/plan-a-transport
#
# The worktree will be created at: ../athreei-<sanitized-branch-name>
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the main repo directory (where this script lives)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MAIN_REPO="$(dirname "$SCRIPT_DIR")"

# Validate input
if [ -z "$1" ]; then
    echo -e "${RED}Error: Branch name required${NC}"
    echo "Usage: $0 <branch-name>"
    echo "Example: $0 feature/plan-a-transport"
    exit 1
fi

BRANCH="$1"

# Sanitize branch name for directory (replace / with -)
SANITIZED_BRANCH=$(echo "$BRANCH" | sed 's/\//-/g')
WORKTREE_PATH="${MAIN_REPO}/../.athreei-worktrees/${SANITIZED_BRANCH}"

# Check if worktree already exists
if [ -d "$WORKTREE_PATH" ]; then
    echo -e "${YELLOW}Worktree already exists at: $WORKTREE_PATH${NC}"
    echo "To remove it: git worktree remove $WORKTREE_PATH"
    exit 1
fi

echo -e "${GREEN}Creating worktree for branch: $BRANCH${NC}"
echo "Location: $WORKTREE_PATH"
echo ""

# Create the worktree
# Use -B to create or reset the branch
git worktree add "$WORKTREE_PATH" -B "$BRANCH"

echo ""
echo -e "${GREEN}Symlinking .env files...${NC}"

# Function to symlink if source exists
symlink_env() {
    local src="$1"
    local dest="$2"

    if [ -f "$src" ]; then
        # Create parent directory if needed
        mkdir -p "$(dirname "$dest")"
        ln -sf "$src" "$dest"
        echo "  ✓ $(basename "$dest") -> $src"
    else
        echo "  ⚠ Skipped $(basename "$src") (not found)"
    fi
}

# Symlink env files from main repo to worktree
# Root .env (if exists)
symlink_env "${MAIN_REPO}/.env" "${WORKTREE_PATH}/.env"

# apps/api/.env
symlink_env "${MAIN_REPO}/apps/api/.env" "${WORKTREE_PATH}/apps/api/.env"

# apps/platform/.env.local
symlink_env "${MAIN_REPO}/apps/platform/.env.local" "${WORKTREE_PATH}/apps/platform/.env.local"

# packages/sync-server/.env (standalone server with separate config)
symlink_env "${MAIN_REPO}/packages/sync-server/.env" "${WORKTREE_PATH}/packages/sync-server/.env"

echo ""
echo -e "${GREEN}Installing dependencies...${NC}"
cd "$WORKTREE_PATH"
bun install

echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Worktree ready!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════════${NC}"
echo ""
echo "Location: $WORKTREE_PATH"
echo "Branch:   $BRANCH"
echo ""
echo "Next steps:"
echo "  cd $WORKTREE_PATH"
echo "  bun run dev"
echo ""
echo "To remove this worktree later:"
echo "  git worktree remove $WORKTREE_PATH"
echo ""
