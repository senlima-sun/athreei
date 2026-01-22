use anyhow::Result;
use crossterm::{
    event::{self, Event, KeyCode, KeyModifiers},
    execute,
    terminal::{disable_raw_mode, enable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen},
};
use git2::{DiffOptions, Repository, StatusOptions};
use std::io::Write;
use ratatui::{
    backend::CrosstermBackend,
    layout::{Constraint, Direction, Layout, Rect},
    style::{Color, Modifier, Style},
    text::{Line, Span},
    widgets::{Block, Borders, List, ListItem, ListState, Paragraph, Wrap},
    Frame, Terminal,
};
use std::io;

#[derive(Debug, Clone)]
pub struct FileEntry {
    pub path: String,
    pub status: FileStatus,
    pub staged: bool,
}

#[derive(Debug, Clone)]
pub struct CommitEntry {
    pub oid: String,
    pub short_oid: String,
    pub author: String,
    pub date: String,
    pub message: String,
    pub full_message: String,
}

#[derive(Debug, Clone)]
pub struct CommitFileEntry {
    pub path: String,
    pub status: FileStatus,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum FileStatus {
    Modified,
    Added,
    Deleted,
    Renamed,
    Untracked,
    Conflicted,
}

impl FileStatus {
    fn symbol(&self) -> &str {
        match self {
            FileStatus::Modified => "M",
            FileStatus::Added => "A",
            FileStatus::Deleted => "D",
            FileStatus::Renamed => "R",
            FileStatus::Untracked => "?",
            FileStatus::Conflicted => "!",
        }
    }

    fn color(&self) -> Color {
        match self {
            FileStatus::Modified => Color::Yellow,
            FileStatus::Added => Color::Green,
            FileStatus::Deleted => Color::Red,
            FileStatus::Renamed => Color::Cyan,
            FileStatus::Untracked => Color::Gray,
            FileStatus::Conflicted => Color::Magenta,
        }
    }
}

pub struct App {
    pub files: Vec<FileEntry>,
    pub selected: usize,
    pub list_state: ListState,
    pub diff_content: String,
    pub diff_scroll: u16,
    pub diff_line_count: usize,
    pub diff_area_height: u16,
    pub message: Option<String>,
    pub input_mode: InputMode,
    pub focused_pane: FocusedPane,
    pub commit_message: String,
    pub has_conflicts: bool,
    pub branch_name: String,
    pub repo_path: String,
    pub loading: bool,
    pub loading_frame: usize,
    pub ai_result: Option<std::sync::mpsc::Receiver<Result<String, String>>>,
    pub commits: Vec<CommitEntry>,
    pub commits_selected: usize,
    pub commits_list_state: ListState,
    pub commits_has_more: bool,
    pub commit_files: Vec<CommitFileEntry>,
    pub commit_files_selected: usize,
    pub commit_files_list_state: ListState,
    pub selected_commit: Option<CommitEntry>,
    pub commit_diff_content: String,
    pub commit_diff_scroll: u16,
    pub commit_diff_line_count: usize,
    pub merge_branch_input: String,
    pub previous_pane: Option<FocusedPane>,
    pub rebase_branch_input: String,
    pub is_rebasing: bool,
    pub rebase_head_name: Option<String>,
    pub rebase_progress: Option<(usize, usize)>,
}

const SPINNER: &[&str] = &["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

#[derive(PartialEq, Clone, Copy)]
pub enum InputMode {
    Normal,
    CommitMessage,
    MergeBranchInput,
    RebaseBranchInput,
}

#[derive(PartialEq, Clone, Copy)]
pub enum FocusedPane {
    FileList,
    DiffView,
    CommitsList,
    CommitDetail,
    CommitDiffView,
}

impl App {
    pub fn new() -> Result<Self> {
        let cwd = std::env::current_dir()?;
        let repo = Repository::discover(&cwd)?;
        let repo_path = repo.workdir().unwrap_or(cwd.as_path()).to_string_lossy().to_string();

        let branch_name = repo
            .head()
            .ok()
            .and_then(|h| h.shorthand().map(String::from))
            .unwrap_or_else(|| "HEAD".to_string());

        let mut app = App {
            files: Vec::new(),
            selected: 0,
            list_state: ListState::default(),
            diff_content: String::new(),
            diff_scroll: 0,
            diff_line_count: 0,
            diff_area_height: 10,
            message: None,
            input_mode: InputMode::Normal,
            focused_pane: FocusedPane::FileList,
            commit_message: String::new(),
            has_conflicts: false,
            branch_name,
            repo_path,
            loading: false,
            loading_frame: 0,
            ai_result: None,
            commits: Vec::new(),
            commits_selected: 0,
            commits_list_state: ListState::default(),
            commits_has_more: true,
            commit_files: Vec::new(),
            commit_files_selected: 0,
            commit_files_list_state: ListState::default(),
            selected_commit: None,
            commit_diff_content: String::new(),
            commit_diff_scroll: 0,
            commit_diff_line_count: 0,
            merge_branch_input: String::new(),
            previous_pane: None,
            rebase_branch_input: String::new(),
            is_rebasing: false,
            rebase_head_name: None,
            rebase_progress: None,
        };

        app.refresh_status()?;
        app.list_state.select(Some(0));

        Ok(app)
    }

    pub fn refresh_status(&mut self) -> Result<()> {
        let cwd = std::env::current_dir()?;
        let repo = Repository::discover(&cwd)?;

        let mut opts = StatusOptions::new();
        opts.include_untracked(true)
            .recurse_untracked_dirs(true)
            .include_ignored(false);

        let statuses = repo.statuses(Some(&mut opts))?;

        self.files.clear();
        self.has_conflicts = false;

        for entry in statuses.iter() {
            let path = entry.path().unwrap_or("").to_string();
            let status = entry.status();

            if status.is_conflicted() {
                self.has_conflicts = true;
                self.files.push(FileEntry {
                    path,
                    status: FileStatus::Conflicted,
                    staged: false,
                });
            } else if status.is_index_new() {
                self.files.push(FileEntry {
                    path,
                    status: FileStatus::Added,
                    staged: true,
                });
            } else if status.is_index_modified() {
                self.files.push(FileEntry {
                    path,
                    status: FileStatus::Modified,
                    staged: true,
                });
            } else if status.is_index_deleted() {
                self.files.push(FileEntry {
                    path,
                    status: FileStatus::Deleted,
                    staged: true,
                });
            } else if status.is_index_renamed() {
                self.files.push(FileEntry {
                    path,
                    status: FileStatus::Renamed,
                    staged: true,
                });
            } else if status.is_wt_new() {
                self.files.push(FileEntry {
                    path,
                    status: FileStatus::Untracked,
                    staged: false,
                });
            } else if status.is_wt_modified() {
                self.files.push(FileEntry {
                    path,
                    status: FileStatus::Modified,
                    staged: false,
                });
            } else if status.is_wt_deleted() {
                self.files.push(FileEntry {
                    path,
                    status: FileStatus::Deleted,
                    staged: false,
                });
            }
        }

        self.files.sort_by(|a, b| {
            let stage_order = b.staged.cmp(&a.staged);
            if stage_order != std::cmp::Ordering::Equal {
                stage_order
            } else {
                a.path.cmp(&b.path)
            }
        });

        if self.selected >= self.files.len() && !self.files.is_empty() {
            self.selected = self.files.len() - 1;
        }

        self.check_rebase_state()?;
        self.update_diff()?;
        Ok(())
    }

    pub fn update_diff(&mut self) -> Result<()> {
        if self.files.is_empty() {
            self.diff_content = "No changes".to_string();
            return Ok(());
        }

        let file = &self.files[self.selected];
        let cwd = std::env::current_dir()?;
        let repo = Repository::discover(&cwd)?;

        let mut diff_opts = DiffOptions::new();
        diff_opts.pathspec(&file.path);

        let diff = if file.staged {
            let head = repo.head()?.peel_to_tree()?;
            repo.diff_tree_to_index(Some(&head), None, Some(&mut diff_opts))?
        } else {
            repo.diff_index_to_workdir(None, Some(&mut diff_opts))?
        };

        let mut diff_text = String::new();
        diff.print(git2::DiffFormat::Patch, |_delta, _hunk, line| {
            let origin = line.origin();
            let prefix = match origin {
                '+' => "+",
                '-' => "-",
                ' ' => " ",
                'H' => "", // hunk header (@@ ... @@)
                _ => return true, // skip file headers (diff --git, index, ---, +++)
            };
            if let Ok(content) = std::str::from_utf8(line.content()) {
                diff_text.push_str(prefix);
                diff_text.push_str(content);
            }
            true
        })?;

        if diff_text.is_empty() {
            if file.status == FileStatus::Untracked {
                let full_path = repo.workdir().unwrap().join(&file.path);
                if let Ok(content) = std::fs::read_to_string(&full_path) {
                    diff_text = format!("New file: {}\n\n{}", file.path, content);
                }
            } else {
                diff_text = format!("No diff available for {}", file.path);
            }
        }

        self.diff_line_count = diff_text.lines().count();
        self.diff_content = diff_text;
        self.diff_scroll = 0;
        Ok(())
    }

    pub fn toggle_stage(&mut self) -> Result<()> {
        if self.files.is_empty() {
            return Ok(());
        }

        let file = &self.files[self.selected].clone();

        let output = if file.staged {
            std::process::Command::new("git")
                .args(["reset", "HEAD", "--", &file.path])
                .output()?
        } else {
            std::process::Command::new("git")
                .args(["add", "--", &file.path])
                .output()?
        };

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            self.message = Some(format!("Error: {}", stderr.lines().next().unwrap_or("unknown")));
        } else {
            self.message = Some(if file.staged {
                format!("Unstaged: {}", file.path)
            } else {
                format!("Staged: {}", file.path)
            });
        }

        self.refresh_status()?;
        Ok(())
    }

    pub fn stage_all(&mut self) -> Result<()> {
        let cwd = std::env::current_dir()?;
        let repo = Repository::discover(&cwd)?;
        let mut index = repo.index()?;

        index.add_all(["*"].iter(), git2::IndexAddOption::DEFAULT, None)?;
        index.write()?;

        self.refresh_status()?;
        self.message = Some("All files staged".to_string());
        Ok(())
    }

    pub fn discard_changes(&mut self) -> Result<()> {
        if self.files.is_empty() {
            return Ok(());
        }

        let file = &self.files[self.selected];
        if file.staged {
            self.message = Some("Cannot discard staged file. Unstage first.".to_string());
            return Ok(());
        }

        let cwd = std::env::current_dir()?;
        let repo = Repository::discover(&cwd)?;

        if file.status == FileStatus::Untracked {
            let full_path = repo.workdir().unwrap().join(&file.path);
            std::fs::remove_file(full_path)?;
        } else {
            let mut checkout_opts = git2::build::CheckoutBuilder::new();
            checkout_opts.path(&file.path);
            checkout_opts.force();
            repo.checkout_head(Some(&mut checkout_opts))?;
        }

        self.message = Some(format!("Discarded: {}", file.path));
        self.refresh_status()?;
        Ok(())
    }

    pub fn commit(&mut self) -> Result<()> {
        if self.commit_message.trim().is_empty() {
            self.message = Some("Commit message cannot be empty".to_string());
            return Ok(());
        }

        let staged_count = self.files.iter().filter(|f| f.staged).count();
        if staged_count == 0 {
            self.message = Some("No staged files to commit".to_string());
            return Ok(());
        }

        let cwd = std::env::current_dir()?;
        let repo = Repository::discover(&cwd)?;
        let sig = repo.signature()?;
        let mut index = repo.index()?;
        let tree_id = index.write_tree()?;
        let tree = repo.find_tree(tree_id)?;

        let parent = repo.head()?.peel_to_commit()?;
        repo.commit(
            Some("HEAD"),
            &sig,
            &sig,
            &self.commit_message,
            &tree,
            &[&parent],
        )?;

        self.message = Some(format!("Committed: {}", self.commit_message.lines().next().unwrap_or("")));
        self.commit_message.clear();
        self.input_mode = InputMode::Normal;
        self.refresh_status()?;
        Ok(())
    }

    pub fn generate_commit_message(&mut self) -> Result<()> {
        let staged_count = self.files.iter().filter(|f| f.staged).count();
        if staged_count == 0 {
            self.message = Some("No staged files. Stage files first.".to_string());
            return Ok(());
        }

        if self.loading {
            return Ok(());
        }

        let diff_output = std::process::Command::new("git")
            .args(["diff", "--cached"])
            .output()?;

        let diff = String::from_utf8_lossy(&diff_output.stdout).to_string();
        let diff_preview = if diff.len() > 3000 {
            format!("{}...(truncated)", &diff[..3000])
        } else {
            diff
        };

        let prompt = format!(
            "Generate a concise git commit message for these changes. Follow conventional commits format (feat/fix/docs/refactor/etc). Output ONLY the commit message wrapped in <message></message> tags. No explanation.\n\nDiff:\n{}",
            diff_preview
        );

        let (tx, rx) = std::sync::mpsc::channel();
        self.ai_result = Some(rx);
        self.loading = true;
        self.loading_frame = 0;

        std::thread::spawn(move || {
            let output = std::process::Command::new("claude")
                .args(["-p", &prompt])
                .output();

            let _ = match output {
                Ok(out) if out.status.success() => {
                    let response = String::from_utf8_lossy(&out.stdout).to_string();
                    if let Some(start) = response.find("<message>") {
                        if let Some(end) = response.find("</message>") {
                            let msg = response[start + 9..end].trim().to_string();
                            tx.send(Ok(msg))
                        } else {
                            tx.send(Ok(response.trim().to_string()))
                        }
                    } else {
                        tx.send(Ok(response.trim().to_string()))
                    }
                }
                Ok(out) => {
                    let stderr = String::from_utf8_lossy(&out.stderr).to_string();
                    tx.send(Err(format!("AI error: {}", stderr.lines().next().unwrap_or("unknown"))))
                }
                Err(e) => tx.send(Err(format!("Failed to run claude: {}", e))),
            };
        });

        Ok(())
    }

    pub fn tick(&mut self) {
        if self.loading {
            self.loading_frame = (self.loading_frame + 1) % SPINNER.len();

            if let Some(ref rx) = self.ai_result {
                if let Ok(result) = rx.try_recv() {
                    self.loading = false;
                    self.ai_result = None;
                    match result {
                        Ok(msg) => {
                            self.commit_message = msg;
                            self.input_mode = InputMode::CommitMessage;
                            self.message = None;
                        }
                        Err(e) => {
                            self.message = Some(e);
                        }
                    }
                }
            }
        }
    }

    pub fn push(&mut self) -> Result<()> {
        self.message = Some("Pushing...".to_string());

        let output = std::process::Command::new("git")
            .args(["push"])
            .output()?;

        if output.status.success() {
            self.message = Some("Pushed successfully".to_string());
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            self.message = Some(format!("Push failed: {}", stderr.lines().next().unwrap_or("unknown error")));
        }
        Ok(())
    }

    pub fn pull(&mut self) -> Result<()> {
        self.message = Some("Pulling...".to_string());

        let output = std::process::Command::new("git")
            .args(["pull"])
            .output()?;

        if output.status.success() {
            self.message = Some("Pulled successfully".to_string());
            self.refresh_status()?;
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            self.message = Some(format!("Pull failed: {}", stderr.lines().next().unwrap_or("unknown error")));
        }
        Ok(())
    }

    pub fn rebase(&mut self) -> Result<()> {
        self.message = Some("Rebasing...".to_string());

        let output = std::process::Command::new("git")
            .args(["pull", "--rebase"])
            .output()?;

        if output.status.success() {
            self.message = Some("Rebase successful".to_string());
            self.refresh_status()?;
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            self.message = Some(format!("Rebase failed: {}", stderr.lines().next().unwrap_or("unknown error")));
            self.refresh_status()?;
        }
        Ok(())
    }

    pub fn rebase_onto_branch(&mut self) -> Result<()> {
        let branch_name = self.rebase_branch_input.trim();
        if branch_name.is_empty() {
            self.message = Some("Branch name cannot be empty".to_string());
            return Ok(());
        }

        self.message = Some(format!("Rebasing onto '{}'...", branch_name));

        let output = std::process::Command::new("git")
            .args(["rebase", branch_name])
            .output()?;

        if output.status.success() {
            self.message = Some(format!("Rebased onto '{}' successfully", branch_name));
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            let first_line = stderr.lines().next().unwrap_or("unknown error");
            if stderr.contains("CONFLICT") || stderr.contains("conflict") {
                self.message = Some("Rebase paused due to conflicts. Resolve and use [C]ontinue".to_string());
            } else {
                self.message = Some(format!("Rebase failed: {}", first_line));
            }
        }

        self.rebase_branch_input.clear();
        self.input_mode = InputMode::Normal;
        self.refresh_status()?;
        Ok(())
    }

    pub fn rebase_continue(&mut self) -> Result<()> {
        if !self.is_rebasing {
            self.message = Some("No rebase in progress".to_string());
            return Ok(());
        }

        self.message = Some("Continuing rebase...".to_string());

        let output = std::process::Command::new("git")
            .args(["rebase", "--continue"])
            .output()?;

        if output.status.success() {
            self.message = Some("Rebase continued successfully".to_string());
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            let first_line = stderr.lines().next().unwrap_or("unknown error");
            if stderr.contains("CONFLICT") || stderr.contains("conflict") {
                self.message = Some("More conflicts. Resolve and use [C]ontinue".to_string());
            } else if stderr.contains("No changes") {
                self.message = Some("No changes. Use [S]kip or [C]ontinue".to_string());
            } else {
                self.message = Some(format!("Continue failed: {}", first_line));
            }
        }

        self.refresh_status()?;
        Ok(())
    }

    pub fn rebase_abort(&mut self) -> Result<()> {
        if !self.is_rebasing {
            self.message = Some("No rebase in progress".to_string());
            return Ok(());
        }

        self.message = Some("Aborting rebase...".to_string());

        let output = std::process::Command::new("git")
            .args(["rebase", "--abort"])
            .output()?;

        if output.status.success() {
            self.message = Some("Rebase aborted".to_string());
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            self.message = Some(format!("Abort failed: {}", stderr.lines().next().unwrap_or("unknown error")));
        }

        self.refresh_status()?;
        Ok(())
    }

    pub fn rebase_skip(&mut self) -> Result<()> {
        if !self.is_rebasing {
            self.message = Some("No rebase in progress".to_string());
            return Ok(());
        }

        self.message = Some("Skipping commit...".to_string());

        let output = std::process::Command::new("git")
            .args(["rebase", "--skip"])
            .output()?;

        if output.status.success() {
            self.message = Some("Commit skipped".to_string());
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            let first_line = stderr.lines().next().unwrap_or("unknown error");
            if stderr.contains("CONFLICT") || stderr.contains("conflict") {
                self.message = Some("More conflicts after skip. Resolve and use [C]ontinue".to_string());
            } else {
                self.message = Some(format!("Skip failed: {}", first_line));
            }
        }

        self.refresh_status()?;
        Ok(())
    }

    fn move_up(&mut self) {
        if !self.files.is_empty() && self.selected > 0 {
            self.selected -= 1;
            self.list_state.select(Some(self.selected));
            let _ = self.update_diff();
        }
    }

    fn move_down(&mut self) {
        if !self.files.is_empty() && self.selected < self.files.len() - 1 {
            self.selected += 1;
            self.list_state.select(Some(self.selected));
            let _ = self.update_diff();
        }
    }

    fn scroll_diff_up(&mut self) {
        self.diff_scroll = self.diff_scroll.saturating_sub(3);
    }

    fn scroll_diff_down(&mut self) {
        let max_scroll = self.diff_line_count.saturating_sub(self.diff_area_height as usize);
        let new_scroll = self.diff_scroll.saturating_add(3);
        self.diff_scroll = new_scroll.min(max_scroll as u16);
    }

    fn scroll_diff_half_up(&mut self) {
        let half_page = self.diff_area_height / 2;
        self.diff_scroll = self.diff_scroll.saturating_sub(half_page);
    }

    fn scroll_diff_half_down(&mut self) {
        let half_page = self.diff_area_height / 2;
        let max_scroll = self.diff_line_count.saturating_sub(self.diff_area_height as usize);
        let new_scroll = self.diff_scroll.saturating_add(half_page);
        self.diff_scroll = new_scroll.min(max_scroll as u16);
    }

    fn scroll_diff_top(&mut self) {
        self.diff_scroll = 0;
    }

    fn scroll_diff_bottom(&mut self) {
        let max_scroll = self.diff_line_count.saturating_sub(self.diff_area_height as usize);
        self.diff_scroll = max_scroll as u16;
    }

    pub fn load_commits(&mut self, limit: usize) -> Result<()> {
        let cwd = std::env::current_dir()?;
        let repo = Repository::discover(&cwd)?;

        let mut revwalk = repo.revwalk()?;
        revwalk.push_head()?;
        revwalk.set_sorting(git2::Sort::TIME)?;

        self.commits.clear();
        self.commits_selected = 0;
        self.commits_list_state.select(Some(0));

        for (i, oid) in revwalk.enumerate() {
            if i >= limit {
                self.commits_has_more = true;
                break;
            }
            let oid = oid?;
            let commit = repo.find_commit(oid)?;
            let author = commit.author();
            let time = commit.time();
            let datetime = chrono::DateTime::from_timestamp(time.seconds(), 0)
                .map(|dt| dt.format("%Y-%m-%d %H:%M").to_string())
                .unwrap_or_else(|| "unknown".to_string());

            self.commits.push(CommitEntry {
                oid: oid.to_string(),
                short_oid: oid.to_string()[..7].to_string(),
                author: author.name().unwrap_or("unknown").to_string(),
                date: datetime,
                message: commit.summary().unwrap_or("").to_string(),
                full_message: commit.message().unwrap_or("").to_string(),
            });
        }

        if self.commits.len() < limit {
            self.commits_has_more = false;
        }

        Ok(())
    }

    pub fn load_more_commits(&mut self, additional: usize) -> Result<()> {
        if !self.commits_has_more {
            return Ok(());
        }

        let cwd = std::env::current_dir()?;
        let repo = Repository::discover(&cwd)?;

        let mut revwalk = repo.revwalk()?;
        revwalk.push_head()?;
        revwalk.set_sorting(git2::Sort::TIME)?;

        let current_count = self.commits.len();
        let target_count = current_count + additional;

        for (i, oid) in revwalk.enumerate() {
            if i < current_count {
                continue;
            }
            if i >= target_count {
                self.commits_has_more = true;
                return Ok(());
            }
            let oid = oid?;
            let commit = repo.find_commit(oid)?;
            let author = commit.author();
            let time = commit.time();
            let datetime = chrono::DateTime::from_timestamp(time.seconds(), 0)
                .map(|dt| dt.format("%Y-%m-%d %H:%M").to_string())
                .unwrap_or_else(|| "unknown".to_string());

            self.commits.push(CommitEntry {
                oid: oid.to_string(),
                short_oid: oid.to_string()[..7].to_string(),
                author: author.name().unwrap_or("unknown").to_string(),
                date: datetime,
                message: commit.summary().unwrap_or("").to_string(),
                full_message: commit.message().unwrap_or("").to_string(),
            });
        }

        self.commits_has_more = false;
        Ok(())
    }

    pub fn load_commit_files(&mut self) -> Result<()> {
        let commit = match &self.selected_commit {
            Some(c) => c.clone(),
            None => return Ok(()),
        };

        let cwd = std::env::current_dir()?;
        let repo = Repository::discover(&cwd)?;
        let oid = git2::Oid::from_str(&commit.oid)?;
        let commit_obj = repo.find_commit(oid)?;
        let tree = commit_obj.tree()?;

        self.commit_files.clear();
        self.commit_files_selected = 0;
        self.commit_files_list_state.select(Some(0));

        let parent_tree = if commit_obj.parent_count() > 0 {
            Some(commit_obj.parent(0)?.tree()?)
        } else {
            None
        };

        let diff = repo.diff_tree_to_tree(parent_tree.as_ref(), Some(&tree), None)?;

        diff.foreach(
            &mut |delta, _| {
                let path = delta
                    .new_file()
                    .path()
                    .or_else(|| delta.old_file().path())
                    .map(|p| p.to_string_lossy().to_string())
                    .unwrap_or_default();

                let status = match delta.status() {
                    git2::Delta::Added => FileStatus::Added,
                    git2::Delta::Deleted => FileStatus::Deleted,
                    git2::Delta::Modified => FileStatus::Modified,
                    git2::Delta::Renamed => FileStatus::Renamed,
                    _ => FileStatus::Modified,
                };

                self.commit_files.push(CommitFileEntry { path, status });
                true
            },
            None,
            None,
            None,
        )?;

        self.update_commit_diff()?;
        Ok(())
    }

    pub fn update_commit_diff(&mut self) -> Result<()> {
        if self.commit_files.is_empty() {
            self.commit_diff_content = "No files changed".to_string();
            self.commit_diff_line_count = 1;
            return Ok(());
        }

        let commit = match &self.selected_commit {
            Some(c) => c.clone(),
            None => return Ok(()),
        };

        let file = &self.commit_files[self.commit_files_selected];
        let cwd = std::env::current_dir()?;
        let repo = Repository::discover(&cwd)?;
        let oid = git2::Oid::from_str(&commit.oid)?;
        let commit_obj = repo.find_commit(oid)?;
        let tree = commit_obj.tree()?;

        let parent_tree = if commit_obj.parent_count() > 0 {
            Some(commit_obj.parent(0)?.tree()?)
        } else {
            None
        };

        let mut diff_opts = DiffOptions::new();
        diff_opts.pathspec(&file.path);

        let diff = repo.diff_tree_to_tree(parent_tree.as_ref(), Some(&tree), Some(&mut diff_opts))?;

        let mut diff_text = String::new();
        diff.print(git2::DiffFormat::Patch, |_delta, _hunk, line| {
            let origin = line.origin();
            let prefix = match origin {
                '+' => "+",
                '-' => "-",
                ' ' => " ",
                'H' => "",
                _ => return true,
            };
            if let Ok(content) = std::str::from_utf8(line.content()) {
                diff_text.push_str(prefix);
                diff_text.push_str(content);
            }
            true
        })?;

        if diff_text.is_empty() {
            diff_text = format!("No diff available for {}", file.path);
        }

        self.commit_diff_line_count = diff_text.lines().count();
        self.commit_diff_content = diff_text;
        self.commit_diff_scroll = 0;
        Ok(())
    }

    pub fn merge_branch(&mut self) -> Result<()> {
        let target_branch = self.merge_branch_input.trim();
        if target_branch.is_empty() {
            self.message = Some("Target branch name cannot be empty".to_string());
            return Ok(());
        }

        let current_branch = self.branch_name.clone();
        if current_branch == target_branch {
            self.message = Some("Cannot merge branch into itself".to_string());
            self.merge_branch_input.clear();
            self.input_mode = InputMode::Normal;
            return Ok(());
        }

        let checkout_target = std::process::Command::new("git")
            .args(["checkout", target_branch])
            .output()?;

        if !checkout_target.status.success() {
            let stderr = String::from_utf8_lossy(&checkout_target.stderr);
            self.message = Some(format!("Checkout failed: {}", stderr.lines().next().unwrap_or("unknown error")));
            self.merge_branch_input.clear();
            self.input_mode = InputMode::Normal;
            return Ok(());
        }

        let merge_output = std::process::Command::new("git")
            .args(["merge", &current_branch])
            .output()?;

        let merge_success = merge_output.status.success();
        let merge_stderr = String::from_utf8_lossy(&merge_output.stderr).to_string();

        let _ = std::process::Command::new("git")
            .args(["checkout", &current_branch])
            .output();

        if merge_success {
            self.message = Some(format!("Merged '{}' into '{}'", current_branch, target_branch));
        } else {
            let first_line = merge_stderr.lines().next().unwrap_or("unknown error");
            if merge_stderr.contains("CONFLICT") || merge_stderr.contains("conflict") {
                self.message = Some(format!("Merge has conflicts. Resolve on '{}'", target_branch));
            } else {
                self.message = Some(format!("Merge failed: {}", first_line));
            }
        }

        self.merge_branch_input.clear();
        self.input_mode = InputMode::Normal;
        self.refresh_status()?;
        Ok(())
    }

    pub fn check_rebase_state(&mut self) -> Result<()> {
        let cwd = std::env::current_dir()?;
        let repo = Repository::discover(&cwd)?;
        let git_dir = repo.path();

        let rebase_merge = git_dir.join("rebase-merge");
        let rebase_apply = git_dir.join("rebase-apply");

        if rebase_merge.exists() {
            self.is_rebasing = true;

            if let Ok(head_name) = std::fs::read_to_string(rebase_merge.join("head-name")) {
                self.rebase_head_name = Some(
                    head_name
                        .trim()
                        .strip_prefix("refs/heads/")
                        .unwrap_or(head_name.trim())
                        .to_string(),
                );
            }

            let msgnum = std::fs::read_to_string(rebase_merge.join("msgnum"))
                .ok()
                .and_then(|s| s.trim().parse::<usize>().ok());
            let end = std::fs::read_to_string(rebase_merge.join("end"))
                .ok()
                .and_then(|s| s.trim().parse::<usize>().ok());

            if let (Some(current), Some(total)) = (msgnum, end) {
                self.rebase_progress = Some((current, total));
            }
        } else if rebase_apply.exists() {
            self.is_rebasing = true;

            if let Ok(head_name) = std::fs::read_to_string(rebase_apply.join("head-name")) {
                self.rebase_head_name = Some(
                    head_name
                        .trim()
                        .strip_prefix("refs/heads/")
                        .unwrap_or(head_name.trim())
                        .to_string(),
                );
            }

            let next = std::fs::read_to_string(rebase_apply.join("next"))
                .ok()
                .and_then(|s| s.trim().parse::<usize>().ok());
            let last = std::fs::read_to_string(rebase_apply.join("last"))
                .ok()
                .and_then(|s| s.trim().parse::<usize>().ok());

            if let (Some(current), Some(total)) = (next, last) {
                self.rebase_progress = Some((current, total));
            }
        } else {
            self.is_rebasing = false;
            self.rebase_head_name = None;
            self.rebase_progress = None;
        }

        Ok(())
    }

    pub fn enter_commits_list(&mut self) {
        self.previous_pane = Some(self.focused_pane);
        self.focused_pane = FocusedPane::CommitsList;
        let _ = self.load_commits(50);
    }

    pub fn enter_commit_detail(&mut self) {
        if self.commits.is_empty() {
            return;
        }
        self.selected_commit = Some(self.commits[self.commits_selected].clone());
        self.previous_pane = Some(self.focused_pane);
        self.focused_pane = FocusedPane::CommitDetail;
        let _ = self.load_commit_files();
    }

    pub fn enter_commit_diff_view(&mut self) {
        if self.commit_files.is_empty() {
            return;
        }
        self.previous_pane = Some(self.focused_pane);
        self.focused_pane = FocusedPane::CommitDiffView;
    }

    pub fn go_back(&mut self) {
        match self.focused_pane {
            FocusedPane::CommitsList => {
                self.focused_pane = FocusedPane::FileList;
            }
            FocusedPane::CommitDetail => {
                self.focused_pane = FocusedPane::CommitsList;
            }
            FocusedPane::CommitDiffView => {
                self.focused_pane = FocusedPane::CommitDetail;
            }
            FocusedPane::DiffView => {
                self.focused_pane = FocusedPane::FileList;
            }
            FocusedPane::FileList => {}
        }
    }

    fn commits_move_up(&mut self) {
        if !self.commits.is_empty() && self.commits_selected > 0 {
            self.commits_selected -= 1;
            self.commits_list_state.select(Some(self.commits_selected));
        }
    }

    fn commits_move_down(&mut self) {
        if !self.commits.is_empty() && self.commits_selected < self.commits.len() - 1 {
            self.commits_selected += 1;
            self.commits_list_state.select(Some(self.commits_selected));

            if self.commits_has_more && self.commits_selected >= self.commits.len() - 5 {
                let _ = self.load_more_commits(30);
            }
        }
    }

    fn commit_files_move_up(&mut self) {
        if !self.commit_files.is_empty() && self.commit_files_selected > 0 {
            self.commit_files_selected -= 1;
            self.commit_files_list_state.select(Some(self.commit_files_selected));
            let _ = self.update_commit_diff();
        }
    }

    fn commit_files_move_down(&mut self) {
        if !self.commit_files.is_empty() && self.commit_files_selected < self.commit_files.len() - 1 {
            self.commit_files_selected += 1;
            self.commit_files_list_state.select(Some(self.commit_files_selected));
            let _ = self.update_commit_diff();
        }
    }

    fn scroll_commit_diff_up(&mut self) {
        self.commit_diff_scroll = self.commit_diff_scroll.saturating_sub(3);
    }

    fn scroll_commit_diff_down(&mut self) {
        let max_scroll = self.commit_diff_line_count.saturating_sub(self.diff_area_height as usize);
        let new_scroll = self.commit_diff_scroll.saturating_add(3);
        self.commit_diff_scroll = new_scroll.min(max_scroll as u16);
    }

    fn scroll_commit_diff_half_up(&mut self) {
        let half_page = self.diff_area_height / 2;
        self.commit_diff_scroll = self.commit_diff_scroll.saturating_sub(half_page);
    }

    fn scroll_commit_diff_half_down(&mut self) {
        let half_page = self.diff_area_height / 2;
        let max_scroll = self.commit_diff_line_count.saturating_sub(self.diff_area_height as usize);
        let new_scroll = self.commit_diff_scroll.saturating_add(half_page);
        self.commit_diff_scroll = new_scroll.min(max_scroll as u16);
    }

    fn scroll_commit_diff_top(&mut self) {
        self.commit_diff_scroll = 0;
    }

    fn scroll_commit_diff_bottom(&mut self) {
        let max_scroll = self.commit_diff_line_count.saturating_sub(self.diff_area_height as usize);
        self.commit_diff_scroll = max_scroll as u16;
    }
}

fn format_diff_lines(content: &str) -> Vec<Line<'_>> {
    content
        .lines()
        .map(|line| {
            if let Some(rest) = line.strip_prefix('+') {
                Line::from(vec![
                    Span::styled(
                        "+",
                        Style::default()
                            .fg(Color::Black)
                            .bg(Color::Green)
                            .add_modifier(Modifier::BOLD),
                    ),
                    Span::styled(
                        rest,
                        Style::default()
                            .fg(Color::Green)
                            .bg(Color::Rgb(0, 40, 0)),
                    ),
                ])
            } else if let Some(rest) = line.strip_prefix('-') {
                Line::from(vec![
                    Span::styled(
                        "-",
                        Style::default()
                            .fg(Color::Black)
                            .bg(Color::Red)
                            .add_modifier(Modifier::BOLD),
                    ),
                    Span::styled(
                        rest,
                        Style::default()
                            .fg(Color::Red)
                            .bg(Color::Rgb(40, 0, 0)),
                    ),
                ])
            } else if line.starts_with("@@") {
                Line::styled(
                    line,
                    Style::default()
                        .fg(Color::Cyan)
                        .bg(Color::Rgb(0, 25, 50)),
                )
            } else {
                Line::styled(line, Style::default().fg(Color::DarkGray))
            }
        })
        .collect()
}

fn render_changes_view(f: &mut Frame, app: &mut App, main_area: Rect) {
    let main_chunks = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Percentage(35), Constraint::Percentage(65)])
        .split(main_area);

    let items: Vec<ListItem> = app
        .files
        .iter()
        .map(|file| {
            let checkbox = if file.staged { "[x]" } else { "[ ]" };
            let style = Style::default().fg(file.status.color());
            ListItem::new(Line::from(vec![
                Span::styled(format!("{} ", checkbox), style),
                Span::styled(file.status.symbol(), style.add_modifier(Modifier::BOLD)),
                Span::raw(" "),
                Span::styled(&file.path, style),
            ]))
        })
        .collect();

    let files_border_style = if app.focused_pane == FocusedPane::FileList {
        Style::default().fg(Color::Cyan).add_modifier(Modifier::BOLD)
    } else {
        Style::default().fg(Color::DarkGray)
    };

    let files_block = Block::default()
        .title(format!(" Files ({}) ", app.files.len()))
        .borders(Borders::ALL)
        .border_style(files_border_style);

    let files_list = List::new(items)
        .block(files_block)
        .highlight_style(Style::default().bg(Color::DarkGray).add_modifier(Modifier::BOLD))
        .highlight_symbol("▸ ");

    f.render_stateful_widget(files_list, main_chunks[0], &mut app.list_state);

    app.diff_area_height = main_chunks[1].height.saturating_sub(2);

    let diff_lines = format_diff_lines(&app.diff_content);

    let scroll_info = if app.diff_line_count > 0 {
        let current_line = app.diff_scroll as usize + 1;
        let end_line = (app.diff_scroll as usize + app.diff_area_height as usize).min(app.diff_line_count);
        format!(" Diff ({}-{}/{}) ", current_line, end_line, app.diff_line_count)
    } else {
        " Diff ".to_string()
    };

    let diff_border_style = if app.focused_pane == FocusedPane::DiffView {
        Style::default().fg(Color::Yellow).add_modifier(Modifier::BOLD)
    } else {
        Style::default().fg(Color::DarkGray)
    };

    let diff_block = Block::default()
        .title(scroll_info)
        .borders(Borders::ALL)
        .border_style(diff_border_style);

    let diff_paragraph = Paragraph::new(diff_lines)
        .block(diff_block)
        .scroll((app.diff_scroll, 0))
        .wrap(Wrap { trim: false });

    f.render_widget(diff_paragraph, main_chunks[1]);
}

fn render_commits_list_view(f: &mut Frame, app: &mut App, main_area: Rect) {
    let main_chunks = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Percentage(50), Constraint::Percentage(50)])
        .split(main_area);

    let items: Vec<ListItem> = app
        .commits
        .iter()
        .map(|commit| {
            ListItem::new(Line::from(vec![
                Span::styled(&commit.short_oid, Style::default().fg(Color::Yellow)),
                Span::raw(" "),
                Span::styled(&commit.date, Style::default().fg(Color::DarkGray)),
                Span::raw(" "),
                Span::styled(&commit.message, Style::default().fg(Color::White)),
            ]))
        })
        .collect();

    let more_indicator = if app.commits_has_more { " ↓" } else { "" };
    let commits_block = Block::default()
        .title(format!(" Commits ({}){} ", app.commits.len(), more_indicator))
        .borders(Borders::ALL)
        .border_style(Style::default().fg(Color::Cyan).add_modifier(Modifier::BOLD));

    let commits_list = List::new(items)
        .block(commits_block)
        .highlight_style(Style::default().bg(Color::DarkGray).add_modifier(Modifier::BOLD))
        .highlight_symbol("▸ ");

    f.render_stateful_widget(commits_list, main_chunks[0], &mut app.commits_list_state);

    let preview_content = if let Some(idx) = app.commits_list_state.selected() {
        if idx < app.commits.len() {
            let commit = &app.commits[idx];
            format!(
                "Commit: {}\nAuthor: {}\nDate:   {}\n\n{}",
                commit.oid, commit.author, commit.date, commit.full_message
            )
        } else {
            "No commit selected".to_string()
        }
    } else {
        "No commit selected".to_string()
    };

    let preview_block = Block::default()
        .title(" Preview ")
        .borders(Borders::ALL)
        .border_style(Style::default().fg(Color::DarkGray));

    let preview = Paragraph::new(preview_content)
        .block(preview_block)
        .wrap(Wrap { trim: false });

    f.render_widget(preview, main_chunks[1]);
}

fn render_commit_detail_view(f: &mut Frame, app: &mut App, main_area: Rect) {
    let main_chunks = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Percentage(35), Constraint::Percentage(65)])
        .split(main_area);

    let items: Vec<ListItem> = app
        .commit_files
        .iter()
        .map(|file| {
            let style = Style::default().fg(file.status.color());
            ListItem::new(Line::from(vec![
                Span::styled(file.status.symbol(), style.add_modifier(Modifier::BOLD)),
                Span::raw(" "),
                Span::styled(&file.path, style),
            ]))
        })
        .collect();

    let commit_title = app
        .selected_commit
        .as_ref()
        .map(|c| format!(" {} ", c.short_oid))
        .unwrap_or_else(|| " Files ".to_string());

    let files_border_style = if app.focused_pane == FocusedPane::CommitDetail {
        Style::default().fg(Color::Cyan).add_modifier(Modifier::BOLD)
    } else {
        Style::default().fg(Color::DarkGray)
    };

    let files_block = Block::default()
        .title(format!("{}({}) ", commit_title, app.commit_files.len()))
        .borders(Borders::ALL)
        .border_style(files_border_style);

    let files_list = List::new(items)
        .block(files_block)
        .highlight_style(Style::default().bg(Color::DarkGray).add_modifier(Modifier::BOLD))
        .highlight_symbol("▸ ");

    f.render_stateful_widget(files_list, main_chunks[0], &mut app.commit_files_list_state);

    app.diff_area_height = main_chunks[1].height.saturating_sub(2);

    let diff_lines = format_diff_lines(&app.commit_diff_content);

    let scroll_info = if app.commit_diff_line_count > 0 {
        let current_line = app.commit_diff_scroll as usize + 1;
        let end_line = (app.commit_diff_scroll as usize + app.diff_area_height as usize).min(app.commit_diff_line_count);
        format!(" Diff ({}-{}/{}) ", current_line, end_line, app.commit_diff_line_count)
    } else {
        " Diff ".to_string()
    };

    let diff_border_style = if app.focused_pane == FocusedPane::CommitDiffView {
        Style::default().fg(Color::Yellow).add_modifier(Modifier::BOLD)
    } else {
        Style::default().fg(Color::DarkGray)
    };

    let diff_block = Block::default()
        .title(scroll_info)
        .borders(Borders::ALL)
        .border_style(diff_border_style);

    let diff_paragraph = Paragraph::new(diff_lines)
        .block(diff_block)
        .scroll((app.commit_diff_scroll, 0))
        .wrap(Wrap { trim: false });

    f.render_widget(diff_paragraph, main_chunks[1]);
}

fn ui(f: &mut Frame, app: &mut App) {
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([
            Constraint::Length(1),
            Constraint::Min(10),
            Constraint::Length(3),
        ])
        .split(f.area());

    let view_indicator = match app.focused_pane {
        FocusedPane::CommitsList | FocusedPane::CommitDetail | FocusedPane::CommitDiffView => {
            Span::styled(" [LOG] ", Style::default().fg(Color::Black).bg(Color::Magenta))
        }
        _ => Span::raw(""),
    };

    let rebase_indicator = if app.is_rebasing {
        let progress = app
            .rebase_progress
            .map(|(cur, total)| format!(" ({}/{})", cur, total))
            .unwrap_or_default();
        Span::styled(
            format!(" REBASING{} ", progress),
            Style::default().fg(Color::Black).bg(Color::Yellow).add_modifier(Modifier::BOLD),
        )
    } else {
        Span::raw("")
    };

    let header = Line::from(vec![
        Span::styled(" wc git ", Style::default().fg(Color::Black).bg(Color::Cyan)),
        view_indicator,
        rebase_indicator,
        Span::raw(" "),
        Span::styled(&app.branch_name, Style::default().fg(Color::Green).add_modifier(Modifier::BOLD)),
        Span::raw(" "),
        Span::styled(&app.repo_path, Style::default().fg(Color::DarkGray)),
        if app.has_conflicts {
            Span::styled(" ⚠ CONFLICTS", Style::default().fg(Color::Red).add_modifier(Modifier::BOLD))
        } else {
            Span::raw("")
        },
    ]);
    f.render_widget(Paragraph::new(header), chunks[0]);

    match app.focused_pane {
        FocusedPane::FileList | FocusedPane::DiffView => {
            render_changes_view(f, app, chunks[1]);
        }
        FocusedPane::CommitsList => {
            render_commits_list_view(f, app, chunks[1]);
        }
        FocusedPane::CommitDetail | FocusedPane::CommitDiffView => {
            render_commit_detail_view(f, app, chunks[1]);
        }
    }

    let footer_text = if app.loading {
        Line::from(vec![
            Span::styled(" ", Style::default()),
            Span::styled(SPINNER[app.loading_frame], Style::default().fg(Color::Magenta)),
            Span::styled(" Generating commit message...", Style::default().fg(Color::Magenta)),
        ])
    } else if app.input_mode == InputMode::CommitMessage {
        Line::from(vec![
            Span::styled(" Commit: ", Style::default().fg(Color::Yellow)),
            Span::raw(&app.commit_message),
            Span::styled("█", Style::default().fg(Color::White)),
            Span::raw("  [Enter]commit [Esc]cancel"),
        ])
    } else if app.input_mode == InputMode::MergeBranchInput {
        Line::from(vec![
            Span::styled(format!(" Merge '{}' into: ", app.branch_name), Style::default().fg(Color::Magenta)),
            Span::raw(&app.merge_branch_input),
            Span::styled("█", Style::default().fg(Color::White)),
            Span::raw("  [Enter]merge [Esc]cancel"),
        ])
    } else if app.input_mode == InputMode::RebaseBranchInput {
        Line::from(vec![
            Span::styled(" Rebase onto: ", Style::default().fg(Color::Yellow)),
            Span::raw(&app.rebase_branch_input),
            Span::styled("█", Style::default().fg(Color::White)),
            Span::raw("  [Enter]rebase [Esc]cancel"),
        ])
    } else if let Some(ref msg) = app.message {
        Line::from(vec![
            Span::styled(" ", Style::default()),
            Span::styled(msg, Style::default().fg(Color::Yellow)),
        ])
    } else {
        match app.focused_pane {
            FocusedPane::DiffView => {
                Line::from(vec![
                    Span::styled(" [j/k/↑↓]", Style::default().fg(Color::Yellow)),
                    Span::raw("scroll "),
                    Span::styled("[Ctrl+d/u]", Style::default().fg(Color::Yellow)),
                    Span::raw("½page "),
                    Span::styled("[g/G]", Style::default().fg(Color::Yellow)),
                    Span::raw("top/end "),
                    Span::styled("[Esc/h/←]", Style::default().fg(Color::Yellow)),
                    Span::raw("back"),
                ])
            }
            FocusedPane::CommitsList => {
                Line::from(vec![
                    Span::styled(" [j/k]", Style::default().fg(Color::Cyan)),
                    Span::raw("navigate "),
                    Span::styled("[Enter/l]", Style::default().fg(Color::Cyan)),
                    Span::raw("view "),
                    Span::styled("[R]", Style::default().fg(Color::Cyan)),
                    Span::raw("eload "),
                    Span::styled("[Esc/h]", Style::default().fg(Color::Cyan)),
                    Span::raw("back "),
                    Span::styled("[q]", Style::default().fg(Color::Cyan)),
                    Span::raw("uit"),
                ])
            }
            FocusedPane::CommitDetail => {
                Line::from(vec![
                    Span::styled(" [j/k]", Style::default().fg(Color::Cyan)),
                    Span::raw("navigate "),
                    Span::styled("[Enter/l]", Style::default().fg(Color::Cyan)),
                    Span::raw("diff "),
                    Span::styled("[Esc/h]", Style::default().fg(Color::Cyan)),
                    Span::raw("back "),
                    Span::styled("[q]", Style::default().fg(Color::Cyan)),
                    Span::raw("uit"),
                ])
            }
            FocusedPane::CommitDiffView => {
                Line::from(vec![
                    Span::styled(" [j/k/↑↓]", Style::default().fg(Color::Yellow)),
                    Span::raw("scroll "),
                    Span::styled("[Ctrl+d/u]", Style::default().fg(Color::Yellow)),
                    Span::raw("½page "),
                    Span::styled("[g/G]", Style::default().fg(Color::Yellow)),
                    Span::raw("top/end "),
                    Span::styled("[Esc/h]", Style::default().fg(Color::Yellow)),
                    Span::raw("back"),
                ])
            }
            FocusedPane::FileList => {
                if app.is_rebasing {
                    Line::from(vec![
                        Span::styled(" [C]", Style::default().fg(Color::Yellow)),
                        Span::raw("ontinue "),
                        Span::styled("[A]", Style::default().fg(Color::Yellow)),
                        Span::raw("bort "),
                        Span::styled("[S]", Style::default().fg(Color::Yellow)),
                        Span::raw("kip "),
                        Span::styled("[space]", Style::default().fg(Color::Cyan)),
                        Span::raw("stage "),
                        Span::styled("[d]", Style::default().fg(Color::Cyan)),
                        Span::raw("iscard "),
                        Span::styled("[R]", Style::default().fg(Color::Cyan)),
                        Span::raw("efresh "),
                        Span::styled("[q]", Style::default().fg(Color::Cyan)),
                        Span::raw("uit"),
                    ])
                } else {
                    Line::from(vec![
                        Span::styled(" [Enter/l]", Style::default().fg(Color::Cyan)),
                        Span::raw("diff "),
                        Span::styled("[space]", Style::default().fg(Color::Cyan)),
                        Span::raw("stage "),
                        Span::styled("[a]", Style::default().fg(Color::Cyan)),
                        Span::raw("ll "),
                        Span::styled("[d]", Style::default().fg(Color::Cyan)),
                        Span::raw("iscard "),
                        Span::styled("[c]", Style::default().fg(Color::Cyan)),
                        Span::raw("ommit "),
                        Span::styled("[m]", Style::default().fg(Color::Magenta)),
                        Span::raw("ai "),
                        Span::styled("[r]", Style::default().fg(Color::Yellow)),
                        Span::raw("ebase "),
                        Span::styled("[M]", Style::default().fg(Color::Magenta)),
                        Span::raw("erge "),
                        Span::styled("[q]", Style::default().fg(Color::Cyan)),
                        Span::raw("uit"),
                    ])
                }
            }
        }
    };

    let footer = Paragraph::new(footer_text)
        .block(Block::default().borders(Borders::ALL).border_style(Style::default().fg(Color::DarkGray)));
    f.render_widget(footer, chunks[2]);
}

fn suspend_to_shell(terminal: &mut Terminal<CrosstermBackend<io::Stdout>>) -> Result<()> {
    disable_raw_mode()?;
    execute!(terminal.backend_mut(), LeaveAlternateScreen)?;
    terminal.backend_mut().flush()?;

    #[cfg(unix)]
    unsafe {
        libc::raise(libc::SIGTSTP);
    }

    enable_raw_mode()?;
    execute!(terminal.backend_mut(), EnterAlternateScreen)?;
    terminal.clear()?;

    Ok(())
}

pub fn run_git_ui() -> Result<()> {
    enable_raw_mode()?;
    let mut stdout = io::stdout();
    execute!(stdout, EnterAlternateScreen)?;
    let backend = CrosstermBackend::new(stdout);
    let mut terminal = Terminal::new(backend)?;

    let mut app = App::new()?;

    loop {
        app.tick();
        terminal.draw(|f| ui(f, &mut app))?;

        if event::poll(std::time::Duration::from_millis(80))? {
            if let Event::Key(key) = event::read()? {
                if key.code == KeyCode::Char('z') && key.modifiers.contains(KeyModifiers::CONTROL) {
                    suspend_to_shell(&mut terminal)?;
                    let _ = app.refresh_status();
                    continue;
                }

                if app.input_mode == InputMode::CommitMessage {
                    match key.code {
                        KeyCode::Esc => {
                            app.input_mode = InputMode::Normal;
                            app.commit_message.clear();
                        }
                        KeyCode::Enter => {
                            let _ = app.commit();
                        }
                        KeyCode::Backspace => {
                            app.commit_message.pop();
                        }
                        KeyCode::Char(c) => {
                            app.commit_message.push(c);
                        }
                        _ => {}
                    }
                } else if app.input_mode == InputMode::MergeBranchInput {
                    match key.code {
                        KeyCode::Esc => {
                            app.input_mode = InputMode::Normal;
                            app.merge_branch_input.clear();
                        }
                        KeyCode::Enter => {
                            let _ = app.merge_branch();
                        }
                        KeyCode::Backspace => {
                            app.merge_branch_input.pop();
                        }
                        KeyCode::Char(c) => {
                            app.merge_branch_input.push(c);
                        }
                        _ => {}
                    }
                } else if app.input_mode == InputMode::RebaseBranchInput {
                    match key.code {
                        KeyCode::Esc => {
                            app.input_mode = InputMode::Normal;
                            app.rebase_branch_input.clear();
                        }
                        KeyCode::Enter => {
                            let _ = app.rebase_onto_branch();
                        }
                        KeyCode::Backspace => {
                            app.rebase_branch_input.pop();
                        }
                        KeyCode::Char(c) => {
                            app.rebase_branch_input.push(c);
                        }
                        _ => {}
                    }
                } else if app.focused_pane == FocusedPane::DiffView {
                    app.message = None;
                    match key.code {
                        KeyCode::Esc | KeyCode::Char('h') | KeyCode::Left => {
                            app.focused_pane = FocusedPane::FileList;
                        }
                        KeyCode::Char('q') => {
                            app.focused_pane = FocusedPane::FileList;
                        }
                        KeyCode::Char('j') | KeyCode::Down => app.scroll_diff_down(),
                        KeyCode::Char('k') | KeyCode::Up => app.scroll_diff_up(),
                        KeyCode::Char('d') if key.modifiers.contains(KeyModifiers::CONTROL) => {
                            app.scroll_diff_half_down();
                        }
                        KeyCode::Char('u') if key.modifiers.contains(KeyModifiers::CONTROL) => {
                            app.scroll_diff_half_up();
                        }
                        KeyCode::PageDown => app.scroll_diff_half_down(),
                        KeyCode::PageUp => app.scroll_diff_half_up(),
                        KeyCode::Char('g') | KeyCode::Home => app.scroll_diff_top(),
                        KeyCode::Char('G') | KeyCode::End => app.scroll_diff_bottom(),
                        _ => {}
                    }
                } else if app.focused_pane == FocusedPane::CommitsList {
                    app.message = None;
                    match key.code {
                        KeyCode::Esc | KeyCode::Char('h') | KeyCode::Left => {
                            app.go_back();
                        }
                        KeyCode::Char('q') => {
                            app.go_back();
                        }
                        KeyCode::Char('j') | KeyCode::Down => app.commits_move_down(),
                        KeyCode::Char('k') | KeyCode::Up => app.commits_move_up(),
                        KeyCode::Enter | KeyCode::Char('l') | KeyCode::Right => {
                            app.enter_commit_detail();
                        }
                        KeyCode::Char('R') => {
                            let _ = app.load_commits(50);
                            app.message = Some("Commits reloaded".to_string());
                        }
                        _ => {}
                    }
                } else if app.focused_pane == FocusedPane::CommitDetail {
                    app.message = None;
                    match key.code {
                        KeyCode::Esc | KeyCode::Char('h') | KeyCode::Left => {
                            app.go_back();
                        }
                        KeyCode::Char('q') => {
                            app.go_back();
                        }
                        KeyCode::Char('j') | KeyCode::Down => app.commit_files_move_down(),
                        KeyCode::Char('k') | KeyCode::Up => app.commit_files_move_up(),
                        KeyCode::Enter | KeyCode::Char('l') | KeyCode::Right => {
                            app.enter_commit_diff_view();
                        }
                        _ => {}
                    }
                } else if app.focused_pane == FocusedPane::CommitDiffView {
                    app.message = None;
                    match key.code {
                        KeyCode::Esc | KeyCode::Char('h') | KeyCode::Left => {
                            app.go_back();
                        }
                        KeyCode::Char('q') => {
                            app.go_back();
                        }
                        KeyCode::Char('j') | KeyCode::Down => app.scroll_commit_diff_down(),
                        KeyCode::Char('k') | KeyCode::Up => app.scroll_commit_diff_up(),
                        KeyCode::Char('d') if key.modifiers.contains(KeyModifiers::CONTROL) => {
                            app.scroll_commit_diff_half_down();
                        }
                        KeyCode::Char('u') if key.modifiers.contains(KeyModifiers::CONTROL) => {
                            app.scroll_commit_diff_half_up();
                        }
                        KeyCode::PageDown => app.scroll_commit_diff_half_down(),
                        KeyCode::PageUp => app.scroll_commit_diff_half_up(),
                        KeyCode::Char('g') | KeyCode::Home => app.scroll_commit_diff_top(),
                        KeyCode::Char('G') | KeyCode::End => app.scroll_commit_diff_bottom(),
                        _ => {}
                    }
                } else {
                    app.message = None;
                    match key.code {
                        KeyCode::Char('q') => break,
                        KeyCode::Char('j') | KeyCode::Down => app.move_down(),
                        KeyCode::Char('k') | KeyCode::Up => app.move_up(),
                        KeyCode::Enter | KeyCode::Char('l') | KeyCode::Right => {
                            if !app.files.is_empty() {
                                app.focused_pane = FocusedPane::DiffView;
                            }
                        }
                        KeyCode::Char(' ') => {
                            let _ = app.toggle_stage();
                        }
                        KeyCode::Char('a') if !app.is_rebasing => {
                            let _ = app.stage_all();
                        }
                        KeyCode::Char('d') => {
                            let _ = app.discard_changes();
                        }
                        KeyCode::Char('c') if !app.is_rebasing => {
                            app.input_mode = InputMode::CommitMessage;
                        }
                        KeyCode::Char('m') if !app.is_rebasing => {
                            let _ = app.generate_commit_message();
                        }
                        KeyCode::Char('p') if !app.is_rebasing => {
                            let _ = app.push();
                        }
                        KeyCode::Char('P') if !app.is_rebasing => {
                            let _ = app.pull();
                        }
                        KeyCode::Char('r') if !app.is_rebasing => {
                            app.input_mode = InputMode::RebaseBranchInput;
                        }
                        KeyCode::Char('C') if app.is_rebasing => {
                            let _ = app.rebase_continue();
                        }
                        KeyCode::Char('A') if app.is_rebasing => {
                            let _ = app.rebase_abort();
                        }
                        KeyCode::Char('S') if app.is_rebasing => {
                            let _ = app.rebase_skip();
                        }
                        KeyCode::Char('R') => {
                            let _ = app.refresh_status();
                            app.message = Some("Refreshed".to_string());
                        }
                        KeyCode::Char('o') if !app.is_rebasing => {
                            app.enter_commits_list();
                        }
                        KeyCode::Char('M') if !app.is_rebasing => {
                            app.input_mode = InputMode::MergeBranchInput;
                        }
                        _ => {}
                    }
                }
            }
        }
    }

    disable_raw_mode()?;
    execute!(terminal.backend_mut(), LeaveAlternateScreen)?;
    Ok(())
}
