# @athreei/native-host

Native Messaging host binary for athreei. This binary acts as a bridge between the Chrome extension and the MCP server.

## Architecture

```
Chrome Extension <---> Native Host (this) <---> MCP Server
                 stdio              (future)
```

Currently, this native host implements the Chrome Native Messaging protocol (length-prefixed JSON over stdin/stdout). In Phase 3, it will be enhanced to communicate with the Chrome extension bidirectionally.

## Building

```bash
# Build for current platform
bun run build

# Build for all platforms
bun run build:all

# Development mode (with hot reload)
bun run dev
```

## Installation

### macOS

1. Build the binary:
   ```bash
   bun run build
   ```

2. Copy the binary to a permanent location:
   ```bash
   mkdir -p ~/Library/Application\ Support/athreei
   cp dist/athreei-host ~/Library/Application\ Support/athreei/
   chmod +x ~/Library/Application\ Support/athreei/athreei-host
   ```

3. Update `manifest.json` with the correct path and extension ID:
   ```json
   {
     "name": "com.athreei.host",
     "description": "athreei Native Messaging Host",
     "path": "/Users/YOUR_USERNAME/Library/Application Support/athreei/athreei-host",
     "type": "stdio",
     "allowed_origins": [
       "chrome-extension://YOUR_EXTENSION_ID/"
     ]
   }
   ```

4. Install the manifest:
   ```bash
   mkdir -p ~/Library/Application\ Support/Google/Chrome/NativeMessagingHosts
   cp manifest.json ~/Library/Application\ Support/Google/Chrome/NativeMessagingHosts/com.athreei.host.json
   ```

### Linux

1. Build the binary:
   ```bash
   bun run build:linux
   ```

2. Copy the binary to a permanent location:
   ```bash
   mkdir -p ~/.local/share/athreei
   cp dist/athreei-host-linux ~/.local/share/athreei/athreei-host
   chmod +x ~/.local/share/athreei/athreei-host
   ```

3. Update `manifest.json` and install:
   ```bash
   mkdir -p ~/.config/google-chrome/NativeMessagingHosts
   cp manifest.json ~/.config/google-chrome/NativeMessagingHosts/com.athreei.host.json
   ```

### Windows

1. Build the binary:
   ```bash
   bun run build:windows
   ```

2. Copy the binary to a permanent location (e.g., `C:\Program Files\athreei\`)

3. Update `manifest.json` with the Windows path (use double backslashes):
   ```json
   {
     "name": "com.athreei.host",
     "description": "athreei Native Messaging Host",
     "path": "C:\\Program Files\\athreei\\athreei-host-windows.exe",
     "type": "stdio",
     "allowed_origins": [
       "chrome-extension://YOUR_EXTENSION_ID/"
     ]
   }
   ```

4. Install the manifest via registry:
   ```
   [HKEY_CURRENT_USER\Software\Google\Chrome\NativeMessagingHosts\com.athreei.host]
   @="C:\\path\\to\\com.athreei.host.json"
   ```

## Protocol

The native host uses Chrome's Native Messaging protocol:

- Messages are JSON objects
- Each message is prefixed with a 4-byte unsigned integer (little-endian) indicating the message length
- Maximum message size: 1MB

### Message Format

**Request** (from extension):
```json
{
  "id": "uuid",
  "type": "request",
  "method": "browser_list_tabs",
  "payload": { /* tool arguments */ }
}
```

**Response** (to extension):
```json
{
  "id": "uuid",
  "type": "response",
  "success": true,
  "payload": { /* result data */ },
  "error": "optional error message"
}
```

**Event** (unsolicited):
```json
{
  "id": "uuid",
  "type": "event",
  "event": "ready",
  "payload": { /* event data */ }
}
```

## Testing

```bash
# Run tests
bun test

# Run tests in watch mode
bun test:watch
```

To manually test the native host, you can pipe messages to it:

```bash
# Build first
bun run build

# Test with a ping message
echo -n -e '\x1a\x00\x00\x00{"id":"1","type":"request","method":"ping","payload":{}}' | ./dist/athreei-host
```

## Logging

The native host logs to stderr (Chrome redirects this to a log file):
- macOS: `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.athreei.host.log`
- Linux: `~/.config/google-chrome/NativeMessagingHosts/com.athreei.host.log`
- Windows: Check Chrome's extension logs

## Development

The native host is built with Bun and TypeScript. Key files:

- `src/index.ts` - Main entry point, message loop
- `src/protocol.ts` - Native Messaging protocol implementation
- `src/handlers.ts` - Request handlers for each browser tool

## Next Steps

In Phase 3, this native host will be enhanced to:
1. Actually communicate with the Chrome extension (currently returns mock responses)
2. Forward requests from the MCP server to the extension
3. Handle events from the extension
4. Implement health monitoring and auto-reconnect
