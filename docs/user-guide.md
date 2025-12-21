# User Guide

This guide covers installation and usage of athreei for end users who want to connect their AI assistants to their browser.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
  - [MCP Server Installation](#mcp-server-installation)
  - [Chrome Extension Installation](#chrome-extension-installation)
  - [AI App Configuration](#ai-app-configuration)
- [Usage](#usage)
  - [Basic Interactions](#basic-interactions)
  - [Permission Management](#permission-management)
  - [Viewing Audit Logs](#viewing-audit-logs)
- [Dashboard](#dashboard)
- [Troubleshooting](#troubleshooting)

## Prerequisites

- **Chrome browser** (or Chromium-based browser)
- **AI application** that supports MCP (Model Context Protocol):
  - Claude Desktop
  - ChatGPT (with MCP plugin)
  - Other MCP-compatible apps

## Installation

### MCP Server Installation

The MCP server is a local binary that bridges your AI app with the Chrome extension.

#### Option 1: Download Pre-built Binary

1. Go to the [Releases page](https://github.com/yourusername/athreei/releases)
2. Download the binary for your platform:
   - macOS (Apple Silicon): `athreei-host-macos-arm64`
   - macOS (Intel): `athreei-host-macos-x64`
   - Windows: `athreei-host-windows.exe`
   - Linux: `athreei-host-linux`
3. Make it executable (macOS/Linux):
   ```bash
   chmod +x athreei-host-*
   ```
4. Move to a permanent location:

   ```bash
   # macOS/Linux
   sudo mv athreei-host-* /usr/local/bin/athreei-host

   # Windows: Move to a folder in your PATH
   ```

#### Option 2: Build from Source

```bash
# Install Bun if not already installed
curl -fsSL https://bun.sh/install | bash

# Clone and build
git clone https://github.com/yourusername/athreei.git
cd athreei
bun install
cd packages/native-host
bun run build
```

The binary will be in `packages/native-host/dist/`.

### Chrome Extension Installation

#### Developer Mode (Current)

1. Build the extension:

   ```bash
   cd packages/extension
   bun run build
   ```

2. Open Chrome and go to `chrome://extensions/`

3. Enable "Developer mode" (toggle in top right)

4. Click "Load unpacked"

5. Select the `packages/extension/dist/` folder

6. The athreei extension icon should appear in your toolbar

#### Chrome Web Store (Coming Soon)

Once available, you'll be able to install directly from the Chrome Web Store.

### AI App Configuration

#### Claude Desktop

1. Find your Claude Desktop config file:
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`

2. Add the athreei MCP server:

   ```json
   {
     "mcpServers": {
       "athreei": {
         "command": "/usr/local/bin/athreei-host"
       }
     }
   }
   ```

3. Restart Claude Desktop

4. You should see "athreei" in Claude's available tools

#### Other AI Apps

For AI apps supporting SSE transport:

1. Start the MCP server with SSE transport:

   ```bash
   athreei-host --transport sse --port 3000
   ```

2. Configure your AI app to connect to:
   ```
   http://localhost:3000/mcp
   ```

## Usage

### Basic Interactions

Once installed, you can ask your AI assistant to interact with websites:

**Example prompts:**

- "Go to google.com and search for 'athreei'"
- "Click the login button on this page"
- "Fill in the email field with my email address"
- "Take a screenshot of the current page"
- "Read the main content of this article"
- "List all the interactive elements on this page"

### Permission Management

When your AI tries to perform an action, you'll be prompted to grant permission.

**Permission levels:**

| Level       | Description                                      |
| ----------- | ------------------------------------------------ |
| **Denied**  | Action is blocked, AI cannot perform it          |
| **Allowed** | Action is permitted without prompting            |
| **Ask**     | Prompt each time (default for sensitive actions) |

**Managing permissions:**

1. Open the Dashboard (see below)
2. Go to "Permissions" tab
3. View and modify permissions by origin (website) and tool

**Best practices:**

- Start with "Ask" for sensitive tools like `browser_execute_script`
- Grant "Allowed" to trusted websites for common actions
- Review permissions periodically

### Viewing Audit Logs

Every AI interaction is logged for transparency and security.

**Viewing logs:**

1. Open the Dashboard
2. Go to "Audit Log" tab
3. Browse, search, and filter logs

**Log information includes:**

- Timestamp
- AI app that made the request
- Tool called
- Website origin
- Arguments passed
- Result returned
- Status (success, denied, error)

## Dashboard

The dashboard provides a web interface for managing athreei.

### Starting the Dashboard

```bash
# Development mode
cd packages/dashboard
bun run dev

# Access at http://localhost:5173
```

### Dashboard Features

#### Audit Log

- View complete history of AI interactions
- Search by tool, origin, or status
- Filter by date range
- Export logs for analysis

#### Permissions

- View all granted permissions
- Modify permission levels
- Revoke permissions
- Set default permission policies

#### Sessions

- View active browser sessions
- See which tabs are being monitored
- End sessions if needed

#### Settings

- Configure default permissions
- Set log retention period
- Manage sync settings (if enabled)
- Theme preferences (light/dark/auto)

## Troubleshooting

### Extension Not Connecting

**Symptoms:** AI can't find browser tools, extension appears disconnected

**Solutions:**

1. Check that the native host is installed correctly:

   ```bash
   athreei-host --version
   ```

2. Verify the native messaging manifest is registered:
   - macOS: `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.athreei.host.json`
   - Windows: Registry key `HKCU\Software\Google\Chrome\NativeMessagingHosts\com.athreei.host`
   - Linux: `~/.config/google-chrome/NativeMessagingHosts/com.athreei.host.json`

3. Reload the extension:
   - Go to `chrome://extensions/`
   - Click the refresh button on athreei

### AI App Not Detecting MCP Server

**Symptoms:** Claude Desktop doesn't show athreei tools

**Solutions:**

1. Verify your config file syntax (must be valid JSON)

2. Check the path to the binary is correct and absolute

3. Restart your AI application completely

4. Check MCP server logs:
   ```bash
   athreei-host 2>&1 | tee athreei.log
   ```

### Permission Denied Errors

**Symptoms:** AI reports actions are being denied

**Solutions:**

1. Open the Dashboard

2. Check Permissions tab for the affected origin

3. Verify the tool is allowed for that origin

4. Check if there's a default "deny" policy

### Slow Performance

**Symptoms:** AI interactions take a long time

**Solutions:**

1. Check the accessibility tree size (very large pages can be slow)

2. Use more specific selectors in AI prompts

3. Close unnecessary browser tabs

4. Check extension console for errors:
   - Right-click extension icon → "Inspect popup"
   - Check for error messages

### Connection Timeouts

**Symptoms:** Actions fail with timeout errors

**Solutions:**

1. Increase timeout in requests (if configurable)

2. Check network connectivity

3. Verify the MCP server is running:

   ```bash
   ps aux | grep athreei
   ```

4. Restart the native host

### Reporting Issues

If you encounter a bug:

1. Collect logs from:
   - Dashboard audit log
   - Chrome extension console (`chrome://extensions/` → athreei → "Inspect views")
   - MCP server stderr output

2. Open an issue at [GitHub Issues](https://github.com/yourusername/athreei/issues)

3. Include:
   - Operating system and version
   - Chrome version
   - AI app name and version
   - Steps to reproduce
   - Relevant logs (sanitized of sensitive data)

## Security Recommendations

1. **Review permissions regularly** - Remove permissions for sites you no longer use

2. **Use "Ask" for sensitive actions** - Especially `browser_execute_script`

3. **Monitor audit logs** - Check for unexpected activity

4. **Keep software updated** - Install updates for athreei, Chrome, and your AI app

5. **Be cautious with prompts** - Don't let AI access sensitive sites like banking without careful review

## Getting Help

- **Documentation:** [docs/](../docs/)
- **Issues:** [GitHub Issues](https://github.com/yourusername/athreei/issues)
- **Discussions:** [GitHub Discussions](https://github.com/yourusername/athreei/discussions)
