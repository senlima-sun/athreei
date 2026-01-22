use anyhow::Result;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum SessionStatus {
    Running,
    Idle,
    Stopped,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SessionInfo {
    pub id: u32,
    pub name: String,
    pub worktree_path: PathBuf,
    pub status: SessionStatus,
    pub created_at: DateTime<Utc>,
    pub last_output: String,
    #[serde(skip)]
    pub pid: Option<u32>,
}

#[derive(Debug, Default, Serialize, Deserialize)]
pub struct SessionStore {
    pub sessions: HashMap<u32, SessionInfo>,
    next_id: u32,
}

impl SessionStore {
    pub fn load(path: &Path) -> Result<Self> {
        if path.exists() {
            let content = std::fs::read_to_string(path)?;
            Ok(serde_json::from_str(&content)?)
        } else {
            Ok(Self::default())
        }
    }

    pub fn save(&self, path: &Path) -> Result<()> {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let content = serde_json::to_string_pretty(self)?;
        std::fs::write(path, content)?;
        Ok(())
    }

    pub fn create_session(&mut self, name: String, worktree_path: PathBuf) -> &SessionInfo {
        let id = self.next_id;
        self.next_id += 1;

        let session = SessionInfo {
            id,
            name,
            worktree_path,
            status: SessionStatus::Running,
            created_at: Utc::now(),
            last_output: String::new(),
            pid: None,
        };

        self.sessions.insert(id, session);
        self.sessions.get(&id).unwrap()
    }

    pub fn find_by_target(&self, target: &str) -> Option<&SessionInfo> {
        if let Ok(id) = target.parse::<u32>() {
            self.sessions.get(&id)
        } else {
            self.sessions.values().find(|s| s.name == target)
        }
    }

    pub fn find_by_target_mut(&mut self, target: &str) -> Option<&mut SessionInfo> {
        if let Ok(id) = target.parse::<u32>() {
            self.sessions.get_mut(&id)
        } else {
            self.sessions.values_mut().find(|s| s.name == target)
        }
    }

    pub fn remove(&mut self, id: u32) -> Option<SessionInfo> {
        self.sessions.remove(&id)
    }

    pub fn list(&self) -> Vec<&SessionInfo> {
        let mut sessions: Vec<_> = self.sessions.values().collect();
        sessions.sort_by_key(|s| s.id);
        sessions
    }
}
