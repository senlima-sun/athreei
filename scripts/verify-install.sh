#!/usr/bin/env bash

# athreei Installation Verification Script
#
# This script checks that all components are properly installed.
#
# Usage:
#   ./verify-install.sh

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
HOST_NAME="com.athreei.native_host"
BINARY_NAME="athreei-host"

# Counters
PASS=0
FAIL=0
WARN=0

# Print result
check_pass() {
  echo -e "${GREEN}✓${NC} $1"
  ((PASS++))
}

check_fail() {
  echo -e "${RED}✗${NC} $1"
  ((FAIL++))
}

check_warn() {
  echo -e "${YELLOW}⚠${NC} $1"
  ((WARN++))
}

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

get_manifest_dir() {
  case "$PLATFORM" in
    macos) echo "$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts" ;;
    linux) echo "$HOME/.config/google-chrome/NativeMessagingHosts" ;;
    windows) echo "" ;; # Uses registry on Windows
    *) echo "" ;;
  esac
}

INSTALL_DIR=$(get_install_dir)
MANIFEST_DIR=$(get_manifest_dir)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo ""
echo "athreei Installation Verification"
echo "=================================="
echo ""
echo "Platform: $PLATFORM"
echo ""

# Check 1: Binary exists
echo "Checking native host binary..."
BINARY_PATH="$INSTALL_DIR/$BINARY_NAME"
if [ -f "$BINARY_PATH" ]; then
  check_pass "Binary found: $BINARY_PATH"

  # Check if executable
  if [ -x "$BINARY_PATH" ]; then
    check_pass "Binary is executable"
  else
    check_fail "Binary is not executable (run: chmod +x \"$BINARY_PATH\")"
  fi
else
  check_fail "Binary not found at: $BINARY_PATH"
  echo "       Run the native host installer: packages/native-host/install.sh"
fi

echo ""

# Check 2: Manifest file (Unix) or Registry (Windows)
echo "Checking native messaging manifest..."
if [ "$PLATFORM" != "windows" ]; then
  MANIFEST_PATH="$MANIFEST_DIR/$HOST_NAME.json"
  if [ -f "$MANIFEST_PATH" ]; then
    check_pass "Manifest found: $MANIFEST_PATH"

    # Validate manifest JSON structure
    if command -v jq &> /dev/null; then
      if jq -e '.name' "$MANIFEST_PATH" > /dev/null 2>&1; then
        check_pass "Manifest is valid JSON"

        # Check for placeholder extension ID
        EXTENSION_ID=$(jq -r '.allowed_origins[0]' "$MANIFEST_PATH" 2>/dev/null | sed 's|chrome-extension://||' | sed 's|/||')
        if [ "$EXTENSION_ID" = "EXTENSION_ID_PLACEHOLDER" ]; then
          check_warn "Extension ID is still placeholder - update with real ID"
        else
          check_pass "Extension ID configured: $EXTENSION_ID"
        fi

        # Check path in manifest matches binary location
        MANIFEST_BINARY_PATH=$(jq -r '.path' "$MANIFEST_PATH" 2>/dev/null)
        if [ "$MANIFEST_BINARY_PATH" = "$BINARY_PATH" ]; then
          check_pass "Manifest path matches binary location"
        else
          check_warn "Manifest path ($MANIFEST_BINARY_PATH) differs from expected ($BINARY_PATH)"
        fi
      else
        check_fail "Manifest is not valid JSON"
      fi
    else
      check_warn "jq not installed - skipping JSON validation"
    fi
  else
    check_fail "Manifest not found at: $MANIFEST_PATH"
    echo "       Run the native host installer: packages/native-host/install.sh"
  fi
else
  # Windows: Check registry
  echo "Windows registry check not implemented in bash"
  check_warn "Run verify on Windows using PowerShell"
fi

echo ""

# Check 3: Extension build
echo "Checking extension build..."
EXTENSION_DIST="$PROJECT_ROOT/packages/extension/dist"
if [ -d "$EXTENSION_DIST" ]; then
  check_pass "Extension dist directory exists"

  # Check for manifest.json
  if [ -f "$EXTENSION_DIST/manifest.json" ]; then
    check_pass "Extension manifest.json found"
  else
    check_fail "Extension manifest.json missing - run: bun run build"
  fi

  # Check for background script
  if [ -f "$EXTENSION_DIST/background.js" ] || [ -f "$EXTENSION_DIST/service-worker.js" ]; then
    check_pass "Extension background script found"
  else
    check_warn "Extension background script not found (may have different name)"
  fi
else
  check_fail "Extension not built: $EXTENSION_DIST"
  echo "       Run: cd $PROJECT_ROOT && bun run build"
fi

echo ""

# Check 4: Native host binary built
echo "Checking native host build..."
NATIVE_HOST_DIST="$PROJECT_ROOT/packages/native-host/dist"
if [ -d "$NATIVE_HOST_DIST" ]; then
  check_pass "Native host dist directory exists"

  # Check for any binary
  BINARY_COUNT=$(find "$NATIVE_HOST_DIST" -type f -name "athreei-host*" 2>/dev/null | wc -l)
  if [ "$BINARY_COUNT" -gt 0 ]; then
    check_pass "Found $BINARY_COUNT native host binary/binaries"
  else
    check_fail "No native host binaries found in dist"
  fi
else
  check_fail "Native host not built: $NATIVE_HOST_DIST"
  echo "       Run: cd $PROJECT_ROOT/packages/native-host && bun run build"
fi

echo ""

# Check 5: Test native host connection (optional)
echo "Testing native host..."
if [ -f "$BINARY_PATH" ] && [ -x "$BINARY_PATH" ]; then
  # Send a simple ping via stdin and check for response
  # Native messaging uses length-prefixed JSON
  # This is a simplified test - full test would use proper protocol

  # Try to run the binary and see if it starts
  timeout 2 "$BINARY_PATH" --version > /dev/null 2>&1
  EXIT_CODE=$?

  if [ $EXIT_CODE -eq 0 ] || [ $EXIT_CODE -eq 124 ]; then
    check_pass "Native host binary runs (exit code: $EXIT_CODE)"
  else
    check_warn "Native host binary may have issues (exit code: $EXIT_CODE)"
  fi
else
  check_warn "Skipping native host test - binary not available"
fi

echo ""

# Summary
echo "=================================="
echo "Verification Summary"
echo "=================================="
echo ""
echo -e "${GREEN}Passed: $PASS${NC}"
echo -e "${YELLOW}Warnings: $WARN${NC}"
echo -e "${RED}Failed: $FAIL${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
  if [ $WARN -eq 0 ]; then
    echo -e "${GREEN}All checks passed! athreei is ready to use.${NC}"
  else
    echo -e "${YELLOW}Installation complete with warnings.${NC}"
    echo "Review the warnings above and fix if needed."
  fi
  exit 0
else
  echo -e "${RED}Installation incomplete.${NC}"
  echo "Please fix the failed checks above and run this script again."
  exit 1
fi
