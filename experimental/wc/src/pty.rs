use anyhow::Result;
use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use std::io::{Read, Write};

pub struct PtySession {
    pub master: Box<dyn portable_pty::MasterPty + Send>,
    pub child: Box<dyn portable_pty::Child + Send + Sync>,
}

impl PtySession {
    pub fn spawn(command: &str, cwd: &std::path::Path) -> Result<Self> {
        let pty_system = native_pty_system();

        let size = terminal_size();
        let pair = pty_system.openpty(size)?;

        let mut cmd = CommandBuilder::new(command);
        cmd.cwd(cwd);

        let child = pair.slave.spawn_command(cmd)?;
        drop(pair.slave);

        Ok(Self {
            master: pair.master,
            child,
        })
    }

    pub fn resize(&self, rows: u16, cols: u16) -> Result<()> {
        self.master.resize(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })?;
        Ok(())
    }

    pub fn is_alive(&mut self) -> bool {
        self.child.try_wait().ok().flatten().is_none()
    }

    pub fn kill(&mut self) -> Result<()> {
        self.child.kill()?;
        Ok(())
    }

    pub fn reader(&self) -> Result<Box<dyn Read + Send>> {
        Ok(self.master.try_clone_reader()?)
    }

    pub fn writer(&self) -> Result<Box<dyn Write + Send>> {
        Ok(self.master.take_writer()?)
    }
}

fn terminal_size() -> PtySize {
    let (cols, rows) = crossterm::terminal::size().unwrap_or((80, 24));
    PtySize {
        rows,
        cols,
        pixel_width: 0,
        pixel_height: 0,
    }
}

pub async fn run_attached(mut session: PtySession) -> Result<()> {
    use crossterm::event::{Event, KeyCode, KeyModifiers};
    use crossterm::terminal::{disable_raw_mode, enable_raw_mode};
    use std::io::stdout;
    use tokio::io::{AsyncReadExt, AsyncWriteExt};

    let mut pty_reader = session.reader()?;
    let mut pty_writer = session.writer()?;

    enable_raw_mode()?;

    let result = async {
        let (tx, mut rx) = tokio::sync::mpsc::channel::<Vec<u8>>(32);

        // PTY reader task
        let reader_handle = std::thread::spawn(move || {
            let mut buf = [0u8; 4096];
            loop {
                match pty_reader.read(&mut buf) {
                    Ok(0) => break,
                    Ok(n) => {
                        if tx.blocking_send(buf[..n].to_vec()).is_err() {
                            break;
                        }
                    }
                    Err(_) => break,
                }
            }
        });

        // Stdin reader task
        let (stdin_tx, mut stdin_rx) = tokio::sync::mpsc::channel::<Vec<u8>>(32);
        let stdin_handle = std::thread::spawn(move || {
            loop {
                if crossterm::event::poll(std::time::Duration::from_millis(100)).unwrap_or(false) {
                    if let Ok(event) = crossterm::event::read() {
                        match event {
                            Event::Key(key) => {
                                // Ctrl+] to detach
                                if key.modifiers.contains(KeyModifiers::CONTROL)
                                    && key.code == KeyCode::Char(']')
                                {
                                    break;
                                }

                                let data = key_to_bytes(key);
                                if !data.is_empty() {
                                    if stdin_tx.blocking_send(data).is_err() {
                                        break;
                                    }
                                }
                            }
                            Event::Resize(cols, rows) => {
                                let _ = stdin_tx.blocking_send(vec![0xff, rows as u8, cols as u8]);
                            }
                            _ => {}
                        }
                    }
                }
            }
        });

        let mut stdout = tokio::io::stdout();

        loop {
            tokio::select! {
                Some(data) = rx.recv() => {
                    stdout.write_all(&data).await?;
                    stdout.flush().await?;
                }
                Some(data) = stdin_rx.recv() => {
                    if data.len() == 3 && data[0] == 0xff {
                        // Resize signal
                        let _ = session.resize(data[1] as u16, data[2] as u16);
                    } else {
                        pty_writer.write_all(&data)?;
                        pty_writer.flush()?;
                    }
                }
                else => break,
            }
        }

        drop(reader_handle);
        drop(stdin_handle);

        Ok::<_, anyhow::Error>(())
    }
    .await;

    disable_raw_mode()?;
    println!();

    result
}

fn key_to_bytes(key: crossterm::event::KeyEvent) -> Vec<u8> {
    use crossterm::event::{KeyCode, KeyModifiers};

    match key.code {
        KeyCode::Char(c) => {
            if key.modifiers.contains(KeyModifiers::CONTROL) {
                // Ctrl+A = 0x01, Ctrl+B = 0x02, etc.
                let ctrl_char = (c as u8).to_ascii_lowercase().wrapping_sub(b'a').wrapping_add(1);
                vec![ctrl_char]
            } else {
                c.to_string().into_bytes()
            }
        }
        KeyCode::Enter => vec![b'\r'],
        KeyCode::Backspace => vec![0x7f],
        KeyCode::Tab => vec![b'\t'],
        KeyCode::Esc => vec![0x1b],
        KeyCode::Up => vec![0x1b, b'[', b'A'],
        KeyCode::Down => vec![0x1b, b'[', b'B'],
        KeyCode::Right => vec![0x1b, b'[', b'C'],
        KeyCode::Left => vec![0x1b, b'[', b'D'],
        KeyCode::Home => vec![0x1b, b'[', b'H'],
        KeyCode::End => vec![0x1b, b'[', b'F'],
        KeyCode::PageUp => vec![0x1b, b'[', b'5', b'~'],
        KeyCode::PageDown => vec![0x1b, b'[', b'6', b'~'],
        KeyCode::Delete => vec![0x1b, b'[', b'3', b'~'],
        KeyCode::Insert => vec![0x1b, b'[', b'2', b'~'],
        KeyCode::F(n) => {
            match n {
                1 => vec![0x1b, b'O', b'P'],
                2 => vec![0x1b, b'O', b'Q'],
                3 => vec![0x1b, b'O', b'R'],
                4 => vec![0x1b, b'O', b'S'],
                5 => vec![0x1b, b'[', b'1', b'5', b'~'],
                6 => vec![0x1b, b'[', b'1', b'7', b'~'],
                7 => vec![0x1b, b'[', b'1', b'8', b'~'],
                8 => vec![0x1b, b'[', b'1', b'9', b'~'],
                9 => vec![0x1b, b'[', b'2', b'0', b'~'],
                10 => vec![0x1b, b'[', b'2', b'1', b'~'],
                11 => vec![0x1b, b'[', b'2', b'3', b'~'],
                12 => vec![0x1b, b'[', b'2', b'4', b'~'],
                _ => vec![],
            }
        }
        _ => vec![],
    }
}
