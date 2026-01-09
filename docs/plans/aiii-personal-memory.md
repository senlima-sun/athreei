# aiii Personal - AI Memory Layer

## Overview

**The "Me" pillar of a3i** (AI apps, Organization, Me)

aiii Personal gives your AI apps memory — organized by the parts of your life that matter.

### Value Proposition

> Your AI apps forget everything after each session. aiii Personal gives them memory — organized by the parts of your life that matter.

### Core Differentiators

- Not another AI app — works _with_ your existing AI apps (Claude, ChatGPT, Cursor)
- Local-first — your personal data stays on your machine
- Space-based organization — categorize by life domain (Work, Health, Finance, Learning)
- AI writes, you query — no manual logging, AI apps record automatically

### Target User

Power users who use AI daily across multiple contexts and want:

- Continuity between sessions ("remember what I worked on yesterday")
- Cross-context awareness ("my health history when evaluating products")
- Effortless summaries ("generate my standup notes")

---

## Architecture

### Core Principle

aiii is the memory backend. AI apps provide the intelligence.

```
┌─────────────────────────────────────────────────────────────┐
│                      AI Apps (unchanged)                     │
│    Claude Code    Claude Desktop    ChatGPT    Cursor       │
└──────────────────────────┬──────────────────────────────────┘
                           │ MCP protocol
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    aiii Desktop (Tauri)                      │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │                 React Frontend                       │   │
│  │   Home · Spaces · Search · Settings                  │   │
│  └───────────────────────┬─────────────────────────────┘   │
│                          │ Tauri IPC                        │
│  ┌───────────────────────┴─────────────────────────────┐   │
│  │                  Rust Backend                        │   │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────────┐    │   │
│  │  │  Storage  │  │ Encryption│  │  MCP Server   │    │   │
│  │  │  (SQLite) │  │ (AES-GCM) │  │  (toggleable) │    │   │
│  │  └───────────┘  └───────────┘  └───────────────┘    │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
         │                              │
         │ File system                  │ stdio/SSE (when enabled)
         ▼                              ▼
   ~/.aiii/data/                   Claude Desktop, etc.
   (encrypted SQLite + blobs)
```

### Components

| Component              | Purpose                                           |
| ---------------------- | ------------------------------------------------- |
| **Rust Backend**       | Storage, encryption, MCP server, categorization   |
| **React Frontend**     | Browse spaces, timeline, search, settings         |
| **MCP Server**         | Exposes resources, tools, prompts to AI apps      |
| **Claude Code Plugin** | Hooks (auto-capture) + Skills (explicit commands) |

---

## Data Model

### Database Schema (SQLite)

```sql
-- Spaces (user-defined categories)
spaces (
  id          TEXT PRIMARY KEY,  -- nanoid
  name        TEXT NOT NULL,     -- "Work", "Health"
  icon        TEXT,              -- emoji or icon name
  source_rules TEXT,             -- JSON: auto-categorization rules
  created_at  INTEGER,
  updated_at  INTEGER
)

-- Memories (individual items)
memories (
  id          TEXT PRIMARY KEY,
  space_id    TEXT REFERENCES spaces,
  source      TEXT NOT NULL,     -- "claude-code", "claude-desktop", "git", "manual"
  source_id   TEXT,              -- external reference (commit sha, session id)
  title       TEXT,              -- AI-generated or user-provided (encrypted)
  summary     TEXT,              -- AI-generated summary (encrypted)
  content     BLOB,              -- full content (encrypted)
  metadata    TEXT,              -- JSON: source-specific data
  created_at  INTEGER,
  updated_at  INTEGER
)

-- Tags (for cross-space querying)
tags (
  id          TEXT PRIMARY KEY,
  name        TEXT UNIQUE
)

memory_tags (
  memory_id   TEXT REFERENCES memories,
  tag_id      TEXT REFERENCES tags
)
```

### Encryption Strategy

| Data           | Encrypted | Reason                         |
| -------------- | --------- | ------------------------------ |
| Memory content | Yes       | Sensitive user data            |
| Memory summary | Yes       | May contain sensitive info     |
| Memory title   | Yes       | May reveal content             |
| Tags           | No        | Needed for unencrypted queries |
| Space names    | No        | Non-sensitive metadata         |
| Timestamps     | No        | Needed for timeline queries    |

---

## MCP Primitives

### Resources (read-only context)

| Resource URI                  | Returns                                 |
| ----------------------------- | --------------------------------------- |
| `aiii://spaces`               | List of all spaces with metadata        |
| `aiii://spaces/{id}`          | Space details + recent memories summary |
| `aiii://spaces/{id}/memories` | Paginated memory list                   |
| `aiii://memories/{id}`        | Full memory content                     |
| `aiii://rules`                | Auto-categorization rules               |
| `aiii://today`                | Today's memories across all spaces      |

### Prompts (templated workflows)

| Prompt              | Arguments         | Output                                 |
| ------------------- | ----------------- | -------------------------------------- |
| `daily-standup`     | `date?`           | Formatted standup from Work space      |
| `week-summary`      | `space?`, `week?` | Summary of specified period            |
| `search-memories`   | `query`, `space?` | Guided search with formatted results   |
| `save-conversation` | `space`, `title?` | Structured save flow with confirmation |
| `health-context`    | `topic`           | Relevant health history for decisions  |

### Tools (actions requiring approval)

| Tool            | Purpose                    | Parameters                                |
| --------------- | -------------------------- | ----------------------------------------- |
| `save_memory`   | Store new memory           | `content`, `space_id?`, `title?`, `tags?` |
| `create_space`  | Create new space           | `name`, `icon?`, `source_rules?`          |
| `update_memory` | Edit memory                | `id`, `space_id?`, `title?`, `tags?`      |
| `delete_memory` | Remove memory              | `id`                                      |
| `update_rules`  | Modify auto-categorization | `space_id`, `rules`                       |

---

## Claude Code Plugin

### Plugin Structure

```
aiii-memory/
├── .claude-plugin/
│   └── plugin.json
├── hooks/
│   └── hooks.json
├── skills/
│   ├── save-to-memory/
│   │   └── SKILL.md
│   ├── generate-standup/
│   │   └── SKILL.md
│   ├── recall-memory/
│   │   └── SKILL.md
│   ├── manage-spaces/
│   │   └── SKILL.md
│   └── health-context/
│       └── SKILL.md
└── scripts/
    └── post-commit-capture.py
```

### Hooks (`hooks/hooks.json`)

```json
{
  "description": "Auto-capture to aiii memory",
  "hooks": {
    "SessionEnd": [
      {
        "hooks": [
          {
            "type": "prompt",
            "prompt": "Session ended. Summarize key work done and save to appropriate aiii space using save_memory tool. Input: $ARGUMENTS"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "${CLAUDE_PLUGIN_ROOT}/scripts/post-commit-capture.py",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

### Skills

#### `save-to-memory/SKILL.md`

```yaml
---
name: save-to-memory
description: Save current conversation to persistent memory. Use when user says "save this", "remember this", "store this for later", or wants to preserve context for future sessions.
allowed-tools: mcp__aiii__save_memory, mcp__aiii__list_spaces
---

# Save to Memory

## Instructions

1. Analyze the current conversation for key content
2. Query `aiii://spaces` to get available spaces
3. Auto-detect appropriate space based on:
   - Content keywords (health terms → Health, code/tickets → Work)
   - Recent space usage patterns
4. Generate concise title (< 50 chars)
5. Extract relevant tags
6. Call `save_memory` tool with:
   - content: conversation summary
   - space_id: detected or user-specified space
   - title: generated title
   - tags: extracted tags
   - source: "claude-code"
7. Confirm save to user with space name and title
```

#### `generate-standup/SKILL.md`

```yaml
---
name: generate-standup
description: Generate daily standup notes from memory. Use when user says "standup", "daily report", "what did I work on", or needs work summary.
allowed-tools: mcp__aiii__query_memories, mcp__aiii__get_summary
---

# Daily Standup Generator

## Instructions

1. Query `aiii://spaces/work/memories` for today's entries
2. Also check `aiii://today` for cross-space activity
3. Group by:
   - Completed items
   - In-progress items
   - Blockers (if mentioned)
4. Format as standup:

## Yesterday/Today
- [completed items]

## Working On
- [in-progress items]

## Blockers
- [if any]

5. Present to user for review/edit
```

#### `recall-memory/SKILL.md`

```yaml
---
name: recall-memory
description: Search and retrieve from memory. Use when user asks about past conversations, "what did we discuss", "find my notes about", or needs historical context.
allowed-tools: mcp__aiii__query_memories
---

# Recall from Memory

## Instructions

1. Parse user query for:
   - Keywords/topics
   - Time range (if mentioned)
   - Specific space (if mentioned)
2. Call `query_memories` with parsed parameters
3. Present results with:
   - Title and date
   - Summary preview
   - Source (claude-code, claude-desktop, git, manual)
4. Offer to load full content if user wants details
```

#### `health-context/SKILL.md`

```yaml
---
name: health-context
description: Retrieve health history for informed decisions. Use when discussing medications, supplements, skincare, diet, fitness, or any health-related product evaluation.
allowed-tools: mcp__aiii__query_memories
---

# Health Context Retrieval

## Instructions

1. Query `aiii://spaces/health/memories` for relevant history
2. Look for:
   - Known allergies or sensitivities
   - Current medications/supplements
   - Past health discussions
   - Preferences and concerns
3. Present relevant context before giving advice
4. Flag any potential interactions or concerns
```

---

## Desktop App (Tauri)

### Rust Crate Structure

```
aiii-desktop/
├── src-tauri/
│   ├── Cargo.toml
│   └── src/
│       ├── main.rs           # Tauri entry
│       ├── commands/         # IPC commands for frontend
│       │   ├── mod.rs
│       │   ├── spaces.rs
│       │   ├── memories.rs
│       │   └── settings.rs
│       ├── storage/
│       │   ├── mod.rs
│       │   ├── db.rs         # rusqlite wrapper
│       │   └── encryption.rs # AES-GCM + Argon2
│       ├── mcp/
│       │   ├── mod.rs
│       │   ├── server.rs     # MCP protocol impl
│       │   ├── resources.rs  # aiii:// resources
│       │   ├── tools.rs      # save_memory, etc.
│       │   └── prompts.rs    # standup, etc.
│       └── categorization/
│           ├── mod.rs
│           └── rules.rs      # Auto-categorization
├── src/                      # React frontend
│   ├── App.tsx
│   ├── pages/
│   ├── components/
│   └── lib/
│       └── tauri.ts          # IPC bindings
├── package.json
└── tauri.conf.json
```

### Key Rust Dependencies

```toml
[dependencies]
tauri = { version = "2", features = ["shell-open"] }
rusqlite = { version = "0.32", features = ["bundled", "fts5"] }
aes-gcm = "0.10"
argon2 = "0.5"
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
```

### MCP Server Control

The MCP server is embedded and toggleable:

- **OFF** — No server running, AI apps cannot connect
- **ON** — Server listening on localhost, AI apps can discover
- **Connected** — Shows which AI apps are currently using it

Security constraints:

- Localhost only (`127.0.0.1`)
- User must explicitly enable
- Shows connected clients in UI
- One-click disconnect all

---

## Encryption & Security

### Key Derivation

```
Passphrase ──► Argon2id ──► Master Key (256-bit)
                 │
                 ├─► params: m=64MB, t=3, p=4
                 └─► salt: random 16 bytes (stored)
```

### Data Encryption

```
Memory Content ──► AES-256-GCM ──► Encrypted Blob
                      │
                      ├─► nonce: random 12 bytes/record
                      └─► AAD: memory_id + space_id
```

### App Lock Flow

1. **Locked** — Passphrase prompt shown
2. **Unlocking** — Deriving key with Argon2
3. **Unlocked** — Vault in memory, app usable
4. **Auto-lock** triggers on:
   - App minimize (optional)
   - Idle timeout (configurable)
   - Manual lock

---

## Optional Cloud Sync

### Architecture

```
Device A                              Device B
    │                                     │
    │  E2E Encrypted                      │
    │  (only ciphertext leaves device)    │
    ▼                                     ▼
┌─────────────────────────────────────────────┐
│              aiii Sync Server               │
│                                             │
│  • Stores encrypted blobs only              │
│  • Cannot decrypt (no access to keys)       │
│  • Handles conflict resolution              │
│  • Uses existing @athreei/sync-server       │
└─────────────────────────────────────────────┘
```

### Sync Protocol

1. User enables sync, creates account
2. Data encrypted locally with vault key
3. Encrypted blobs + vector clocks uploaded
4. Other devices pull, decrypt with same passphrase
5. Conflict resolution via vector clocks (last-write-wins tiebreaker)

### Pricing (Future)

| Tier     | Storage | Price     |
| -------- | ------- | --------- |
| Free     | 100 MB  | $0        |
| Personal | 1 GB    | $5/month  |
| Pro      | 10 GB   | $15/month |

---

## User Journeys

### Journey 1: Auto-capture from Claude Code

1. User works in Claude Code on tickets
2. Session ends
3. SessionEnd hook triggers
4. Claude summarizes and calls `save_memory`
5. Rust backend categorizes → Work space
6. User sees new memory in timeline

### Journey 2: Daily Standup

1. User: "Generate my standup"
2. `generate-standup` skill triggers
3. Queries Work space memories for today
4. Formats as standup report
5. User copies to Slack

### Journey 3: Health Context

1. User: "Is this retinol safe for me?"
2. `health-context` skill triggers
3. Queries Health space for relevant history
4. Returns context (sensitive skin, medications)
5. Claude provides informed response

---

## Implementation Phases

### Phase 1: Core Foundation

- Tauri project setup
- Rust storage layer (SQLite + encryption)
- Basic React UI (Home, Spaces, Memory views)
- Manual memory input via UI

**Exit:** User can create spaces, add memories, browse timeline.

### Phase 2: MCP Server

- Embedded MCP server with toggle
- Resources (`aiii://spaces`, etc.)
- Tools (`save_memory`, `query_memories`)
- Prompts (`daily-standup`)
- Connection UI

**Exit:** Claude Desktop can query and save memories.

### Phase 3: Claude Code Plugin

- Plugin scaffold
- SessionEnd hook for auto-capture
- Skills (save-to-memory, recall-memory, generate-standup)
- Auto-categorization rules engine

**Exit:** Claude Code sessions auto-save to appropriate spaces.

### Phase 4: Intelligence & Polish

- Full-text search (SQLite FTS5)
- Smart categorization
- Dashboard polish (stats, charts, filters)
- System tray, keyboard shortcuts

**Exit:** Production-ready local experience.

### Phase 5: Cloud Sync

- Sync protocol with vector clocks
- Server integration
- Account system
- Billing

**Exit:** Multi-device sync with E2E encryption.

---

## Repo Structure

```
athreei/
├── packages/
│   └── ... (existing)
├── apps/
│   ├── ... (existing)
│   └── aiii-desktop/           # NEW: Tauri app
│       ├── src-tauri/
│       ├── src/
│       ├── package.json
│       └── tauri.conf.json
└── plugins/
    └── aiii-memory/             # NEW: Claude Code plugin
        ├── .claude-plugin/
        ├── hooks/
        ├── skills/
        └── scripts/
```
