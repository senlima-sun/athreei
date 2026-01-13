//! Data types for workspace and handoff system
//!
//! Workspaces are goal-oriented containers for AI task tracking.
//! Handoffs capture session state for seamless resumption.

use serde::{Deserialize, Serialize};

/// Status of a workspace
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum WorkspaceStatus {
    Pending,
    InProgress,
    Blocked,
    Paused,
    Completed,
    Abandoned,
    Archived,
}

impl WorkspaceStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::InProgress => "in_progress",
            Self::Blocked => "blocked",
            Self::Paused => "paused",
            Self::Completed => "completed",
            Self::Abandoned => "abandoned",
            Self::Archived => "archived",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "pending" => Some(Self::Pending),
            "in_progress" => Some(Self::InProgress),
            "blocked" => Some(Self::Blocked),
            "paused" => Some(Self::Paused),
            "completed" => Some(Self::Completed),
            "abandoned" => Some(Self::Abandoned),
            "archived" => Some(Self::Archived),
            _ => None,
        }
    }
}

impl Default for WorkspaceStatus {
    fn default() -> Self {
        Self::Pending
    }
}

/// Status of a task within a workspace
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TaskStatus {
    Pending,
    InProgress,
    Completed,
    Blocked,
    Deferred,
}

impl TaskStatus {
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Pending => "pending",
            Self::InProgress => "in_progress",
            Self::Completed => "completed",
            Self::Blocked => "blocked",
            Self::Deferred => "deferred",
        }
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "pending" => Some(Self::Pending),
            "in_progress" => Some(Self::InProgress),
            "completed" => Some(Self::Completed),
            "blocked" => Some(Self::Blocked),
            "deferred" => Some(Self::Deferred),
            _ => None,
        }
    }
}

impl Default for TaskStatus {
    fn default() -> Self {
        Self::Pending
    }
}

/// A workspace represents a goal-oriented container for AI task tracking
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Workspace {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub space_id: Option<String>,
    pub goal: String,
    pub success_criteria: Option<String>,
    pub status: WorkspaceStatus,
    pub blocker: Option<String>,
    pub context: Option<String>,
    pub created_at: i64,
    pub updated_at: i64,
    pub completed_at: Option<i64>,
}

impl Workspace {
    pub fn new(name: String, goal: String, space_id: Option<String>) -> Self {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        Self {
            id: nanoid::nanoid!(),
            name,
            description: None,
            space_id,
            goal,
            success_criteria: None,
            status: WorkspaceStatus::Pending,
            blocker: None,
            context: None,
            created_at: now,
            updated_at: now,
            completed_at: None,
        }
    }
}

/// A task represents an individual work item within a workspace
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Task {
    pub id: String,
    pub workspace_id: String,
    pub title: String,
    pub description: Option<String>,
    pub status: TaskStatus,
    pub blocker: Option<String>,
    pub is_next_action: bool,
    pub position: i32,
    pub created_at: i64,
    pub updated_at: i64,
    pub completed_at: Option<i64>,
}

impl Task {
    pub fn new(workspace_id: String, title: String) -> Self {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        Self {
            id: nanoid::nanoid!(),
            workspace_id,
            title,
            description: None,
            status: TaskStatus::Pending,
            blocker: None,
            is_next_action: false,
            position: 0,
            created_at: now,
            updated_at: now,
            completed_at: None,
        }
    }
}

/// A handoff captures session state for seamless resumption
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Handoff {
    pub id: String,
    pub workspace_id: String,
    pub session_id: Option<String>,
    pub progress_summary: String,
    pub current_state: String,
    pub next_steps: Option<String>,
    pub blockers: Option<String>,
    pub what_worked: Option<String>,
    pub what_failed: Option<String>,
    pub key_decisions: Option<String>,
    pub created_at: i64,
}

impl Handoff {
    pub fn new(
        workspace_id: String,
        progress_summary: String,
        current_state: String,
    ) -> Self {
        let now = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64;

        Self {
            id: nanoid::nanoid!(),
            workspace_id,
            session_id: None,
            progress_summary,
            current_state,
            next_steps: None,
            blockers: None,
            what_worked: None,
            what_failed: None,
            key_decisions: None,
            created_at: now,
        }
    }
}

/// A workspace with its associated tasks and latest handoff
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkspaceWithTasks {
    #[serde(flatten)]
    pub workspace: Workspace,
    pub tasks: Vec<Task>,
    pub latest_handoff: Option<Handoff>,
}

/// Input for creating a new workspace
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateWorkspaceInput {
    pub name: String,
    pub goal: String,
    pub space_id: Option<String>,
    pub description: Option<String>,
    pub success_criteria: Option<String>,
}

/// Input for updating a workspace
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateWorkspaceInput {
    pub name: Option<String>,
    pub description: Option<String>,
    pub goal: Option<String>,
    pub success_criteria: Option<String>,
    pub status: Option<WorkspaceStatus>,
    pub blocker: Option<String>,
    pub context: Option<String>,
}

/// Input for creating a new task
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateTaskInput {
    pub workspace_id: String,
    pub title: String,
    pub description: Option<String>,
    pub is_next_action: Option<bool>,
}

/// Input for updating a task
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateTaskInput {
    pub title: Option<String>,
    pub description: Option<String>,
    pub status: Option<TaskStatus>,
    pub blocker: Option<String>,
    pub is_next_action: Option<bool>,
}

/// Input for saving a handoff
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SaveHandoffInput {
    pub workspace_id: String,
    pub session_id: Option<String>,
    pub progress_summary: String,
    pub current_state: String,
    pub next_steps: Option<String>,
    pub blockers: Option<String>,
    pub what_worked: Option<String>,
    pub what_failed: Option<String>,
    pub key_decisions: Option<String>,
}

/// Filters for listing workspaces
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct ListWorkspacesFilter {
    pub space_id: Option<String>,
    pub statuses: Option<Vec<WorkspaceStatus>>,
    pub limit: Option<usize>,
    pub offset: Option<usize>,
}
