//! Workspace-related Tauri commands
//!
//! Provides CRUD operations for workspaces, tasks, and handoffs with encryption support.
//! All encrypted fields are decrypted before being sent to the frontend.

use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tauri::State;

use crate::encryption::VaultState;
use crate::state::DatabaseState;
use crate::workspace::{
    Handoff, ListWorkspacesFilter, Task, TaskStatus, Workspace, WorkspaceStatus,
};

/// A decrypted workspace ready for frontend consumption
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DecryptedWorkspace {
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

/// A decrypted task ready for frontend consumption
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DecryptedTask {
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

/// A decrypted handoff ready for frontend consumption
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DecryptedHandoff {
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

/// A decrypted workspace with tasks and latest handoff
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DecryptedWorkspaceWithTasks {
    #[serde(flatten)]
    pub workspace: DecryptedWorkspace,
    pub tasks: Vec<DecryptedTask>,
    pub latest_handoff: Option<DecryptedHandoff>,
}

/// Build AAD (Additional Authenticated Data) for workspace encryption
fn build_workspace_aad(workspace_id: &str, space_id: Option<&str>) -> Vec<u8> {
    format!(
        "workspace:{}|space:{}",
        workspace_id,
        space_id.unwrap_or("none")
    )
    .into_bytes()
}

/// Build AAD for task encryption
fn build_task_aad(task_id: &str, workspace_id: &str) -> Vec<u8> {
    format!("task:{}|workspace:{}", task_id, workspace_id).into_bytes()
}

/// Build AAD for handoff encryption
fn build_handoff_aad(handoff_id: &str, workspace_id: &str) -> Vec<u8> {
    format!("handoff:{}|workspace:{}", handoff_id, workspace_id).into_bytes()
}

/// Decrypt a workspace for frontend consumption
fn decrypt_workspace(workspace: &Workspace, vault: &VaultState) -> Result<DecryptedWorkspace, String> {
    let aad = build_workspace_aad(&workspace.id, workspace.space_id.as_deref());

    // Prefer encrypted fields if available, fall back to plaintext
    let goal = if let Some(encrypted) = &workspace.encrypted_goal {
        let decrypted = vault
            .decrypt(encrypted, &aad)
            .map_err(|e| format!("Failed to decrypt goal: {e}"))?;
        String::from_utf8(decrypted).map_err(|e| format!("Invalid UTF-8 in goal: {e}"))?
    } else {
        workspace.goal.clone()
    };

    let context = if let Some(encrypted) = &workspace.encrypted_context {
        let decrypted = vault
            .decrypt(encrypted, &aad)
            .map_err(|e| format!("Failed to decrypt context: {e}"))?;
        Some(String::from_utf8(decrypted).map_err(|e| format!("Invalid UTF-8 in context: {e}"))?)
    } else {
        workspace.context.clone()
    };

    Ok(DecryptedWorkspace {
        id: workspace.id.clone(),
        name: workspace.name.clone(),
        description: workspace.description.clone(),
        space_id: workspace.space_id.clone(),
        goal,
        success_criteria: workspace.success_criteria.clone(),
        status: workspace.status,
        blocker: workspace.blocker.clone(),
        context,
        created_at: workspace.created_at,
        updated_at: workspace.updated_at,
        completed_at: workspace.completed_at,
    })
}

/// Decrypt a task for frontend consumption
fn decrypt_task(task: &Task, vault: &VaultState) -> Result<DecryptedTask, String> {
    let aad = build_task_aad(&task.id, &task.workspace_id);

    let title = if let Some(encrypted) = &task.encrypted_title {
        let decrypted = vault
            .decrypt(encrypted, &aad)
            .map_err(|e| format!("Failed to decrypt title: {e}"))?;
        String::from_utf8(decrypted).map_err(|e| format!("Invalid UTF-8 in title: {e}"))?
    } else {
        task.title.clone()
    };

    let description = if let Some(encrypted) = &task.encrypted_description {
        let decrypted = vault
            .decrypt(encrypted, &aad)
            .map_err(|e| format!("Failed to decrypt description: {e}"))?;
        Some(String::from_utf8(decrypted).map_err(|e| format!("Invalid UTF-8 in description: {e}"))?)
    } else {
        task.description.clone()
    };

    Ok(DecryptedTask {
        id: task.id.clone(),
        workspace_id: task.workspace_id.clone(),
        title,
        description,
        status: task.status,
        blocker: task.blocker.clone(),
        is_next_action: task.is_next_action,
        position: task.position,
        created_at: task.created_at,
        updated_at: task.updated_at,
        completed_at: task.completed_at,
    })
}

/// Decrypt a handoff for frontend consumption
fn decrypt_handoff(handoff: &Handoff, vault: &VaultState) -> Result<DecryptedHandoff, String> {
    let aad = build_handoff_aad(&handoff.id, &handoff.workspace_id);

    let progress_summary = if let Some(encrypted) = &handoff.encrypted_progress {
        let decrypted = vault
            .decrypt(encrypted, &aad)
            .map_err(|e| format!("Failed to decrypt progress_summary: {e}"))?;
        String::from_utf8(decrypted).map_err(|e| format!("Invalid UTF-8 in progress_summary: {e}"))?
    } else {
        handoff.progress_summary.clone()
    };

    let current_state = if let Some(encrypted) = &handoff.encrypted_state {
        let decrypted = vault
            .decrypt(encrypted, &aad)
            .map_err(|e| format!("Failed to decrypt current_state: {e}"))?;
        String::from_utf8(decrypted).map_err(|e| format!("Invalid UTF-8 in current_state: {e}"))?
    } else {
        handoff.current_state.clone()
    };

    Ok(DecryptedHandoff {
        id: handoff.id.clone(),
        workspace_id: handoff.workspace_id.clone(),
        session_id: handoff.session_id.clone(),
        progress_summary,
        current_state,
        next_steps: handoff.next_steps.clone(),
        blockers: handoff.blockers.clone(),
        what_worked: handoff.what_worked.clone(),
        what_failed: handoff.what_failed.clone(),
        key_decisions: handoff.key_decisions.clone(),
        created_at: handoff.created_at,
    })
}

/// List workspaces with optional filters
#[tauri::command]
pub async fn list_workspaces(
    space_id: Option<String>,
    statuses: Option<Vec<String>>,
    limit: Option<usize>,
    offset: Option<usize>,
    db: State<'_, Arc<DatabaseState>>,
    vault: State<'_, Arc<VaultState>>,
) -> Result<Vec<DecryptedWorkspace>, String> {
    if !vault.is_unlocked() {
        return Err("Vault is locked".to_string());
    }

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

    let workspaces = db_guard
        .list_workspaces(&filter)
        .map_err(|e| format!("Failed to list workspaces: {e}"))?;

    let mut decrypted = Vec::with_capacity(workspaces.len());
    for workspace in workspaces {
        decrypted.push(decrypt_workspace(&workspace, &vault)?);
    }

    Ok(decrypted)
}

/// Get a workspace by ID with tasks and latest handoff
#[tauri::command]
pub async fn get_workspace(
    id: String,
    db: State<'_, Arc<DatabaseState>>,
    vault: State<'_, Arc<VaultState>>,
) -> Result<Option<DecryptedWorkspaceWithTasks>, String> {
    if !vault.is_unlocked() {
        return Err("Vault is locked".to_string());
    }

    let db_guard = db
        .db
        .lock()
        .map_err(|e| format!("Database lock error: {e}"))?;

    let workspace_with_tasks = db_guard
        .get_workspace_with_tasks(&id)
        .map_err(|e| format!("Failed to get workspace: {e}"))?;

    match workspace_with_tasks {
        Some(w) => {
            let workspace = decrypt_workspace(&w.workspace, &vault)?;
            let mut tasks = Vec::with_capacity(w.tasks.len());
            for task in &w.tasks {
                tasks.push(decrypt_task(task, &vault)?);
            }
            let latest_handoff = if let Some(h) = &w.latest_handoff {
                Some(decrypt_handoff(h, &vault)?)
            } else {
                None
            };

            Ok(Some(DecryptedWorkspaceWithTasks {
                workspace,
                tasks,
                latest_handoff,
            }))
        }
        None => Ok(None),
    }
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
    vault: State<'_, Arc<VaultState>>,
) -> Result<DecryptedWorkspace, String> {
    if !vault.is_unlocked() {
        return Err("Vault is locked".to_string());
    }

    let db_guard = db
        .db
        .lock()
        .map_err(|e| format!("Database lock error: {e}"))?;

    let mut workspace = Workspace::new(name, goal.clone(), space_id.clone());
    workspace.description = description;
    workspace.success_criteria = success_criteria;

    // Encrypt sensitive fields
    let aad = build_workspace_aad(&workspace.id, space_id.as_deref());
    workspace.encrypted_goal = Some(
        vault
            .encrypt(goal.as_bytes(), &aad)
            .map_err(|e| format!("Failed to encrypt goal: {e}"))?,
    );

    db_guard
        .create_workspace(&workspace)
        .map_err(|e| format!("Failed to create workspace: {e}"))?;

    decrypt_workspace(&workspace, &vault)
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
    vault: State<'_, Arc<VaultState>>,
) -> Result<DecryptedWorkspace, String> {
    if !vault.is_unlocked() {
        return Err("Vault is locked".to_string());
    }

    let db_guard = db
        .db
        .lock()
        .map_err(|e| format!("Database lock error: {e}"))?;

    let mut workspace = db_guard
        .get_workspace(&id)
        .map_err(|e| format!("Failed to get workspace: {e}"))?
        .ok_or_else(|| format!("Workspace not found: {id}"))?;

    let aad = build_workspace_aad(&workspace.id, workspace.space_id.as_deref());

    if let Some(n) = name {
        workspace.name = n;
    }
    if let Some(d) = description {
        workspace.description = Some(d);
    }
    if let Some(g) = &goal {
        workspace.goal = g.clone();
        workspace.encrypted_goal = Some(
            vault
                .encrypt(g.as_bytes(), &aad)
                .map_err(|e| format!("Failed to encrypt goal: {e}"))?,
        );
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
    if let Some(c) = &context {
        workspace.context = Some(c.clone());
        workspace.encrypted_context = Some(
            vault
                .encrypt(c.as_bytes(), &aad)
                .map_err(|e| format!("Failed to encrypt context: {e}"))?,
        );
    }

    db_guard
        .update_workspace(&workspace)
        .map_err(|e| format!("Failed to update workspace: {e}"))?;

    let updated = db_guard
        .get_workspace(&id)
        .map_err(|e| format!("Failed to get updated workspace: {e}"))?
        .ok_or_else(|| "Workspace not found after update".to_string())?;

    decrypt_workspace(&updated, &vault)
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
    vault: State<'_, Arc<VaultState>>,
) -> Result<Vec<DecryptedTask>, String> {
    if !vault.is_unlocked() {
        return Err("Vault is locked".to_string());
    }

    let db_guard = db
        .db
        .lock()
        .map_err(|e| format!("Database lock error: {e}"))?;

    let tasks = db_guard
        .list_tasks(&workspace_id)
        .map_err(|e| format!("Failed to list tasks: {e}"))?;

    let mut decrypted = Vec::with_capacity(tasks.len());
    for task in tasks {
        decrypted.push(decrypt_task(&task, &vault)?);
    }

    Ok(decrypted)
}

/// Get a task by ID
#[tauri::command]
pub async fn get_task(
    id: String,
    db: State<'_, Arc<DatabaseState>>,
    vault: State<'_, Arc<VaultState>>,
) -> Result<Option<DecryptedTask>, String> {
    if !vault.is_unlocked() {
        return Err("Vault is locked".to_string());
    }

    let db_guard = db
        .db
        .lock()
        .map_err(|e| format!("Database lock error: {e}"))?;

    let task = db_guard
        .get_task(&id)
        .map_err(|e| format!("Failed to get task: {e}"))?;

    match task {
        Some(t) => Ok(Some(decrypt_task(&t, &vault)?)),
        None => Ok(None),
    }
}

/// Create a new task
#[tauri::command]
pub async fn create_task(
    workspace_id: String,
    title: String,
    description: Option<String>,
    is_next_action: Option<bool>,
    db: State<'_, Arc<DatabaseState>>,
    vault: State<'_, Arc<VaultState>>,
) -> Result<DecryptedTask, String> {
    if !vault.is_unlocked() {
        return Err("Vault is locked".to_string());
    }

    let db_guard = db
        .db
        .lock()
        .map_err(|e| format!("Database lock error: {e}"))?;

    // Verify workspace exists
    db_guard
        .get_workspace(&workspace_id)
        .map_err(|e| format!("Failed to get workspace: {e}"))?
        .ok_or_else(|| format!("Workspace not found: {workspace_id}"))?;

    let mut task = Task::new(workspace_id.clone(), title.clone());
    task.description = description.clone();
    task.is_next_action = is_next_action.unwrap_or(false);

    // Encrypt sensitive fields
    let aad = build_task_aad(&task.id, &workspace_id);
    task.encrypted_title = Some(
        vault
            .encrypt(title.as_bytes(), &aad)
            .map_err(|e| format!("Failed to encrypt title: {e}"))?,
    );
    if let Some(desc) = &description {
        task.encrypted_description = Some(
            vault
                .encrypt(desc.as_bytes(), &aad)
                .map_err(|e| format!("Failed to encrypt description: {e}"))?,
        );
    }

    db_guard
        .create_task(&task)
        .map_err(|e| format!("Failed to create task: {e}"))?;

    decrypt_task(&task, &vault)
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
    vault: State<'_, Arc<VaultState>>,
) -> Result<DecryptedTask, String> {
    if !vault.is_unlocked() {
        return Err("Vault is locked".to_string());
    }

    let db_guard = db
        .db
        .lock()
        .map_err(|e| format!("Database lock error: {e}"))?;

    let mut task = db_guard
        .get_task(&id)
        .map_err(|e| format!("Failed to get task: {e}"))?
        .ok_or_else(|| format!("Task not found: {id}"))?;

    let aad = build_task_aad(&task.id, &task.workspace_id);

    if let Some(t) = &title {
        task.title = t.clone();
        task.encrypted_title = Some(
            vault
                .encrypt(t.as_bytes(), &aad)
                .map_err(|e| format!("Failed to encrypt title: {e}"))?,
        );
    }
    if let Some(d) = &description {
        task.description = Some(d.clone());
        task.encrypted_description = Some(
            vault
                .encrypt(d.as_bytes(), &aad)
                .map_err(|e| format!("Failed to encrypt description: {e}"))?,
        );
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

    let updated = db_guard
        .get_task(&id)
        .map_err(|e| format!("Failed to get updated task: {e}"))?
        .ok_or_else(|| "Task not found after update".to_string())?;

    decrypt_task(&updated, &vault)
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
    vault: State<'_, Arc<VaultState>>,
) -> Result<Vec<DecryptedHandoff>, String> {
    if !vault.is_unlocked() {
        return Err("Vault is locked".to_string());
    }

    let db_guard = db
        .db
        .lock()
        .map_err(|e| format!("Database lock error: {e}"))?;

    let handoffs = db_guard
        .list_handoffs(&workspace_id, limit.unwrap_or(10))
        .map_err(|e| format!("Failed to list handoffs: {e}"))?;

    let mut decrypted = Vec::with_capacity(handoffs.len());
    for handoff in handoffs {
        decrypted.push(decrypt_handoff(&handoff, &vault)?);
    }

    Ok(decrypted)
}

/// Get a handoff by ID
#[tauri::command]
pub async fn get_handoff(
    id: String,
    db: State<'_, Arc<DatabaseState>>,
    vault: State<'_, Arc<VaultState>>,
) -> Result<Option<DecryptedHandoff>, String> {
    if !vault.is_unlocked() {
        return Err("Vault is locked".to_string());
    }

    let db_guard = db
        .db
        .lock()
        .map_err(|e| format!("Database lock error: {e}"))?;

    let handoff = db_guard
        .get_handoff(&id)
        .map_err(|e| format!("Failed to get handoff: {e}"))?;

    match handoff {
        Some(h) => Ok(Some(decrypt_handoff(&h, &vault)?)),
        None => Ok(None),
    }
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
    vault: State<'_, Arc<VaultState>>,
) -> Result<DecryptedHandoff, String> {
    if !vault.is_unlocked() {
        return Err("Vault is locked".to_string());
    }

    let db_guard = db
        .db
        .lock()
        .map_err(|e| format!("Database lock error: {e}"))?;

    // Verify workspace exists
    db_guard
        .get_workspace(&workspace_id)
        .map_err(|e| format!("Failed to get workspace: {e}"))?
        .ok_or_else(|| format!("Workspace not found: {workspace_id}"))?;

    let mut handoff = Handoff::new(workspace_id.clone(), progress_summary.clone(), current_state.clone());
    handoff.next_steps = next_steps;
    handoff.blockers = blockers;
    handoff.what_worked = what_worked;
    handoff.what_failed = what_failed;
    handoff.key_decisions = key_decisions;

    // Encrypt sensitive fields
    let aad = build_handoff_aad(&handoff.id, &workspace_id);
    handoff.encrypted_progress = Some(
        vault
            .encrypt(progress_summary.as_bytes(), &aad)
            .map_err(|e| format!("Failed to encrypt progress_summary: {e}"))?,
    );
    handoff.encrypted_state = Some(
        vault
            .encrypt(current_state.as_bytes(), &aad)
            .map_err(|e| format!("Failed to encrypt current_state: {e}"))?,
    );

    db_guard
        .create_handoff(&handoff)
        .map_err(|e| format!("Failed to create handoff: {e}"))?;

    decrypt_handoff(&handoff, &vault)
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
    vault: State<'_, Arc<VaultState>>,
) -> Result<Option<DecryptedHandoff>, String> {
    if !vault.is_unlocked() {
        return Err("Vault is locked".to_string());
    }

    let db_guard = db
        .db
        .lock()
        .map_err(|e| format!("Database lock error: {e}"))?;

    let handoff = db_guard
        .get_latest_handoff(&workspace_id)
        .map_err(|e| format!("Failed to get latest handoff: {e}"))?;

    match handoff {
        Some(h) => Ok(Some(decrypt_handoff(&h, &vault)?)),
        None => Ok(None),
    }
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
