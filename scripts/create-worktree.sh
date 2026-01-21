#!/bin/bash
# =============================================================================
# Git Worktree Helper for athreei
# =============================================================================
# Creates a new worktree with symlinked .env files so all worktrees share
# the same database connection and secrets.
#
# Usage:
#   ./scripts/create-worktree.sh <branch-name> [plan-name]
#   ./scripts/create-worktree.sh feature/plan-a-transport
#   ./scripts/create-worktree.sh feature/plan-a-transport gateway-stability-fixes
#
#   # Setup only (run from within an existing worktree)
#   ./scripts/create-worktree.sh --setup-only
#
# Arguments:
#   branch-name   Required (unless --setup-only). The git branch name for the worktree.
#   plan-name     Optional. Name prefix for .claude/plans/ and .claude/progress/ files.
#                 Defaults to sanitized branch name (slashes replaced with dashes).
#
# Flags:
#   --setup-only  Skip worktree creation, only setup .claude and .env symlinks.
#                 Must be run from within an existing worktree directory.
#
# The worktree will be created at: ../.athreei-worktrees/<sanitized-branch-name>
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

# Check for --setup-only flag
SETUP_ONLY=false
if [ "$1" = "--setup-only" ]; then
    SETUP_ONLY=true
fi

if [ "$SETUP_ONLY" = true ]; then
    # Setup-only mode: run from current directory (must be a worktree)
    WORKTREE_PATH="$(pwd)"
    
    # Verify we're in a git worktree (not the main repo)
    if [ "$WORKTREE_PATH" = "$MAIN_REPO" ]; then
        echo -e "${RED}Error: --setup-only must be run from within a worktree, not the main repo${NC}"
        exit 1
    fi
    
    if [ ! -d "$WORKTREE_PATH/.git" ] && [ ! -f "$WORKTREE_PATH/.git" ]; then
        echo -e "${RED}Error: Current directory is not a git repository${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}Setting up worktree: $WORKTREE_PATH${NC}"
    echo ""
else
    # Normal mode: create new worktree
    # Validate input
    if [ -z "$1" ]; then
        echo -e "${RED}Error: Branch name required${NC}"
        echo "Usage: $0 <branch-name> [plan-name]"
        echo "       $0 --setup-only"
        echo "Example: $0 feature/plan-a-transport"
        exit 1
    fi

    BRANCH="$1"

    # Sanitize branch name for directory (replace / with -)
    SANITIZED_BRANCH=$(echo "$BRANCH" | sed 's/\//-/g')
    WORKTREE_PATH="${MAIN_REPO}/../.athreei-worktrees/${SANITIZED_BRANCH}"

    # Plan/progress name - use second argument or fall back to sanitized branch name
    PLAN_NAME="${2:-$SANITIZED_BRANCH}"

    # Check if worktree already exists
    if [ -d "$WORKTREE_PATH" ]; then
        echo -e "${YELLOW}Worktree already exists at: $WORKTREE_PATH${NC}"
        echo "To remove it: git worktree remove $WORKTREE_PATH"
        exit 1
    fi

    echo -e "${GREEN}Creating worktree for branch: $BRANCH${NC}"
    echo "Location: $WORKTREE_PATH"
    if [ "$PLAN_NAME" != "$SANITIZED_BRANCH" ]; then
        echo "Plan/Progress: $PLAN_NAME"
    fi
    echo ""

    # Create the worktree
    # Use -B to create or reset the branch
    git worktree add "$WORKTREE_PATH" -B "$BRANCH"
    echo ""
fi
echo -e "${GREEN}Copying .claude directory...${NC}"

# Copy .claude directory structure, but selectively handle plans/ and progress/
copy_claude_dir() {
    local src_claude="${MAIN_REPO}/.claude"
    local dest_claude="${WORKTREE_PATH}/.claude"
    local skip_plans_progress="$1"  # If "true", skip plans/ and progress/ entirely
    
    if [ ! -d "$src_claude" ]; then
        echo "  ⚠ .claude directory not found, skipping"
        return
    fi
    
    # Create destination .claude directory
    mkdir -p "$dest_claude"
    
    # Copy everything except plans/ and progress/
    for item in "$src_claude"/*; do
        local basename=$(basename "$item")
        
        # Skip plans and progress directories (handled separately)
        if [ "$basename" = "plans" ] || [ "$basename" = "progress" ]; then
            continue
        fi
        
        # Copy files and directories
        if [ -e "$item" ]; then
            cp -r "$item" "$dest_claude/"
            echo "  ✓ Copied $basename"
        fi
    done
    
    # Skip plans/progress in setup-only mode
    if [ "$skip_plans_progress" = "true" ]; then
        echo "  ⚠ Skipped plans/ and progress/ (setup-only mode)"
        return
    fi
    
    # Handle plans/ - only copy files matching PLAN_NAME
    if [ -d "$src_claude/plans" ]; then
        mkdir -p "$dest_claude/plans"
        for plan_file in "$src_claude/plans/${PLAN_NAME}"*; do
            if [ -f "$plan_file" ]; then
                cp "$plan_file" "$dest_claude/plans/"
                echo "  ✓ Copied plans/$(basename "$plan_file")"
            fi
        done
        # Check if any files were copied
        if [ -z "$(ls -A "$dest_claude/plans" 2>/dev/null)" ]; then
            echo "  ⚠ No matching plan files for: $PLAN_NAME"
        fi
    fi
    
    # Handle progress/ - only copy files matching PLAN_NAME (and template)
    if [ -d "$src_claude/progress" ]; then
        mkdir -p "$dest_claude/progress"
        # Always copy template if exists
        if [ -f "$src_claude/progress/.template.md" ]; then
            cp "$src_claude/progress/.template.md" "$dest_claude/progress/"
            echo "  ✓ Copied progress/.template.md"
        fi
        for progress_file in "$src_claude/progress/${PLAN_NAME}"*; do
            if [ -f "$progress_file" ]; then
                cp "$progress_file" "$dest_claude/progress/"
                echo "  ✓ Copied progress/$(basename "$progress_file")"
            fi
        done
    fi
}

if [ "$SETUP_ONLY" = true ]; then
    copy_claude_dir "true"
else
    copy_claude_dir "false"
fi

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
if [ "$SETUP_ONLY" = false ]; then
    echo "Branch:   $BRANCH"
fi
echo ""
if [ "$SETUP_ONLY" = true ]; then
    echo "Setup complete. You can now run:"
    echo "  bun run dev"
else
    echo "Next steps:"
    echo "  cd $WORKTREE_PATH"
    echo "  bun run dev"
    echo ""
    echo "To remove this worktree later:"
    echo "  git worktree remove $WORKTREE_PATH"
fi
echo ""
