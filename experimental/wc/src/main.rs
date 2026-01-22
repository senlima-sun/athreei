mod cli;
mod config;
mod git;
mod pty;
mod session;
mod tui;

use anyhow::{Context, Result};
use clap::Parser;
use cli::{Cli, Commands, RootCommands};
use config::{Config, WorktreeRoot};
use session::SessionStore;
use std::path::PathBuf;
use std::process::Command;

#[tokio::main]
async fn main() -> Result<()> {
    let cli = Cli::parse();
    let config = Config::load()?;
    config.ensure_dirs()?;

    let mut store = SessionStore::load(&config.sessions_file())?;

    match cli.command {
        Some(Commands::Start) => {
            cmd_start(&config, &mut store)?;
        }
        Some(Commands::New { name, root }) => {
            cmd_new(&name, root.as_deref(), &config, &mut store)?;
        }
        Some(Commands::List) => {
            cmd_list();
        }
        Some(Commands::Attach { target }) => {
            cmd_attach(&target)?;
        }
        Some(Commands::Stop { target }) => {
            cmd_stop(&target)?;
        }
        Some(Commands::Reset { target, path }) => {
            cmd_reset(&target, &path)?;
        }
        Some(Commands::Kill { target }) => {
            cmd_kill(&target, &mut store, &config)?;
        }
        Some(Commands::Root { action }) => {
            cmd_root(action, &config)?;
        }
        Some(Commands::Git { session }) => {
            if let Some(target) = session {
                let path = PathBuf::from(&target);
                if path.exists() {
                    std::env::set_current_dir(&path)?;
                } else if let Some(sess) = store.find_by_target(&target) {
                    std::env::set_current_dir(&sess.worktree_path)?;
                } else {
                    anyhow::bail!("Path or session '{}' not found", target);
                }
            }
            tui::run_git_ui()?;
        }
        None => {
            cmd_list();
        }
    }

    Ok(())
}

fn cmd_start(config: &Config, store: &mut SessionStore) -> Result<()> {
    let cwd = std::env::current_dir()?;
    let name = cwd
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("session");

    let session_name = format!("awc-{}", name);

    if tmux_session_exists(&session_name) {
        println!("Session '{}' already exists. Attaching...", name);
        return cmd_attach(name);
    }

    let session_id = {
        let session = store.create_session(name.to_string(), cwd.clone());
        session.id
    };
    store.save(&config.sessions_file())?;

    println!("Creating session [{}] {}...", session_id, name);

    let output = Command::new("tmux")
        .args([
            "new-session",
            "-d",
            "-s",
            &session_name,
            "-c",
            cwd.to_str().unwrap(),
            "claude",
            "--dangerously-skip-permissions",
        ])
        .output()?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        anyhow::bail!("Failed to create tmux session: {}", stderr);
    }

    println!("Session created. Attaching...");
    println!("(Ctrl+b d to detach, keep session running)\n");

    Command::new("tmux")
        .args(["attach-session", "-t", &session_name])
        .status()?;

    Ok(())
}

fn cmd_new(
    name: &str,
    root_name: Option<&str>,
    config: &Config,
    store: &mut SessionStore,
) -> Result<()> {
    let session_name = format!("awc-{}", name);

    if tmux_session_exists(&session_name) {
        println!("Session '{}' already exists. Attaching...", name);
        return cmd_attach(name);
    }

    let roots = config.load_roots()?;
    let root = if let Some(root_name) = root_name {
        roots
            .get(root_name)
            .cloned()
            .context(format!("Root '{}' not found. Use `awc root list` to see available roots.", root_name))?
    } else if roots.roots.len() == 1 {
        roots.roots.values().next().unwrap().clone()
    } else if roots.roots.is_empty() {
        anyhow::bail!("No roots configured. Use `awc root add <name> <path>` first.");
    } else {
        anyhow::bail!(
            "Multiple roots configured. Specify one with --root=<name>.\nAvailable: {}",
            roots.roots.keys().cloned().collect::<Vec<_>>().join(", ")
        );
    };

    let root_path = root.path.canonicalize().unwrap_or_else(|_| root.path.clone());
    let worktrees_dir = root
        .worktrees_path
        .as_ref()
        .and_then(|p| p.canonicalize().ok())
        .unwrap_or_else(|| root_path.clone());
    let worktree_path = git::create_worktree(name, &worktrees_dir)?;
    println!("Worktree created at: {}", worktree_path.display());

    if let Some(setup_script) = &root.setup_script {
        println!("Running setup script: {}", setup_script.display());
        let status = Command::new("sh")
            .arg(setup_script)
            .current_dir(&worktree_path)
            .env("ROOT_WORKTREE_PATH", &root_path)
            .env("ROOT_NAME", root_name.unwrap_or("default"))
            .env("WORKTREE_PATH", &worktree_path)
            .env("WORKTREE_NAME", name)
            .status()?;

        if !status.success() {
            eprintln!("Warning: Setup script exited with non-zero status");
        }
    }

    let session_id = {
        let session = store.create_session(name.to_string(), worktree_path.clone());
        session.id
    };
    store.save(&config.sessions_file())?;

    println!("Creating session [{}] {}...", session_id, name);

    let output = Command::new("tmux")
        .args([
            "new-session",
            "-d",
            "-s",
            &session_name,
            "-c",
            worktree_path.to_str().unwrap(),
            "claude",
            "--dangerously-skip-permissions",
        ])
        .output()?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        anyhow::bail!("Failed to create tmux session: {}", stderr);
    }

    println!("Session created. Attaching...");
    println!("(Ctrl+b d to detach, keep session running)\n");

    Command::new("tmux")
        .args(["attach-session", "-t", &session_name])
        .status()?;

    Ok(())
}

fn cmd_list() {
    let output = Command::new("tmux")
        .args([
            "list-sessions",
            "-F",
            "#{session_name} #{session_path} #{?session_attached,attached,detached}",
        ])
        .output();

    match output {
        Ok(out) if out.status.success() => {
            let sessions = String::from_utf8_lossy(&out.stdout);
            let awc_sessions: Vec<&str> = sessions
                .lines()
                .filter(|l| l.starts_with("awc-"))
                .collect();

            if awc_sessions.is_empty() {
                println!("No sessions.");
                println!("\nUsage:");
                println!("  awc start           Start session in current dir");
                println!("  awc new <name>      Create session with worktree");
                return;
            }

            println!("{:<20} {:<12} {}", "NAME", "STATUS", "PATH");
            println!("{}", "-".repeat(60));

            for line in awc_sessions {
                let parts: Vec<&str> = line.splitn(3, ' ').collect();
                if parts.len() >= 2 {
                    let name = parts[0].strip_prefix("awc-").unwrap_or(parts[0]);
                    let status = parts.get(2).unwrap_or(&"");
                    let path = parts.get(1).unwrap_or(&"");

                    let status_display = if *status == "attached" {
                        "\x1b[32m● attached\x1b[0m"
                    } else {
                        "\x1b[33m○ detached\x1b[0m"
                    };

                    println!("{:<20} {:<22} {}", name, status_display, path);
                }
            }
        }
        _ => {
            println!("No sessions (tmux not running).");
            println!("\nUsage:");
            println!("  awc start           Start session in current dir");
            println!("  awc new <name>      Create session with worktree");
        }
    }
}

fn cmd_attach(target: &str) -> Result<()> {
    let session_name = format!("awc-{}", target);

    if !tmux_session_exists(&session_name) {
        anyhow::bail!(
            "Session '{}' not found. Use 'awc list' to see sessions.",
            target
        );
    }

    println!("Attaching to {}... (Ctrl+b d to detach)\n", target);

    Command::new("tmux")
        .args(["attach-session", "-t", &session_name])
        .status()?;

    Ok(())
}

fn cmd_stop(target: &str) -> Result<()> {
    let session_name = format!("awc-{}", target);

    if !tmux_session_exists(&session_name) {
        anyhow::bail!("Session '{}' not found", target);
    }

    Command::new("tmux")
        .args(["send-keys", "-t", &session_name, "Escape"])
        .status()?;

    println!("Sent Esc to session '{}'", target);
    Ok(())
}

fn cmd_reset(target: &str, path: &PathBuf) -> Result<()> {
    let session_name = format!("awc-{}", target);

    if !tmux_session_exists(&session_name) {
        anyhow::bail!("Session '{}' not found", target);
    }

    let abs_path = if path.is_absolute() {
        path.clone()
    } else {
        std::env::current_dir()?.join(path)
    };

    if !abs_path.exists() {
        anyhow::bail!("Path does not exist: {}", abs_path.display());
    }

    Command::new("tmux")
        .args([
            "send-keys",
            "-t",
            &session_name,
            &format!("cd {}", abs_path.display()),
            "Enter",
        ])
        .status()?;

    println!("Session '{}' relocated to: {}", target, abs_path.display());
    Ok(())
}

fn cmd_kill(target: &str, store: &mut SessionStore, config: &Config) -> Result<()> {
    let session_name = format!("awc-{}", target);

    if tmux_session_exists(&session_name) {
        Command::new("tmux")
            .args(["kill-session", "-t", &session_name])
            .status()?;
        println!("Killed tmux session '{}'", target);
    }

    if let Some(session) = store.find_by_target(target).cloned() {
        if session.worktree_path.exists() && target != "." {
            println!(
                "Removing worktree at {}",
                session.worktree_path.display()
            );
            let _ = git::remove_worktree(&session.name);
        }
        store.remove(session.id);
        store.save(&config.sessions_file())?;
    }

    println!("Done.");
    Ok(())
}

fn cmd_root(action: RootCommands, config: &Config) -> Result<()> {
    let mut roots = config.load_roots()?;

    match action {
        RootCommands::Add {
            name,
            path,
            worktrees,
            setup,
        } => {
            let abs_path = if path.is_absolute() {
                path
            } else {
                std::env::current_dir()?.join(&path)
            };

            let worktrees_path = worktrees.map(|w| {
                let p = if w.is_absolute() {
                    w
                } else {
                    std::env::current_dir().unwrap().join(w)
                };
                std::fs::create_dir_all(&p).ok();
                p.canonicalize().unwrap_or(p)
            });

            let setup_script = setup.map(|s| {
                if s.is_absolute() {
                    s
                } else {
                    std::env::current_dir().unwrap().join(s)
                }
            });

            std::fs::create_dir_all(&abs_path)?;
            let abs_path = abs_path.canonicalize()?;

            roots.add(
                name.clone(),
                WorktreeRoot {
                    path: abs_path.clone(),
                    worktrees_path: worktrees_path.clone(),
                    setup_script: setup_script.clone(),
                },
            );
            config.save_roots(&roots)?;

            println!("Added root '{}':", name);
            println!("  Path: {}", abs_path.display());
            if let Some(wt) = worktrees_path {
                println!("  Worktrees: {}", wt.display());
            }
            if let Some(script) = setup_script {
                println!("  Setup: {}", script.display());
            }
        }
        RootCommands::List => {
            if roots.roots.is_empty() {
                println!("No roots configured.");
                println!("\nUsage:");
                println!("  awc root add <name> <path> [--worktrees=<dir>] [--setup=<script>]");
                return Ok(());
            }

            for (name, root) in roots.list() {
                println!("{}:", name);
                println!("  Path: {}", root.path.display());
                if let Some(wt) = &root.worktrees_path {
                    println!("  Worktrees: {}", wt.display());
                }
                if let Some(script) = &root.setup_script {
                    println!("  Setup: {}", script.display());
                }
                println!();
            }
        }
        RootCommands::Remove { name } => {
            if roots.remove(&name).is_some() {
                config.save_roots(&roots)?;
                println!("Removed root '{}'", name);
            } else {
                anyhow::bail!("Root '{}' not found", name);
            }
        }
        RootCommands::Update {
            name,
            worktrees,
            setup,
        } => {
            if worktrees.is_none() && setup.is_none() {
                anyhow::bail!(
                    "Nothing to update. Use --worktrees=<dir> or --setup=<script> to update."
                );
            }

            let root = roots
                .roots
                .get_mut(&name)
                .ok_or_else(|| anyhow::anyhow!("Root '{}' not found", name))?;

            println!("Updated root '{}':", name);

            if let Some(wt) = worktrees {
                if wt.as_os_str().is_empty() {
                    root.worktrees_path = None;
                    println!("  Worktrees: (reset to root path)");
                } else {
                    let p = if wt.is_absolute() {
                        wt
                    } else {
                        std::env::current_dir().unwrap().join(wt)
                    };
                    std::fs::create_dir_all(&p)?;
                    let p = p.canonicalize()?;
                    root.worktrees_path = Some(p.clone());
                    println!("  Worktrees: {}", p.display());
                }
            }

            if let Some(s) = setup {
                if s.as_os_str().is_empty() {
                    root.setup_script = None;
                    println!("  Setup: (removed)");
                } else {
                    let script = if s.is_absolute() {
                        s
                    } else {
                        std::env::current_dir().unwrap().join(s)
                    };
                    let script = script.canonicalize()?;
                    root.setup_script = Some(script.clone());
                    println!("  Setup: {}", script.display());
                }
            }

            config.save_roots(&roots)?;
        }
    }

    Ok(())
}

fn tmux_session_exists(name: &str) -> bool {
    Command::new("tmux")
        .args(["has-session", "-t", name])
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

