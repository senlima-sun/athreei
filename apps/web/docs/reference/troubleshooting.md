# Troubleshooting Guide

This guide helps you diagnose and resolve common issues with athreei.

## Quick Diagnostics

Before diving into specific issues, run these checks:

```bash
# Check gateway is running
pgrep -f athreei-gateway

# Check gateway version
athreei-gateway --version

# Run with debug logging
athreei-gateway -d

# Verify config file
cat ~/.athreei/config.json | jq .

# Test API connectivity
curl -I https://athreei.com/api/health
```

## Installation Issues

### "Command not found: athreei-gateway"

The gateway isn't in your PATH.

**Solutions:**

1. Install globally:
   ```bash
   bun install -g @athreei/gateway
   ```

2. Use npx:
   ```bash
   npx @athreei/gateway
   ```

3. Add to PATH manually:
   ```bash
   export PATH="$PATH:$(npm prefix -g)/bin"
   ```

### "Cannot find module" errors

Dependencies not installed correctly.

**Solution:**

```bash
# Clear node_modules and reinstall
rm -rf node_modules
bun install
```

### Native host installation fails

The native messaging host requires proper installation.

**macOS:**

```bash
# Install manifest
athreei-native-host --install

# Verify manifest
cat ~/Library/Application\ Support/Google/Chrome/NativeMessagingHosts/com.athreei.native_host.json
```

**Linux:**

```bash
athreei-native-host --install

# Verify manifest
cat ~/.config/google-chrome/NativeMessagingHosts/com.athreei.native_host.json
```

**Windows:**

```powershell
athreei-native-host --install

# Verify registry
reg query "HKCU\Software\Google\Chrome\NativeMessagingHosts\com.athreei.native_host"
```

## Gateway Issues

### Gateway won't start

**Symptom:** Gateway exits immediately or shows error.

**Check 1: Config file syntax**

```bash
cat ~/.athreei/config.json | jq .
# If this shows an error, fix the JSON syntax
```

**Check 2: Required fields**

```bash
# Must have either:
# - apiKey + endpoint (connected mode)
# - standalone: true + servers (standalone mode)

jq '.apiKey, .endpoint, .standalone' ~/.athreei/config.json
```

**Check 3: API key validity**

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://athreei.com/api/gateway/config?endpoint=your-endpoint
```

### "Authentication failed"

**Causes:**
- Invalid API key
- Revoked API key
- Key doesn't have endpoint access

**Solutions:**

1. Verify key in Platform dashboard
2. Generate a new key if revoked
3. Check key has access to your endpoint

### "Endpoint not found"

**Causes:**
- Typo in endpoint name
- Endpoint deleted
- API key doesn't have access

**Solutions:**

1. Check exact endpoint name in dashboard
2. Verify endpoint exists in your namespace
3. Create endpoint if needed

### Server connection failures

**Symptom:** Gateway starts but can't connect to MCP servers.

**Check 1: Server command exists**

```bash
which mcp-server-github
# Should return path, not empty
```

**Check 2: Server starts independently**

```bash
mcp-server-github --help
# Should show help, not error
```

**Check 3: Environment variables**

```bash
# Check if referenced vars exist
echo $GITHUB_TOKEN
```

**Check 4: Debug mode**

```bash
athreei-gateway -d 2>&1 | grep -i error
```

### Tools not appearing in AI app

**Symptom:** AI assistant says no tools available.

**Check 1: Gateway running**

```bash
pgrep -f athreei-gateway
```

**Check 2: AI app config**

Claude Desktop (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "athreei": {
      "command": "athreei-gateway"
    }
  }
}
```

**Check 3: Restart AI app**

Some apps cache tool lists. Restart the app after config changes.

**Check 4: Check debug output**

```bash
athreei-gateway -d 2>&1 | grep -i tool
# Should show "tools aggregated"
```

## Extension Issues

### Extension icon stays gray

**Causes:**
- Native host not installed
- Native host not running
- Permission issues

**Solutions:**

1. Install native host:
   ```bash
   athreei-native-host --install
   ```

2. Restart browser after installation

3. Check extension permissions in browser settings

### "Native host has exited"

**Causes:**
- Native host crashed
- Wrong binary architecture
- Permission denied

**Check logs:**

```bash
# macOS
cat ~/Library/Logs/athreei-native-host.log

# Linux
cat ~/.local/share/athreei/native-host.log
```

**Reinstall native host:**

```bash
athreei-native-host --uninstall
athreei-native-host --install
```

### Content script not injecting

**Symptom:** Extension can't interact with web pages.

**Check 1: Site permissions**

1. Click extension icon
2. Check "Allow on this site"
3. Reload the page

**Check 2: Extension enabled**

1. Go to `chrome://extensions`
2. Ensure athreei is enabled
3. Check for errors

**Check 3: Conflicting extensions**

Disable other browser automation extensions temporarily.

## Platform Issues

### Can't create namespace

**Causes:**
- Plan limits reached
- Permission denied

**Solutions:**

1. Check your plan limits in Settings
2. Verify you have admin/member role
3. Upgrade plan if needed

### Config not syncing

**Symptom:** Gateway doesn't pick up Platform changes.

**Check 1: Sync interval**

Default is 5 minutes. Wait or force sync.

**Check 2: Manual sync**

```bash
# Restart gateway to force sync
pkill athreei-gateway && athreei-gateway
```

**Check 3: Network issues**

```bash
curl https://athreei.com/api/health
```

### Traces not appearing

**Symptom:** Tool calls happen but traces don't show in dashboard.

**Check 1: Trace sync enabled**

Traces only sync when connected to Platform (not standalone mode).

**Check 2: Decryption passphrase**

You need to enter your passphrase in the dashboard to view trace details.

**Check 3: Time range**

Dashboard defaults to last 24 hours. Adjust the filter.

## Performance Issues

### High latency on tool calls

**Causes:**
- Slow MCP server
- Network issues
- Large payloads

**Solutions:**

1. Check server performance independently
2. Use local servers when possible
3. Reduce content size (use `selector` parameter)

### Gateway using too much memory

**Causes:**
- Many connected servers
- Large trace buffer
- Memory leak

**Solutions:**

1. Reduce number of servers
2. Restart gateway periodically
3. Report issue if persists

### Slow AI responses

**Causes:**
- Tool calls taking too long
- Too many tools exposed

**Solutions:**

1. Disable unused servers
2. Optimize server configurations
3. Use timeouts appropriately

## Error Messages

### "Config file not found"

```bash
mkdir -p ~/.athreei
cat > ~/.athreei/config.json << 'EOF'
{
  "apiKey": "atr_your_key",
  "endpoint": "your-endpoint"
}
EOF
```

### "Invalid JSON in config file"

Check for:
- Missing commas
- Trailing commas
- Unquoted strings
- Missing brackets

Use a JSON validator:

```bash
cat ~/.athreei/config.json | jq .
```

### "Server connection timed out"

Increase timeout in config:

```json
{
  "servers": [
    {
      "name": "slow-server",
      "command": "slow-server",
      "timeout": 60000
    }
  ]
}
```

### "Permission denied" on tool call

User denied the permission prompt. Either:
- Approve when prompted
- Pre-approve in permission settings
- Check domain isn't blocked

### "Rate limit exceeded"

Too many API calls. Wait and retry:

```bash
# Check rate limit headers
curl -I -H "Authorization: Bearer $API_KEY" \
  https://athreei.com/api/gateway/config
# Look for X-RateLimit-* headers
```

## Getting Help

### Debug Information to Collect

Before asking for help, gather:

1. **Gateway version:**
   ```bash
   athreei-gateway --version
   ```

2. **Config (redact secrets):**
   ```bash
   cat ~/.athreei/config.json | sed 's/atr_[^"]*/atr_REDACTED/g'
   ```

3. **Debug logs:**
   ```bash
   athreei-gateway -d 2>&1 | head -100
   ```

4. **Extension version:**
   Check in `chrome://extensions`

5. **OS and browser:**
   ```bash
   uname -a
   # Browser: e.g., Chrome 120.0.6099.109
   ```

### Support Channels

- **GitHub Issues:** https://github.com/athreei/athreei/issues
- **Discord:** https://discord.gg/athreei
- **Email:** support@athreei.com

### Reporting Bugs

Include:
1. What you expected to happen
2. What actually happened
3. Steps to reproduce
4. Debug information (see above)
5. Screenshots if relevant

## Common Fixes Summary

| Issue | Quick Fix |
|-------|-----------|
| Gateway won't start | Check config JSON syntax |
| Auth failed | Verify API key in dashboard |
| Tools not showing | Restart AI app |
| Extension gray | Reinstall native host |
| Slow performance | Enable debug, check timeouts |
| Traces missing | Check sync mode, passphrase |

## Next Steps

- [API Reference](./api.md)
- [MCP Configuration](./mcp-config.md)
- [Local Gateway Setup](../guides/local-gateway.md)
