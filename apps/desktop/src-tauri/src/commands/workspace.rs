//! Workspace-related Tauri commands
//!
//! Provides CRUD operations for workspaces, tasks, and handoffs.

use std::sync::Arc;
use tauri::State;

use crate::state::DatabaseState;
use crate::workspace::{
    Handoff, ListWorkspacesFilter, Task, TaskStatus, Workspace, WorkspaceStatus,
    WorkspaceWithTasks,
};

/// List workspaces with optional filters
#[tauri::command]
pub async fn list_workspaces(
    space_id: Option<String>,
    statuses: Option<Vec<String>>,
    limit: Option<usize>,
    offset: Option<usize>,
    db: State<'_, Arc<DatabaseState>>,
) -> Result<Vec<Workspace>, String> {
    let db_guard = db
        .db
        .lock()
        .map_err(|e| format!("Database lock error: {e}"))?;

    let statuses = statuses.map(|status_strs| {
        status_strs
            .iter()
            .filter_map(|s| WorkspaceStatus::from_str(s))
            .collect::<Vec<_>>()
    });

    let filter = ListWorkspacesFilter {
        space_id,
        statuses,
        limit,
        offset,
    };

    db_guard
        .list_workspaces(&filter)
        .map_err(|e| format!("Failed to list workspaces: {e}"))
}

/// Get a workspace by ID with tasks and latest handoff
#[tauri::command]
pub async fn get_workspace(
    id: String,
    db: State<'_, Arc<DatabaseState>>,
) -> Result<Option<WorkspaceWithTasks>, String> {
    let db_guard = db
        .db
        .lock()
        .map_err(|e| format!("Database lock error: {e}"))?;

    db_guard
        .get_workspace_with_tasks(&id)
        .map_err(|e| format!("Failed to get workspace: {e}"))
}

/// Create a new workspace
#[tauri::command]
pub async fn create_workspace(
    name: String,
    goal: String,
    space_id: Option<String>,
    description: Option<String>,
    success_criteria: Option<String>,
    db: State<'_, Arc<DatabaseState>>,
) -> Result<Workspace, String> {
    let db_guard = db
        .db
        .lock()
        .map_err(|e| format!("Database lock error: {e}"))?;

    let mut workspace = Workspace::new(name, goal, space_id);
    workspace.description = description;
    workspace.success_criteria = success_criteria;

    db_guard
        .create_workspace(&workspace)
        .map_err(|e| format!("Failed to create workspace: {e}"))?;

    Ok(workspace)
}

/// Update an existing workspace
#[tauri::command]
pub async fn update_workspace(
    id: String,
    name: Option<String>,
    description: Option<String>,
    goal: Option<String>,
    success_criteria: Option<String>,
    status: Option<String>,
    blocker: Option<String>,
    context: Option<String>,
    db: State<'_, Arc<DatabaseState>>,
) -> Result<Workspace, String> {
    let db_guard = db
        .db
        .lock()
        .map_err(|e| format!("Database lock error: {e}"))?;

    let mut workspace = db_guard
        .get_workspace(&id)
        .map_err(|e| format!("Failed to get workspace: {e}"))?
        .ok_or_else(|| format!("Workspace not found: {id}"))?;

    if let Some(n) = name {
        workspace.name = n;
    }
    if let Some(d) = description {
        workspace.description = Some(d);
    }
    if let Some(g) = goal {
        workspace.goal = g;
    }
    if let Some(sc) = success_criteria {
        workspace.success_criteria = Some(sc);
    }
    if let Some(status_str) = status {
        if let Some(s) = WorkspaceStatus::from_str(&status_str) {
            workspace.status = s;
            if s == WorkspaceStatus::Completed {
                workspace.completed_at = Some(
                    std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap()
                        .as_secs() as i64,
                );
            }
        }
    }
    if let Some(b) = blocker {
        workspace.blocker = Some(b);
    }
    if let Some(c) = context {
        workspace.context = Some(c);
    }

    db_guard
        .update_workspace(&workspace)
        .map_err(|e| format!("Failed to update workspace: {e}"))?;

    db_guard
        .get_workspace(&id)
        .map_err(|e| format!("Failed to get updated workspace: {e}"))?
        .ok_or_else(|| "Workspace not found after update".to_string())
}

/// Delete a workspace by ID
#[tauri::command]
pub async fn delete_workspace(
    id: String,
    db: State<'_, Arc<DatabaseState>>,
) -> Result<(), String> {
    let db_guard = db
        .db
        .lock()
        .map_err(|e| format!("Database lock error: {e}"))?;

    db_guard
        .delete_workspace(&id)
        .map_err(|e| format!("Failed to delete workspace: {e}"))
}

/// Count workspaces with optional status filter
#[tauri::command]
pub async fn count_workspaces(
    statuses: Option<Vec<String>>,
    db: State<'_, Arc<DatabaseState>>,
) -> Result<i64, String> {
    let db_guard = db
        .db
        .lock()
        .map_err(|e| format!("Database lock error: {e}"))?;

    let statuses: Option<Vec<WorkspaceStatus>> = statuses.map(|status_strs| {
        status_strs
            .iter()
            .filter_map(|s| WorkspaceStatus::from_str(s))
            .collect()
    });

    db_guard
        .count_workspaces(statuses.as_deref())
        .map_err(|e| format!("Failed to count workspaces: {e}"))
}

// =============================================================================
// Task Commands
// =============================================================================

/// List tasks for a workspace
#[tauri::command]
pub async fn list_tasks(
    workspace_id: String,
    db: State<'_, Arc<DatabaseState>>,
) -> Result<Vec<Task>, String> {
    let db_guard = db
        .db
        .lock()
        .map_err(|e| format!("Database lock error: {e}"))?;

    db_guard
        .list_tasks(&workspace_id)
        .map_err(|e| format!("Failed to list tasks: {e}"))
}

/// Get a task by ID
#[tauri::command]
pub async fn get_task(
    id: String,
    db: State<'_, Arc<DatabaseState>>,
) -> Result<Option<Task>, String> {
    let db_guard = db
        .db
        .lock()
        .map_err(|e| format!("Database lock error: {e}"))?;

    db_guard
        .get_task(&id)
        .map_err(|e| format!("Failed to get task: {e}"))
}

/// Create a new task
#[tauri::command]
pub async fn create_task(
    workspace_id: String,
    title: String,
    description: Option<String>,
    is_next_action: Option<bool>,
    db: State<'_, Arc<DatabaseState>>,
) -> Result<Task, String> {
    let db_guard = db
        .db
        .lock()
        .map_err(|e| format!("Database lock error: {e}"))?;

    // Verify workspace exists
    db_guard
        .get_workspace(&workspace_id)
        .map_err(|e| format!("Failed to get workspace: {e}"))?
        .ok_or_else(|| format!("Workspace not found: {workspace_id}"))?;

    let mut task = Task::new(workspace_id, title);
    task.description = description;
    task.is_next_action = is_next_action.unwrap_or(false);

    db_guard
        .create_task(&task)
        .map_err(|e| format!("Failed to create task: {e}"))?;

    Ok(task)
}

/// Update a task
#[tauri::command]
pub async fn update_task(
    id: String,
    title: Option<String>,
    description: Option<String>,
    status: Option<String>,
    blocker: Option<String>,
    is_next_action: Option<bool>,
    db: State<'_, Arc<DatabaseState>>,
) -> Result<Task, String> {
    let db_guard = db
        .db
        .lock()
        .map_err(|e| format!("Database lock error: {e}"))?;

    let mut task = db_guard
        .get_task(&id)
        .map_err(|e| format!("Failed to get task: {e}"))?
        .ok_or_else(|| format!("Task not found: {id}"))?;

    if let Some(t) = title {
        task.title = t;
    }
    if let Some(d) = description {
        task.description = Some(d);
    }
    if let Some(status_str) = status {
        if let Some(s) = TaskStatus::from_str(&status_str) {
            task.status = s;
            if s == TaskStatus::Completed {
                task.completed_at = Some(
                    std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap()
                        .as_secs() as i64,
                );
            }
        }
    }
    if let Some(b) = blocker {
        task.blocker = Some(b);
    }
    if let Some(next) = is_next_action {
        task.is_next_action = next;
    }

    db_guard
        .update_task(&task)
        .map_err(|e| format!("Failed to update task: {e}"))?;

    db_guard
        .get_task(&id)
        .map_err(|e| format!("Failed to get updated task: {e}"))?
        .ok_or_else(|| "Task not found after update".to_string())
}

/// Delete a task
#[tauri::command]
pub async fn delete_task(
    id: String,
    db: State<'_, Arc<DatabaseState>>,
) -> Result<(), String> {
    let db_guard = db
        .db
        .lock()
        .map_err(|e| format!("Database lock error: {e}"))?;

    db_guard
        .delete_task(&id)
        .map_err(|e| format!("Failed to delete task: {e}"))
}

/// Reorder tasks within a workspace
#[tauri::command]
pub async fn reorder_tasks(
    workspace_id: String,
    task_ids: Vec<String>,
    db: State<'_, Arc<DatabaseState>>,
) -> Result<(), String> {
    let db_guard = db
        .db
        .lock()
        .map_err(|e| format!("Database lock error: {e}"))?;

    db_guard
        .reorder_tasks(&workspace_id, &task_ids)
        .map_err(|e| format!("Failed to reorder tasks: {e}"))
}

// =============================================================================
// Handoff Commands
// =============================================================================

/// List handoffs for a workspace
#[tauri::command]
pub async fn list_handoffs(
    workspace_id: String,
    limit: Option<usize>,
    db: State<'_, Arc<DatabaseState>>,
) -> Result<Vec<Handoff>, String> {
    let db_guard = db
        .db
        .lock()
        .map_err(|e| format!("Database lock error: {e}"))?;

    db_guard
        .list_handoffs(&workspace_id, limit.unwrap_or(10))
        .map_err(|e| format!("Failed to list handoffs: {e}"))
}

/// Get a handoff by ID
#[tauri::command]
pub async fn get_handoff(
    id: String,
    db: State<'_, Arc<DatabaseState>>,
) -> Result<Option<Handoff>, String> {
    let db_guard = db
        .db
        .lock()
        .map_err(|e| format!("Database lock error: {e}"))?;

    db_guard
        .get_handoff(&id)
        .map_err(|e| format!("Failed to get handoff: {e}"))
}

/// Create a new handoff
#[tauri::command]
pub async fn create_handoff(
    workspace_id: String,
    progress_summary: String,
    current_state: String,
    next_steps: Option<String>,
    blockers: Option<String>,
    what_worked: Option<String>,
    what_failed: Option<String>,
    key_decisions: Option<String>,
    db: State<'_, Arc<DatabaseState>>,
) -> Result<Handoff, String> {
    let db_guard = db
        .db
        .lock()
        .map_err(|e| format!("Database lock error: {e}"))?;

    // Verify workspace exists
    db_guard
        .get_workspace(&workspace_id)
        .map_err(|e| format!("Failed to get workspace: {e}"))?
        .ok_or_else(|| format!("Workspace not found: {workspace_id}"))?;

    let mut handoff = Handoff::new(workspace_id, progress_summary, current_state);
    handoff.next_steps = next_steps;
    handoff.blockers = blockers;
    handoff.what_worked = what_worked;
    handoff.what_failed = what_failed;
    handoff.key_decisions = key_decisions;

    db_guard
        .create_handoff(&handoff)
        .map_err(|e| format!("Failed to create handoff: {e}"))?;

    Ok(handoff)
}

/// Delete a handoff
#[tauri::command]
pub async fn delete_handoff(
    id: String,
    db: State<'_, Arc<DatabaseState>>,
) -> Result<(), String> {
    let db_guard = db
        .db
        .lock()
        .map_err(|e| format!("Database lock error: {e}"))?;

    db_guard
        .delete_handoff(&id)
        .map_err(|e| format!("Failed to delete handoff: {e}"))
}

/// Get latest handoff for a workspace
#[tauri::command]
pub async fn get_latest_handoff(
    workspace_id: String,
    db: State<'_, Arc<DatabaseState>>,
) -> Result<Option<Handoff>, String> {
    let db_guard = db
        .db
        .lock()
        .map_err(|e| format!("Database lock error: {e}"))?;

    db_guard
        .get_latest_handoff(&workspace_id)
        .map_err(|e| format!("Failed to get latest handoff: {e}"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::storage::Database;
    use std::sync::Mutex;

    fn create_test_db_state() -> DatabaseState {
        let db = Database::in_memory().unwrap();
        db.init_schema().unwrap();
        DatabaseState {
            db: Mutex::new(db),
            path: std::path::PathBuf::from(":memory:"),
        }
    }

    #[tokio::test]
    async fn test_workspace_crud() {
        let db_state = create_test_db_state();

        // Create workspace
        let workspace = {
            let db_guard = db_state.db.lock().unwrap();
            let workspace = Workspace::new(
                "Test Workspace".to_string(),
                "Test Goal".to_string(),
                None,
            );
            db_guard.create_workspace(&workspace).unwrap();
            workspace
        };

        // List workspaces
        let workspaces = {
            let db_guard = db_state.db.lock().unwrap();
            db_guard
                .list_workspaces(&ListWorkspacesFilter::default())
                .unwrap()
        };

        assert_eq!(workspaces.len(), 1);
        assert_eq!(workspaces[0].name, "Test Workspace");
        assert_eq!(workspaces[0].id, workspace.id);
    }

    #[tokio::test]
    async fn test_task_crud() {
        let db_state = create_test_db_state();

        // Create workspace first
        let workspace = {
            let db_guard = db_state.db.lock().unwrap();
            let workspace = Workspace::new(
                "Test Workspace".to_string(),
                "Test Goal".to_string(),
                None,
            );
            db_guard.create_workspace(&workspace).unwrap();
            workspace
        };

        // Create task
        let task = {
            let db_guard = db_state.db.lock().unwrap();
            let task = Task::new(workspace.id.clone(), "Test Task".to_string());
            db_guard.create_task(&task).unwrap();
            task
        };

        // List tasks
        let tasks = {
            let db_guard = db_state.db.lock().unwrap();
            db_guard.list_tasks(&workspace.id).unwrap()
        };

        assert_eq!(tasks.len(), 1);
        assert_eq!(tasks[0].title, "Test Task");
        assert_eq!(tasks[0].id, task.id);
    }

    #[tokio::test]
    async fn test_handoff_crud() {
        let db_state = create_test_db_state();

        // Create workspace first
        let workspace = {
            let db_guard = db_state.db.lock().unwrap();
            let workspace = Workspace::new(
                "Test Workspace".to_string(),
                "Test Goal".to_string(),
                None,
            );
            db_guard.create_workspace(&workspace).unwrap();
            workspace
        };

        // Create handoff
        let handoff = {
            let db_guard = db_state.db.lock().unwrap();
            let handoff = Handoff::new(
                workspace.id.clone(),
                "Progress made".to_string(),
                "Current state".to_string(),
            );
            db_guard.create_handoff(&handoff).unwrap();
            handoff
        };

        // Get latest handoff
        let latest = {
            let db_guard = db_state.db.lock().unwrap();
            db_guard.get_latest_handoff(&workspace.id).unwrap()
        };

        assert!(latest.is_some());
        assert_eq!(latest.unwrap().id, handoff.id);
    }
}
