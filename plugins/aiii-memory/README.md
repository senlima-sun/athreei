# aiii Memory Plugin for Claude Code

Personal AI memory layer for Claude Code. Auto-capture and recall memories across AI conversations.

## Features

- **Auto-capture**: Automatically save session summaries when conversations end
- **Manual save**: Explicitly save important information with `/save-to-memory`
- **Recall**: Search past memories with `/recall-memory`
- **Standup**: Generate daily standup notes from work memories
- **Health context**: Retrieve relevant health history for informed decisions
- **Space management**: Organize memories into categorized spaces

## Installation

```bash
# From Claude Code
/plugin install aiii-memory
```

Or manually add to your Claude Code plugins directory.

## Requirements

- **aiii Desktop** must be running with the MCP server enabled
- Vault must be unlocked for memory operations

## Skills

| Skill              | Trigger                                | Description                |
| ------------------ | -------------------------------------- | -------------------------- |
| `save-to-memory`   | "save this", "remember this"           | Save current conversation  |
| `recall-memory`    | "what did we discuss", "find my notes" | Search memories            |
| `generate-standup` | "standup", "daily report"              | Generate standup notes     |
| `health-context`   | Health product questions               | Retrieve health history    |
| `manage-spaces`    | "show my spaces", "create space"       | Manage memory organization |

## Hooks

### SessionEnd

Automatically prompts Claude to save a summary when a session ends.

### PostToolUse (Bash)

Detects git commits and suggests saving to Work space.

## Configuration

The plugin uses aiii's MCP server for all memory operations. Ensure:

1. aiii Desktop is installed and running
2. MCP server is enabled in Settings
3. Vault is unlocked

## Spaces

Memories are organized into spaces:

- **Work**: Coding, tickets, PRs, technical work
- **Health**: Medical, fitness, nutrition
- **Learning**: Tutorials, courses, new skills
- **Finance**: Budgets, investments, purchases

Create custom spaces as needed.

## Privacy

All memories are:

- Stored locally on your machine
- Encrypted with AES-256-GCM
- Protected by your passphrase
- Never sent to any cloud service (unless you enable optional sync)

## License

MIT
