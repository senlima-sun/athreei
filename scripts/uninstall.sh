#!/usr/bin/env bash

# athreei Uninstall Script
#
# This script removes athreei components from your system.
#
# Usage:
#   ./uninstall.sh [--all]
#
# Options:
#   --all    Also remove user data (~/.athreei)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
HOST_NAME="com.athreei.native_host"
BINARY_NAME="athreei-host"

# Parse arguments
REMOVE_ALL=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --all)
      REMOVE_ALL=true
      shift
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      echo "Usage: $0 [--all]"
      exit 1
      ;;
  esac
done

# Detect platform
detect_platform() {
  case "$(uname -s)" in
    Darwin*) echo "macos" ;;
    Linux*) echo "linux" ;;
    MINGW*|MSYS*|CYGWIN*) echo "windows" ;;
    *) echo "unknown" ;;
  esac
}

PLATFORM=$(detect_platform)

# Get platform-specific paths
get_install_dir() {
  case "$PLATFORM" in
    macos) echo "$HOME/Library/Application Support/athreei" ;;
    linux) echo "$HOME/.local/share/athreei" ;;
    windows) echo "$APPDATA/athreei" ;;
    *) echo "" ;;
  esac
}

get_manifest_dirs() {
  case "$PLATFORM" in
    macos)
      echo "$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"
      echo "$HOME/Library/Application Support/Chromium/NativeMessagingHosts"
      echo "$HOME/Library/Application Support/BraveSoftware/Brave-Browser/NativeMessagingHosts"
      echo "$HOME/Library/Application Support/Microsoft Edge/NativeMessagingHosts"
      ;;
    linux)
      echo "$HOME/.config/google-chrome/NativeMessagingHosts"
      echo "$HOME/.config/chromium/NativeMessagingHosts"
      echo "$HOME/.config/BraveSoftware/Brave-Browser/NativeMessagingHosts"
      echo "$HOME/.config/microsoft-edge/NativeMessagingHosts"
      ;;
    *)
      echo ""
      ;;
  esac
}

get_user_data_dir() {
  echo "$HOME/.athreei"
}

INSTALL_DIR=$(get_install_dir)
USER_DATA_DIR=$(get_user_data_dir)

echo ""
echo "athreei Uninstaller"
echo "==================="
echo ""
echo "Platform: $PLATFORM"
echo ""

# Confirmation
echo -e "${YELLOW}This will remove:${NC}"
echo "  - Native messaging host binary"
echo "  - Native messaging manifests"
if [ "$REMOVE_ALL" = true ]; then
  echo "  - User data directory ($USER_DATA_DIR)"
fi
echo ""
read -rp "Continue? [y/N] " confirm

if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 0
fi

echo ""

# Remove native host binary
echo "Removing native host binary..."
if [ -d "$INSTALL_DIR" ]; then
  rm -rf "$INSTALL_DIR"
  echo -e "${GREEN}✓${NC} Removed: $INSTALL_DIR"
else
  echo -e "${YELLOW}⚠${NC} Not found: $INSTALL_DIR"
fi

# Remove native messaging manifests
echo ""
echo "Removing native messaging manifests..."

if [ "$PLATFORM" != "windows" ]; then
  while IFS= read -r manifest_dir; do
    if [ -n "$manifest_dir" ]; then
      MANIFEST_PATH="$manifest_dir/$HOST_NAME.json"
      if [ -f "$MANIFEST_PATH" ]; then
        rm -f "$MANIFEST_PATH"
        echo -e "${GREEN}✓${NC} Removed: $MANIFEST_PATH"
      fi
    fi
  done <<< "$(get_manifest_dirs)"
else
  # Windows: Remove registry entries
  echo "Removing Windows registry entries..."
  reg delete "HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts\\$HOST_NAME" /f 2>/dev/null && \
    echo -e "${GREEN}✓${NC} Removed Chrome registry entry" || \
    echo -e "${YELLOW}⚠${NC} Chrome registry entry not found"
  reg delete "HKCU\\Software\\Microsoft\\Edge\\NativeMessagingHosts\\$HOST_NAME" /f 2>/dev/null && \
    echo -e "${GREEN}✓${NC} Removed Edge registry entry" || \
    echo -e "${YELLOW}⚠${NC} Edge registry entry not found"
  reg delete "HKCU\\Software\\BraveSoftware\\Brave-Browser\\NativeMessagingHosts\\$HOST_NAME" /f 2>/dev/null && \
    echo -e "${GREEN}✓${NC} Removed Brave registry entry" || \
    echo -e "${YELLOW}⚠${NC} Brave registry entry not found"
fi

# Remove user data (if requested)
if [ "$REMOVE_ALL" = true ]; then
  echo ""
  echo "Removing user data..."
  if [ -d "$USER_DATA_DIR" ]; then
    rm -rf "$USER_DATA_DIR"
    echo -e "${GREEN}✓${NC} Removed: $USER_DATA_DIR"
  else
    echo -e "${YELLOW}⚠${NC} Not found: $USER_DATA_DIR"
  fi
fi

echo ""
echo -e "${GREEN}Uninstallation complete!${NC}"
echo ""
echo "Remaining manual steps:"
echo "  1. Remove the Chrome extension from chrome://extensions"
echo "  2. Remove athreei from Claude Desktop config (if configured)"
echo "  3. Delete the project directory (if desired)"
echo ""
