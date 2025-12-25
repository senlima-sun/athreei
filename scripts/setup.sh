#!/usr/bin/env bash

# athreei Setup Script
#
# This script guides you through setting up athreei for development or use.
# It builds all packages and installs the native messaging host.
#
# Usage:
#   ./setup.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Print banner
print_banner() {
  echo -e "${CYAN}"
  echo "  ╔═══════════════════════════════════════════╗"
  echo "  ║                                           ║"
  echo "  ║     athreei Setup                         ║"
  echo "  ║     Browser automation via MCP            ║"
  echo "  ║                                           ║"
  echo "  ╚═══════════════════════════════════════════╝"
  echo -e "${NC}"
}

# Print step header
print_step() {
  echo ""
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BOLD}Step $1: $2${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
check_prerequisites() {
  print_step "1" "Checking prerequisites"

  local missing=()

  # Check for Bun
  if command_exists bun; then
    echo -e "${GREEN}✓${NC} Bun $(bun --version) found"
  else
    echo -e "${RED}✗${NC} Bun not found"
    missing+=("bun")
  fi

  # Check for Chrome/Chromium
  local chrome_found=false
  if [[ "$(uname -s)" == "Darwin" ]]; then
    if [ -d "/Applications/Google Chrome.app" ]; then
      echo -e "${GREEN}✓${NC} Google Chrome found"
      chrome_found=true
    elif [ -d "/Applications/Chromium.app" ]; then
      echo -e "${GREEN}✓${NC} Chromium found"
      chrome_found=true
    elif [ -d "/Applications/Brave Browser.app" ]; then
      echo -e "${GREEN}✓${NC} Brave Browser found"
      chrome_found=true
    fi
  elif [[ "$(uname -s)" == "Linux" ]]; then
    if command_exists google-chrome || command_exists google-chrome-stable; then
      echo -e "${GREEN}✓${NC} Google Chrome found"
      chrome_found=true
    elif command_exists chromium || command_exists chromium-browser; then
      echo -e "${GREEN}✓${NC} Chromium found"
      chrome_found=true
    elif command_exists brave-browser; then
      echo -e "${GREEN}✓${NC} Brave Browser found"
      chrome_found=true
    fi
  fi

  if [ "$chrome_found" = false ]; then
    echo -e "${YELLOW}⚠${NC} No Chrome-based browser detected (may still work if installed elsewhere)"
  fi

  # Check for git
  if command_exists git; then
    echo -e "${GREEN}✓${NC} Git $(git --version | cut -d' ' -f3) found"
  else
    echo -e "${RED}✗${NC} Git not found"
    missing+=("git")
  fi

  if [ ${#missing[@]} -gt 0 ]; then
    echo ""
    echo -e "${RED}Missing required tools: ${missing[*]}${NC}"
    echo ""
    echo "Please install the missing tools:"
    for tool in "${missing[@]}"; do
      case "$tool" in
        bun)
          echo "  Bun: curl -fsSL https://bun.sh/install | bash"
          ;;
        git)
          echo "  Git: https://git-scm.com/downloads"
          ;;
      esac
    done
    exit 1
  fi

  echo ""
  echo -e "${GREEN}All prerequisites satisfied!${NC}"
}

# Install dependencies
install_dependencies() {
  print_step "2" "Installing dependencies"

  cd "$PROJECT_ROOT"

  if [ -f "bun.lockb" ] && [ -d "node_modules" ]; then
    echo "Dependencies already installed. Checking for updates..."
  fi

  echo "Running: bun install"
  bun install

  echo ""
  echo -e "${GREEN}Dependencies installed successfully!${NC}"
}

# Build packages
build_packages() {
  print_step "3" "Building packages"

  cd "$PROJECT_ROOT"

  echo "Running: bun run build"
  bun run build

  echo ""
  echo -e "${GREEN}All packages built successfully!${NC}"
}

# Instructions for loading extension
print_extension_instructions() {
  print_step "4" "Load the Chrome Extension"

  echo ""
  echo "To load the extension in Chrome:"
  echo ""
  echo "  1. Open Chrome and navigate to: ${CYAN}chrome://extensions${NC}"
  echo "  2. Enable ${BOLD}Developer mode${NC} (toggle in top right)"
  echo "  3. Click ${BOLD}Load unpacked${NC}"
  echo "  4. Select the folder: ${CYAN}$PROJECT_ROOT/packages/extension/dist${NC}"
  echo ""
  echo -e "${YELLOW}After loading, copy the Extension ID shown on the card.${NC}"
  echo "The ID is a 32-character string like: abcdefghijklmnopqrstuvwxyzabcdef"
  echo ""
}

# Get extension ID from user
get_extension_id() {
  print_step "5" "Enter Extension ID"

  echo ""
  read -rp "Paste your Extension ID: " EXTENSION_ID

  # Validate extension ID format (32 lowercase letters)
  if [[ ! "$EXTENSION_ID" =~ ^[a-z]{32}$ ]]; then
    echo -e "${RED}Invalid extension ID format.${NC}"
    echo "Extension IDs are 32 lowercase letters (a-z)."
    echo ""
    read -rp "Try again: " EXTENSION_ID

    if [[ ! "$EXTENSION_ID" =~ ^[a-z]{32}$ ]]; then
      echo -e "${RED}Still invalid. Proceeding with placeholder.${NC}"
      echo "You can re-run this script later with the correct ID."
      EXTENSION_ID="EXTENSION_ID_PLACEHOLDER"
    fi
  fi

  echo ""
  echo -e "${GREEN}Using Extension ID: $EXTENSION_ID${NC}"
}

# Install native host
install_native_host() {
  print_step "6" "Installing Native Messaging Host"

  local install_script="$PROJECT_ROOT/packages/native-host/install.sh"

  if [ ! -f "$install_script" ]; then
    echo -e "${RED}Error: install.sh not found at $install_script${NC}"
    exit 1
  fi

  echo "Running native host installer..."
  bash "$install_script" --extension-id "$EXTENSION_ID"
}

# Run verification
run_verification() {
  print_step "7" "Verifying Installation"

  local verify_script="$SCRIPT_DIR/verify-install.sh"

  if [ -f "$verify_script" ]; then
    bash "$verify_script"
  else
    echo -e "${YELLOW}Verification script not found. Skipping verification.${NC}"
  fi
}

# Print Claude Desktop configuration
print_claude_config() {
  print_step "8" "Configure Claude Desktop (Optional)"

  # Detect platform and binary path
  local binary_path
  case "$(uname -s)" in
    Darwin*)
      binary_path="$HOME/Library/Application Support/athreei/athreei-host"
      ;;
    Linux*)
      binary_path="$HOME/.local/share/athreei/athreei-host"
      ;;
    *)
      binary_path="/path/to/athreei-host"
      ;;
  esac

  echo ""
  echo "To use athreei with Claude Desktop, add this to your config:"
  echo ""
  echo -e "${CYAN}macOS: ~/Library/Application Support/Claude/claude_desktop_config.json${NC}"
  echo -e "${CYAN}Linux: ~/.config/Claude/claude_desktop_config.json${NC}"
  echo ""
  echo -e "${BOLD}Add or merge this configuration:${NC}"
  echo ""
  echo "{"
  echo "  \"mcpServers\": {"
  echo "    \"athreei\": {"
  echo "      \"command\": \"$binary_path\""
  echo "    }"
  echo "  }"
  echo "}"
  echo ""
}

# Print completion message
print_completion() {
  echo ""
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${GREEN}${BOLD}   Setup Complete!${NC}"
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo "Next steps:"
  echo "  1. Configure Claude Desktop (see above)"
  echo "  2. Restart Claude Desktop"
  echo "  3. Open Chrome with the extension enabled"
  echo "  4. Ask Claude to interact with web pages!"
  echo ""
  echo "For troubleshooting, see: $PROJECT_ROOT/INSTALL.md"
  echo ""
}

# Main
main() {
  print_banner
  check_prerequisites
  install_dependencies
  build_packages
  print_extension_instructions
  get_extension_id
  install_native_host
  run_verification
  print_claude_config
  print_completion
}

main "$@"
