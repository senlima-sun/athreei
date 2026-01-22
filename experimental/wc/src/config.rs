use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorktreeRoot {
    pub path: PathBuf,
    pub worktrees_path: Option<PathBuf>,
    pub setup_script: Option<PathBuf>,
}

#[derive(Debug, Default, Serialize, Deserialize)]
pub struct RootsConfig {
    pub roots: HashMap<String, WorktreeRoot>,
}

impl RootsConfig {
    pub fn load(path: &PathBuf) -> Result<Self> {
        if path.exists() {
            let content = std::fs::read_to_string(path)?;
            let config: RootsConfig = serde_json::from_str(&content)?;
            Ok(config)
        } else {
            Ok(Self::default())
        }
    }

    pub fn save(&self, path: &PathBuf) -> Result<()> {
        let content = serde_json::to_string_pretty(self)?;
        std::fs::write(path, content)?;
        Ok(())
    }

    pub fn add(&mut self, name: String, root: WorktreeRoot) {
        self.roots.insert(name, root);
    }

    pub fn remove(&mut self, name: &str) -> Option<WorktreeRoot> {
        self.roots.remove(name)
    }

    pub fn get(&self, name: &str) -> Option<&WorktreeRoot> {
        self.roots.get(name)
    }

    pub fn list(&self) -> impl Iterator<Item = (&String, &WorktreeRoot)> {
        self.roots.iter()
    }
}

pub struct Config {
    pub data_dir: PathBuf,
}

impl Config {
    pub fn load() -> Result<Self> {
        let data_dir = dirs::home_dir()
            .context("Could not find home directory")?
            .join(".awc");

        Ok(Self { data_dir })
    }

    pub fn sessions_file(&self) -> PathBuf {
        self.data_dir.join("sessions.json")
    }

    pub fn roots_file(&self) -> PathBuf {
        self.data_dir.join("roots.json")
    }

    pub fn ensure_dirs(&self) -> Result<()> {
        std::fs::create_dir_all(&self.data_dir)?;
        Ok(())
    }

    pub fn load_roots(&self) -> Result<RootsConfig> {
        RootsConfig::load(&self.roots_file())
    }

    pub fn save_roots(&self, roots: &RootsConfig) -> Result<()> {
        roots.save(&self.roots_file())
    }
}
