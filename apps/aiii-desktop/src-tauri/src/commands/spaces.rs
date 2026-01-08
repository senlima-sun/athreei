//! Space-related Tauri commands
//!
//! Provides CRUD operations for spaces (logical groupings of memories).

use std::sync::Arc;
use tauri::State;

use crate::state::DatabaseState;
use crate::storage::Space;

/// List all spaces ordered by name
#[tauri::command]
pub async fn list_spaces(db: State<'_, Arc<DatabaseState>>) -> Result<Vec<Space>, String> {
    let db_guard = db.db.lock().map_err(|e| format!("Database lock error: {e}"))?;

    db_guard.list_spaces().map_err(|e| format!("Failed to list spaces: {e}"))
}

/// Get a space by ID
#[tauri::command]
pub async fn get_space(id: String, db: State<'_, Arc<DatabaseState>>) -> Result<Option<Space>, String> {
    let db_guard = db.db.lock().map_err(|e| format!("Database lock error: {e}"))?;

    db_guard.get_space(&id).map_err(|e| format!("Failed to get space: {e}"))
}

/// Create a new space
#[tauri::command]
pub async fn create_space(
    name: String,
    icon: Option<String>,
    db: State<'_, Arc<DatabaseState>>,
) -> Result<Space, String> {
    let db_guard = db.db.lock().map_err(|e| format!("Database lock error: {e}"))?;

    let space = Space::new(name, icon, None);
    db_guard
        .create_space(&space)
        .map_err(|e| format!("Failed to create space: {e}"))?;

    Ok(space)
}

/// Update an existing space
#[tauri::command]
pub async fn update_space(
    id: String,
    name: Option<String>,
    icon: Option<String>,
    db: State<'_, Arc<DatabaseState>>,
) -> Result<Space, String> {
    let db_guard = db.db.lock().map_err(|e| format!("Database lock error: {e}"))?;

    // Get the existing space
    let mut space = db_guard
        .get_space(&id)
        .map_err(|e| format!("Failed to get space: {e}"))?
        .ok_or_else(|| format!("Space not found: {id}"))?;

    // Update fields if provided
    if let Some(new_name) = name {
        space.name = new_name;
    }
    if icon.is_some() {
        space.icon = icon;
    }

    db_guard
        .update_space(&space)
        .map_err(|e| format!("Failed to update space: {e}"))?;

    // Fetch updated space to get new updated_at
    db_guard
        .get_space(&id)
        .map_err(|e| format!("Failed to get updated space: {e}"))?
        .ok_or_else(|| "Space not found after update".to_string())
}

/// Delete a space by ID
#[tauri::command]
pub async fn delete_space(id: String, db: State<'_, Arc<DatabaseState>>) -> Result<(), String> {
    let db_guard = db.db.lock().map_err(|e| format!("Database lock error: {e}"))?;

    db_guard.delete_space(&id).map_err(|e| format!("Failed to delete space: {e}"))
}

/// Count memories in a space
#[tauri::command]
pub async fn count_space_memories(
    space_id: String,
    db: State<'_, Arc<DatabaseState>>,
) -> Result<i64, String> {
    let db_guard = db.db.lock().map_err(|e| format!("Database lock error: {e}"))?;

    db_guard
        .count_memories(Some(&space_id))
        .map_err(|e| format!("Failed to count memories: {e}"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::storage::Database;
    use std::sync::Mutex;

    fn create_test_db_state() -> DatabaseState {
        let db = Database::in_memory().unwrap();
        db.init_schema().unwrap();
        DatabaseState { db: Mutex::new(db) }
    }

    #[tokio::test]
    async fn test_create_and_list_spaces() {
        let db_state = create_test_db_state();

        // Create a space
        let space = {
            let db_guard = db_state.db.lock().unwrap();
            let space = Space::new("Test Space".to_string(), Some("test".to_string()), None);
            db_guard.create_space(&space).unwrap();
            space
        };

        // List spaces
        let spaces = {
            let db_guard = db_state.db.lock().unwrap();
            db_guard.list_spaces().unwrap()
        };

        assert_eq!(spaces.len(), 1);
        assert_eq!(spaces[0].name, "Test Space");
        assert_eq!(spaces[0].id, space.id);
    }
}
