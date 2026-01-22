use anyhow::Result;
use crossterm::{
    event::{self, Event, KeyCode, KeyModifiers},
    execute,
    terminal::{disable_raw_mode, enable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen},
};
use git2::{DiffOptions, Repository, Status, StatusOptions};
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
}

const SPINNER: &[&str] = &["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

#[derive(PartialEq, Clone, Copy)]
pub enum InputMode {
    Normal,
    CommitMessage,
}

#[derive(PartialEq, Clone, Copy)]
pub enum FocusedPane {
    FileList,
    DiffView,
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
            let prefix = match line.origin() {
                '+' => "+",
                '-' => "-",
                ' ' => " ",
                _ => "",
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

    let header = Line::from(vec![
        Span::styled(" wc git ", Style::default().fg(Color::Black).bg(Color::Cyan)),
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

    let main_chunks = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Percentage(35), Constraint::Percentage(65)])
        .split(chunks[1]);

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

    let diff_lines: Vec<Line> = app
        .diff_content
        .lines()
        .map(|line| {
            let style = if line.starts_with('+') && !line.starts_with("+++") {
                Style::default()
                    .fg(Color::Green)
                    .bg(Color::Rgb(0, 35, 0))
                    .add_modifier(Modifier::BOLD)
            } else if line.starts_with('-') && !line.starts_with("---") {
                Style::default()
                    .fg(Color::Red)
                    .bg(Color::Rgb(35, 0, 0))
                    .add_modifier(Modifier::BOLD)
            } else if line.starts_with("@@") {
                Style::default()
                    .fg(Color::Cyan)
                    .bg(Color::Rgb(0, 20, 40))
            } else {
                Style::default()
            };
            Line::styled(line, style)
        })
        .collect();

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
    } else if let Some(ref msg) = app.message {
        Line::from(vec![
            Span::styled(" ", Style::default()),
            Span::styled(msg, Style::default().fg(Color::Yellow)),
        ])
    } else if app.focused_pane == FocusedPane::DiffView {
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
            Span::styled("[p/P]", Style::default().fg(Color::Cyan)),
            Span::raw("ush/ull "),
            Span::styled("[q]", Style::default().fg(Color::Cyan)),
            Span::raw("uit"),
        ])
    };

    let footer = Paragraph::new(footer_text)
        .block(Block::default().borders(Borders::ALL).border_style(Style::default().fg(Color::DarkGray)));
    f.render_widget(footer, chunks[2]);
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
                        KeyCode::Char('a') => {
                            let _ = app.stage_all();
                        }
                        KeyCode::Char('d') => {
                            let _ = app.discard_changes();
                        }
                        KeyCode::Char('c') => {
                            app.input_mode = InputMode::CommitMessage;
                        }
                        KeyCode::Char('m') => {
                            let _ = app.generate_commit_message();
                        }
                        KeyCode::Char('p') => {
                            let _ = app.push();
                        }
                        KeyCode::Char('P') => {
                            let _ = app.pull();
                        }
                        KeyCode::Char('r') => {
                            let _ = app.rebase();
                        }
                        KeyCode::Char('R') => {
                            let _ = app.refresh_status();
                            app.message = Some("Refreshed".to_string());
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
