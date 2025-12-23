#!/usr/bin/env bash

# athreei Native Host Installation Script
#
# This script installs the athreei native messaging host for Chrome/Chromium browsers.
# It handles installation on macOS, Linux, and Windows (via Git Bash/WSL).
#
# Usage:
#   ./install.sh [--uninstall] [--extension-id EXTENSION_ID]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
HOST_NAME="com.athreei.native_host"
BINARY_NAME="athreei-host"
DEFAULT_EXTENSION_ID="EXTENSION_ID_PLACEHOLDER"

# Parse arguments
UNINSTALL=false
EXTENSION_ID="$DEFAULT_EXTENSION_ID"

while [[ $# -gt 0 ]]; do
  case $1 in
    --uninstall)
      UNINSTALL=true
      shift
      ;;
    --extension-id)
      EXTENSION_ID="$2"
      shift 2
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      echo "Usage: $0 [--uninstall] [--extension-id EXTENSION_ID]"
      exit 1
      ;;
  esac
done

# Detect platform
detect_platform() {
  case "$(uname -s)" in
    Darwin*)
      echo "macos"
      ;;
    Linux*)
      echo "linux"
      ;;
    MINGW*|MSYS*|CYGWIN*)
      echo "windows"
      ;;
    *)
      echo -e "${RED}Unsupported platform: $(uname -s)${NC}"
      exit 1
      ;;
  esac
}

PLATFORM=$(detect_platform)
echo -e "${GREEN}Detected platform: $PLATFORM${NC}"

# Get platform-specific paths
get_install_dir() {
  case "$PLATFORM" in
    macos)
      echo "$HOME/Library/Application Support/athreei"
      ;;
    linux)
      echo "$HOME/.local/share/athreei"
      ;;
    windows)
      echo "$APPDATA/athreei"
      ;;
  esac
}

get_manifest_dir() {
  case "$PLATFORM" in
    macos)
      echo "$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts"
      ;;
    linux)
      echo "$HOME/.config/google-chrome/NativeMessagingHosts"
      ;;
    windows)
      # On Windows, we use the registry instead
      echo ""
      ;;
  esac
}

get_binary_name() {
  case "$PLATFORM" in
    macos)
      # Detect architecture
      if [[ "$(uname -m)" == "arm64" ]]; then
        echo "athreei-host-macos-arm64"
      else
        echo "athreei-host-macos-x64"
      fi
      ;;
    linux)
      echo "athreei-host-linux"
      ;;
    windows)
      echo "athreei-host-windows.exe"
      ;;
  esac
}

INSTALL_DIR=$(get_install_dir)
MANIFEST_DIR=$(get_manifest_dir)
BINARY_SOURCE=$(get_binary_name)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Uninstall function
uninstall() {
  echo -e "${YELLOW}Uninstalling athreei native host...${NC}"

  # Remove binary
  if [ -d "$INSTALL_DIR" ]; then
    echo "Removing binary from: $INSTALL_DIR"
    rm -rf "$INSTALL_DIR"
  fi

  # Remove manifest
  if [ "$PLATFORM" != "windows" ]; then
    MANIFEST_PATH="$MANIFEST_DIR/$HOST_NAME.json"
    if [ -f "$MANIFEST_PATH" ]; then
      echo "Removing manifest: $MANIFEST_PATH"
      rm -f "$MANIFEST_PATH"
    fi
  else
    # On Windows, remove registry entry
    echo "Removing registry entry..."
    reg delete "HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts\\$HOST_NAME" /f 2>/dev/null || true
  fi

  echo -e "${GREEN}Uninstallation complete!${NC}"
}

# Install function
install() {
  echo -e "${YELLOW}Installing athreei native host...${NC}"

  # Check if binary exists (try platform-specific first, then generic)
  BINARY_PATH="$SCRIPT_DIR/dist/$BINARY_SOURCE"
  if [ ! -f "$BINARY_PATH" ]; then
    # Fall back to generic binary name
    GENERIC_BINARY="$SCRIPT_DIR/dist/athreei-host"
    if [ -f "$GENERIC_BINARY" ]; then
      BINARY_PATH="$GENERIC_BINARY"
      echo -e "${YELLOW}Using generic binary: $BINARY_PATH${NC}"
    else
      echo -e "${RED}Error: Binary not found at $BINARY_PATH${NC}"
      echo "Please run 'bun run build' first"
      exit 1
    fi
  fi

  # Create install directory
  echo "Creating installation directory: $INSTALL_DIR"
  mkdir -p "$INSTALL_DIR"

  # Copy binary
  echo "Copying binary to: $INSTALL_DIR/$BINARY_NAME"
  cp "$BINARY_PATH" "$INSTALL_DIR/$BINARY_NAME"
  chmod +x "$INSTALL_DIR/$BINARY_NAME"

  # Get absolute path to binary
  if [ "$PLATFORM" == "windows" ]; then
    BINARY_ABSOLUTE_PATH="$INSTALL_DIR\\$BINARY_NAME"
    # Convert to Windows path format
    BINARY_ABSOLUTE_PATH=$(cygpath -w "$BINARY_ABSOLUTE_PATH" 2>/dev/null || echo "$BINARY_ABSOLUTE_PATH")
  else
    BINARY_ABSOLUTE_PATH="$INSTALL_DIR/$BINARY_NAME"
  fi

  # Create manifest
  TEMP_MANIFEST=$(mktemp)
  if [ "$PLATFORM" == "windows" ]; then
    # Windows uses backslashes in paths
    BINARY_ABSOLUTE_PATH_ESCAPED=$(echo "$BINARY_ABSOLUTE_PATH" | sed 's/\\/\\\\/g')
    cat > "$TEMP_MANIFEST" <<EOF
{
  "name": "$HOST_NAME",
  "description": "athreei Native Messaging Host - Bridge between Chrome extension and MCP server",
  "path": "$BINARY_ABSOLUTE_PATH_ESCAPED",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://$EXTENSION_ID/"
  ]
}
EOF
  else
    cat > "$TEMP_MANIFEST" <<EOF
{
  "name": "$HOST_NAME",
  "description": "athreei Native Messaging Host - Bridge between Chrome extension and MCP server",
  "path": "$BINARY_ABSOLUTE_PATH",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://$EXTENSION_ID/"
  ]
}
EOF
  fi

  # Install manifest
  if [ "$PLATFORM" != "windows" ]; then
    echo "Creating manifest directory: $MANIFEST_DIR"
    mkdir -p "$MANIFEST_DIR"

    MANIFEST_PATH="$MANIFEST_DIR/$HOST_NAME.json"
    echo "Installing manifest: $MANIFEST_PATH"
    cp "$TEMP_MANIFEST" "$MANIFEST_PATH"
  else
    # On Windows, register via registry
    echo "Registering native host in Windows registry..."
    MANIFEST_PATH="$INSTALL_DIR\\$HOST_NAME.json"
    cp "$TEMP_MANIFEST" "$(cygpath -u "$MANIFEST_PATH" 2>/dev/null || echo "$MANIFEST_PATH")"

    reg add "HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts\\$HOST_NAME" /ve /t REG_SZ /d "$MANIFEST_PATH" /f
  fi

  rm "$TEMP_MANIFEST"

  echo ""
  echo -e "${GREEN}Installation complete!${NC}"
  echo ""
  echo "Binary location:   $BINARY_ABSOLUTE_PATH"
  if [ "$PLATFORM" != "windows" ]; then
    echo "Manifest location: $MANIFEST_PATH"
  else
    echo "Registry key:      HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts\\$HOST_NAME"
  fi
  echo ""

  if [ "$EXTENSION_ID" == "$DEFAULT_EXTENSION_ID" ]; then
    echo -e "${YELLOW}Warning: Using placeholder extension ID${NC}"
    echo "You need to update the manifest with your actual Chrome extension ID."
    echo "Run: $0 --extension-id YOUR_EXTENSION_ID"
    echo ""
  fi

  echo "Next steps:"
  echo "1. Install the Chrome extension"
  echo "2. Get the extension ID from chrome://extensions"
  echo "3. Re-run this script with --extension-id YOUR_EXTENSION_ID"
  echo "4. Test the connection by opening the extension"
  echo ""

  # Show log location
  case "$PLATFORM" in
    macos)
      echo "Logs will be written to: ~/Library/Application Support/Google/Chrome/NativeMessagingHosts/$HOST_NAME.log"
      ;;
    linux)
      echo "Logs will be written to: ~/.config/google-chrome/NativeMessagingHosts/$HOST_NAME.log"
      ;;
    windows)
      echo "Logs: Check Chrome extension console for native messaging errors"
      ;;
  esac
}

# Main
if [ "$UNINSTALL" = true ]; then
  uninstall
else
  install
fi
