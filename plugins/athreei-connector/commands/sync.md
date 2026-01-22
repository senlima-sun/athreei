---
name: athreei-sync
description: Sync plugins and MCP server configurations from athreei platform
allowed-tools:
  - Bash
---

# athreei Sync Command

Sync your installed plugins and MCP server configurations from the athreei platform to your local Claude Code installation.

## Prerequisites

- athreei CLI installed (`bun install -g @athreei/cli`)
- Logged in to athreei (`athreei auth login`)
- Active organization selected (`athreei org switch <org>`)

## Sync Workflow

1. **Check authentication status**
   ```bash
   athreei auth status
   ```

2. **Pull latest plugin list from cloud**
   ```bash
   athreei plugin sync
   ```

3. **Verify sync results**
   - New plugins will be added to `~/.claude/plugins/`
   - Updated plugins will have their manifests refreshed
   - Removed plugins (uninstalled from platform) will be deleted locally

## Output

Provide a summary of:
- Number of plugins added
- Number of plugins updated
- Number of plugins removed
- Any errors encountered

## Error Handling

If authentication fails:
- Prompt user to run `athreei auth login`
- Provide link to athreei platform for account setup

If no organization is selected:
- List available organizations
- Prompt user to run `athreei org switch`
