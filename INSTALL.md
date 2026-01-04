# athreei Installation Guide

This guide walks you through setting up athreei step-by-step.

## Prerequisites

Before you begin, ensure you have:

- **Bun** (v1.0+) - JavaScript runtime and package manager
  - macOS/Linux: `curl -fsSL https://bun.sh/install | bash`
  - Windows: `irm bun.sh/install.ps1 | iex`
- **Chrome-based browser** - Chrome, Chromium, Brave, or Edge
- **Git** - For cloning the repository

## Quick Start (Automated)

Run the setup script for a guided installation:

```bash
# macOS / Linux
./scripts/setup.sh

# Windows (PowerShell)
.\scripts\setup.ps1
```

The script will:

1. Check prerequisites
2. Install dependencies
3. Build all packages
4. Guide you through loading the extension
5. Install the native messaging host
6. Verify the installation

## Manual Installation

If you prefer manual installation or the automated script doesn't work, follow these steps:

### Step 1: Clone and Build

```bash
git clone https://github.com/yourusername/athreei.git
cd athreei
bun install
bun run build
```

### Step 2: Load the Chrome Extension

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer mode** (toggle in the top right)
3. Click **Load unpacked**
4. Select the folder: `packages/extension/dist`
5. **Copy the Extension ID** - This is shown on the extension card (32 lowercase letters)

### Step 3: Install the Native Messaging Host

The native host bridges the Chrome extension with MCP-compatible AI apps.

#### macOS / Linux

```bash
cd packages/native-host
./install.sh --extension-id YOUR_EXTENSION_ID
```

#### Windows (PowerShell)

```powershell
cd packages\native-host
.\install.ps1 -ExtensionId YOUR_EXTENSION_ID
```

Replace `YOUR_EXTENSION_ID` with the ID you copied from step 2.

### Step 4: Configure Claude Desktop (Optional)

To use athreei with Claude Desktop, add the following to your config file:

**Config file locations:**

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`
- Linux: `~/.config/Claude/claude_desktop_config.json`

**Add this configuration:**

```json
{
  "mcpServers": {
    "athreei": {
      "command": "/path/to/athreei-host"
    }
  }
}
```

**Binary locations:**

- macOS: `~/Library/Application Support/athreei/athreei-host`
- Windows: `%APPDATA%\athreei\athreei-host.exe`
- Linux: `~/.local/share/athreei/athreei-host`

### Step 5: Verify Installation

```bash
./scripts/verify-install.sh
```

This checks that all components are properly installed.

## Platform-Specific Notes

### macOS

#### Gatekeeper Warning

If you see "athreei-host cannot be opened because the developer cannot be verified":

1. Open **System Preferences** > **Security & Privacy** > **General**
2. Click **Allow Anyway** next to the athreei-host message
3. Or run in Terminal:
   ```bash
   xattr -d com.apple.quarantine ~/Library/Application\ Support/athreei/athreei-host
   ```

### Windows

#### Antivirus False Positive

Some antivirus software may flag the native host. If this happens:

1. Add an exception for `%APPDATA%\athreei\`
2. Or temporarily disable real-time protection during installation

#### Multiple Browsers

To install for Edge or Brave in addition to Chrome:

```powershell
.\install.ps1 -ExtensionId YOUR_ID -Browser edge
.\install.ps1 -ExtensionId YOUR_ID -Browser brave
# Or install for all browsers at once:
.\install.ps1 -ExtensionId YOUR_ID -Browser all
```

### Linux

#### Different Chrome Variants

The installer defaults to Google Chrome. For Chromium or other variants, the manifest is installed to the correct location automatically based on your system.

If using Flatpak Chrome, you may need to manually copy the manifest to:
`~/.var/app/com.google.Chrome/config/google-chrome/NativeMessagingHosts/`

## Troubleshooting

### "Native host not found"

1. Verify the binary exists:
   ```bash
   ls -la ~/Library/Application\ Support/athreei/  # macOS
   ls -la ~/.local/share/athreei/                   # Linux
   dir %APPDATA%\athreei\                           # Windows
   ```
2. Re-run the native host installer with your extension ID

### "Extension ID mismatch"

The extension ID changes when you reload the unpacked extension. Re-run the native host installer with the new ID:

```bash
./install.sh --extension-id NEW_EXTENSION_ID
```

### "Failed to connect to native messaging host"

1. Check that the extension ID in the manifest matches your extension
2. Restart Chrome completely (quit and reopen)
3. Check Chrome's native messaging log: `chrome://extensions` > Details > Inspect views

### Build Errors

```bash
# Clean and rebuild
rm -rf node_modules
bun install
bun run build
```

### Permission Denied

On Unix systems, ensure the binary is executable:

```bash
chmod +x ~/Library/Application\ Support/athreei/athreei-host  # macOS
chmod +x ~/.local/share/athreei/athreei-host                   # Linux
```

## Uninstallation

To remove athreei from your system:

```bash
# macOS / Linux
./scripts/uninstall.sh

# Windows (PowerShell)
.\scripts\uninstall.ps1
```

Add `--all` (bash) or `-All` (PowerShell) to also remove user data.

**Manual removal:**

1. Remove the extension from `chrome://extensions`
2. Delete the native host:
   - macOS: `~/Library/Application Support/athreei/`
   - Linux: `~/.local/share/athreei/`
   - Windows: `%APPDATA%\athreei\`
3. Delete the manifest:
   - macOS: `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.athreei.native_host.json`
   - Linux: `~/.config/google-chrome/NativeMessagingHosts/com.athreei.native_host.json`
   - Windows: Remove registry key `HKCU:\Software\Google\Chrome\NativeMessagingHosts\com.athreei.native_host`

## Getting Help

- [Developer Guide](docs/developer-guide.md) - Development setup
- [GitHub Issues](https://github.com/yourusername/athreei/issues) - Report bugs

## Next Steps

Once installed:

1. Open Chrome with the extension enabled
2. Navigate to any website
3. Open Claude Desktop (or your MCP-compatible AI app)
4. Ask Claude to interact with the page!

Try commands like:

- "What tabs do I have open?"
- "Navigate to github.com"
- "Click the search button"
- "Fill in the email field with test@example.com"
