use clap::{Parser, Subcommand};
use std::path::PathBuf;

#[derive(Parser)]
#[command(name = "awc")]
#[command(about = "Athreei Worktree Claude - Manage git worktrees and Claude Code sessions")]
pub struct Cli {
    #[command(subcommand)]
    pub command: Option<Commands>,
}

#[derive(Subcommand)]
pub enum Commands {
    /// Start a Claude session in current directory (no worktree)
    Start,

    /// Create a new worktree and start a Claude session
    New {
        /// Name for the worktree/session (will be used as branch name)
        name: String,

        /// Worktree root name (from `awc root add`)
        #[arg(short, long)]
        root: Option<String>,
    },

    /// List all sessions
    List,

    /// Attach to a session
    Attach {
        /// Session name
        target: String,
    },

    /// Send Esc to stop Claude's current operation
    Stop {
        /// Session name
        target: String,
    },

    /// Move a session to a new path
    Reset {
        /// Session name
        target: String,

        /// New path for the session
        path: PathBuf,
    },

    /// Kill a session and optionally remove the worktree
    Kill {
        /// Session name
        target: String,
    },

    /// Manage worktree roots
    Root {
        #[command(subcommand)]
        action: RootCommands,
    },

    /// Open git TUI for staging, committing, and managing changes
    #[command(alias = "g")]
    Git {
        /// Session name to use its worktree (optional, defaults to current dir)
        session: Option<String>,
    },
}

#[derive(Subcommand)]
pub enum RootCommands {
    /// Add a worktree root
    Add {
        /// Name for this root
        name: String,

        /// Path to the root directory
        path: PathBuf,

        /// Directory where worktrees will be created (defaults to root path)
        #[arg(short, long)]
        worktrees: Option<PathBuf>,

        /// Setup script to run after creating worktree
        #[arg(short, long)]
        setup: Option<PathBuf>,
    },

    /// List all configured roots
    List,

    /// Remove a worktree root
    Remove {
        /// Name of the root to remove
        name: String,
    },

    /// Update a worktree root's configuration
    Update {
        /// Name of the root to update
        name: String,

        /// New worktrees directory (use --worktrees="" to reset to root path)
        #[arg(short, long)]
        worktrees: Option<PathBuf>,

        /// New setup script path (use --setup="" to remove)
        #[arg(short, long)]
        setup: Option<PathBuf>,
    },
}
