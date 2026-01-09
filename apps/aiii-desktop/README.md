# aiii Desktop

Desktop application for the athreei platform - a personal memory engine that stores and organizes your AI interactions locally with end-to-end encryption.

## Overview

aiii Desktop provides:

- **Local Memory Storage**: SQLite database with FTS5 full-text search
- **End-to-End Encryption**: AES-256-GCM encryption with Argon2id key derivation
- **MCP Server**: Built-in Model Context Protocol server for AI app integration
- **Cloud Sync**: Optional encrypted sync across devices (via athreei cloud)
- **System Tray**: Runs in background with quick access via tray icon

## Tech Stack

### Frontend
- **React 19** - UI framework
- **Vite 6** - Build tool and dev server
- **Tailwind CSS v4** - Styling
- **TanStack Query** - Data fetching and caching
- **React Router DOM** - Client-side routing
- **Lucide React** - Icons
- **shadcn/ui components** - UI components (Button, Card, Badge, Input)

### Backend (Tauri/Rust)
- **Tauri 2.0** - Desktop app framework
- **rusqlite** - SQLite database with FTS5
- **rmcp** - MCP SDK for Rust
- **aes-gcm** - AES-256-GCM encryption
- **argon2** - Key derivation
- **reqwest** - HTTP client for sync
- **rmp-serde + flate2** - Backup compression (msgpack + gzip)
- **tokio** - Async runtime

## Prerequisites

### All Platforms

1. **Rust** (1.70+)
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

2. **Bun** (1.0+)
   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```

3. **Tauri CLI**
   ```bash
   cargo install tauri-cli
   ```

### macOS

- Xcode Command Line Tools
  ```bash
  xcode-select --install
  ```
- Minimum supported version: macOS 10.15 (Catalina)

### Windows

- Microsoft Visual Studio C++ Build Tools
- WebView2 (included in Windows 11, downloadable for Windows 10)

### Linux

- System dependencies (Debian/Ubuntu):
  ```bash
  sudo apt update
  sudo apt install libwebkit2gtk-4.1-dev \
    build-essential \
    curl \
    wget \
    file \
    libssl-dev \
    libgtk-3-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev
  ```

- For Fedora:
  ```bash
  sudo dnf install webkit2gtk4.1-devel \
    openssl-devel \
    curl \
    wget \
    file \
    gtk3-devel \
    libappindicator-gtk3-devel \
    librsvg2-devel
  ```

- For Arch:
  ```bash
  sudo pacman -S webkit2gtk-4.1 \
    base-devel \
    curl \
    wget \
    file \
    openssl \
    appmenu-gtk-module \
    gtk3 \
    libappindicator-gtk3 \
    librsvg
  ```

## Getting Started

1. **Install dependencies**
   ```bash
   bun install
   ```

2. **Run in development mode**
   ```bash
   bun run tauri:dev
   ```
   This starts both the Vite dev server (port 1420) and the Tauri app with hot reload.

3. **Type checking**
   ```bash
   bun run typecheck
   ```

## Development Commands

| Command | Description |
|---------|-------------|
| `bun run dev` | Start Vite dev server only (port 1420) |
| `bun run build` | Build frontend for production |
| `bun run preview` | Preview production build |
| `bun run tauri:dev` | Development mode with hot reload |
| `bun run tauri:build` | Build production binaries |
| `bun run typecheck` | Run TypeScript type checking |

## Build Instructions

### Development Build

```bash
bun run tauri:dev
```

### Production Build

```bash
bun run tauri:build
```

Build outputs are placed in `src-tauri/target/release/bundle/`:

| Platform | Output |
|----------|--------|
| macOS | `dmg/aiii Desktop_*.dmg`, `macos/aiii Desktop.app` |
| Windows | `msi/aiii Desktop_*.msi`, `nsis/aiii Desktop_*-setup.exe` |
| Linux | `deb/aiii-desktop_*.deb`, `appimage/aiii-desktop_*.AppImage` |

### Cross-Platform Notes

- **macOS**: Builds for current architecture by default. For universal binary:
  ```bash
  rustup target add x86_64-apple-darwin
  rustup target add aarch64-apple-darwin
  cargo tauri build --target universal-apple-darwin
  ```

- **Windows**: Code signing requires certificate thumbprint in `tauri.conf.json`

- **Linux**: AppImage is portable; `.deb` requires dpkg-based systems

## Architecture

```
apps/aiii-desktop/
├── src/                      # React frontend
│   ├── components/           # UI components
│   │   ├── ui/              # shadcn/ui base components
│   │   ├── layout.tsx       # App shell with sidebar
│   │   ├── search-dialog.tsx
│   │   └── ...
│   ├── hooks/               # React hooks for Tauri commands
│   │   ├── use-spaces.ts
│   │   ├── use-mcp.ts
│   │   └── ...
│   ├── lib/                 # Utilities and types
│   │   ├── api.ts           # Tauri invoke wrappers
│   │   ├── tauri.ts         # Tauri API helpers
│   │   └── types.ts         # TypeScript types
│   ├── pages/               # Route pages
│   │   ├── home.tsx         # Dashboard with timeline
│   │   ├── spaces.tsx       # Space management
│   │   ├── space-detail.tsx # Single space view
│   │   └── settings.tsx     # App settings
│   ├── router.tsx           # React Router config
│   └── main.tsx             # App entry point
│
├── src-tauri/               # Rust backend
│   ├── src/
│   │   ├── lib.rs           # Tauri app setup
│   │   ├── main.rs          # Entry point
│   │   ├── state.rs         # Database state management
│   │   ├── commands/        # Tauri commands (IPC)
│   │   │   ├── vault.rs     # Encryption vault
│   │   │   ├── spaces.rs    # Space CRUD
│   │   │   ├── memories.rs  # Memory CRUD + search
│   │   │   ├── mcp.rs       # MCP server control
│   │   │   ├── sync.rs      # Cloud sync
│   │   │   ├── settings.rs  # App settings
│   │   │   └── backup.rs    # Export/import
│   │   ├── storage/         # SQLite database layer
│   │   │   ├── db.rs        # Database connection
│   │   │   ├── models.rs    # Data models
│   │   │   ├── repository.rs# CRUD operations
│   │   │   └── schema.sql   # DB schema with FTS5
│   │   ├── encryption/      # Vault encryption
│   │   │   ├── vault.rs     # AES-256-GCM encryption
│   │   │   ├── key.rs       # Argon2id key derivation
│   │   │   └── state.rs     # Vault state management
│   │   ├── mcp/             # MCP server
│   │   │   ├── server.rs    # Server implementation
│   │   │   ├── handler.rs   # rmcp handler
│   │   │   ├── tools.rs     # MCP tools (search, get, create)
│   │   │   ├── resources.rs # aiii:// URI resources
│   │   │   ├── transport.rs # stdio transport
│   │   │   └── state.rs     # Server state
│   │   ├── sync/            # Cloud sync
│   │   │   ├── client.rs    # HTTP client
│   │   │   ├── changes.rs   # Change tracker
│   │   │   ├── conflicts.rs # Conflict resolution
│   │   │   ├── push.rs      # Push to cloud
│   │   │   └── pull.rs      # Pull from cloud
│   │   └── backup/          # Backup/restore
│   │       ├── format.rs    # Backup file format
│   │       └── mod.rs       # Export/import logic
│   ├── capabilities/        # Tauri security capabilities
│   ├── icons/               # App icons
│   ├── Cargo.toml           # Rust dependencies
│   └── tauri.conf.json      # Tauri configuration
│
├── index.html               # HTML template
├── vite.config.ts           # Vite configuration
├── tsconfig.json            # TypeScript config
├── components.json          # shadcn/ui config
└── package.json             # Node dependencies
```

## Features

### Encrypted Vault
- Passphrase-based encryption using Argon2id (64MB memory cost)
- AES-256-GCM authenticated encryption
- AAD binding to memory and space IDs
- Vault auto-lock support

### MCP Server
- stdio transport for Claude Desktop integration
- Tools: search memories, get memory, create memory, update memory, list spaces
- Resources: `aiii://memory/{id}`, `aiii://space/{id}`

### Cloud Sync
- End-to-end encrypted sync to athreei cloud
- Conflict detection and resolution
- Change tracking for offline support
- Push/pull synchronization

### Backup & Restore
- msgpack + gzip compressed backup files (`.aiii` extension)
- Import strategies: skip existing, merge, or replace all
- Includes spaces, memories, and tags

## Supported Platforms

| Platform | Architecture | Status |
|----------|-------------|--------|
| macOS | arm64 (Apple Silicon) | Supported |
| macOS | x64 (Intel) | Supported |
| Windows | x64 | Supported |
| Linux | x64 | Supported |

Minimum OS versions:
- macOS 10.15 (Catalina)
- Windows 10 (with WebView2)
- Linux with GTK 3 and WebKit2GTK 4.1
