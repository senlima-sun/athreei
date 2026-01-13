//! MCP Server Handler
//!
//! Implements the rmcp ServerHandler trait to handle incoming JSON-RPC requests.

use rmcp::{
    model::{
        AnnotateAble, CallToolRequestParam, CallToolResult, Content, GetPromptRequestParam,
        GetPromptResult, ListPromptsResult, ListResourceTemplatesResult, ListResourcesResult,
        ListToolsResult, PaginatedRequestParam, Prompt, PromptArgument, PromptMessage,
        RawResource, RawResourceTemplate, ReadResourceRequestParam, ReadResourceResult, Resource,
        ResourceContents, ResourceTemplate, ServerInfo, Tool,
    },
    service::RequestContext,
    Error as McpError, RoleServer, ServerHandler,
};
use std::sync::Arc;

use super::tools::{
    AddTaskInput, CreateMemoryInput, CreateWorkspaceInput, GetMemoryInput, GetRelevantContextInput,
    GetWorkspaceInput, ListSpacesInput, ListWorkspacesInput, McpTools, ResumeWorkspaceInput,
    SaveHandoffInput, SearchMemoriesInput, UpdateMemoryInput, UpdateTaskInputMcp,
    UpdateWorkspaceInput,
};
use crate::encryption::VaultState;
use crate::mcp::resources::AiiiResources;
use crate::state::DatabaseState;
use crate::trace::{TraceCollector, TraceTimer};

/// MCP Server Handler for aiii-memory
#[derive(Clone)]
pub struct AiiiHandler {
    tools: Arc<McpTools>,
    resources: Arc<AiiiResources>,
    trace_collector: Arc<TraceCollector>,
}

impl AiiiHandler {
    pub fn new(db: Arc<DatabaseState>, vault: Arc<VaultState>, trace_collector: Arc<TraceCollector>) -> Self {
        Self {
            tools: Arc::new(McpTools::new(db.clone(), vault.clone())),
            resources: Arc::new(AiiiResources::new(db, vault)),
            trace_collector,
        }
    }
}

impl ServerHandler for AiiiHandler {
    fn get_info(&self) -> ServerInfo {
        ServerInfo {
            protocol_version: rmcp::model::ProtocolVersion::default(),
            capabilities: rmcp::model::ServerCapabilities {
                tools: Some(Default::default()),
                resources: Some(Default::default()),
                prompts: Some(Default::default()),
                ..Default::default()
            },
            server_info: rmcp::model::Implementation {
                name: "aiii-memory".into(),
                version: env!("CARGO_PKG_VERSION").into(),
                title: Some("aiii Personal Memory".into()),
                icons: None,
                website_url: None,
            },
            instructions: Some(
                "Personal AI memory layer. Save and retrieve memories across AI conversations. \
                 Use search_memories to find relevant context, get_memory to retrieve full content, \
                 and create_memory to save new information."
                    .into(),
            ),
        }
    }

    fn list_tools(
        &self,
        _request: Option<PaginatedRequestParam>,
        _context: RequestContext<RoleServer>,
    ) -> impl std::future::Future<Output = Result<ListToolsResult, McpError>> + Send + '_ {
        async move {
            use rmcp::handler::server::tool::schema_for_type;

            let tools = vec![
                Tool::new(
                    "search_memories",
                    "Search through saved memories using full-text search. \
                     Returns matching memories with titles, summaries, and content.",
                    schema_for_type::<SearchMemoriesInput>(),
                ),
                Tool::new(
                    "get_memory",
                    "Retrieve a specific memory by its ID. Returns the full memory content.",
                    schema_for_type::<GetMemoryInput>(),
                ),
                Tool::new(
                    "create_memory",
                    "Create a new memory with a title and content. \
                     Optionally assign to a space and add tags.",
                    schema_for_type::<CreateMemoryInput>(),
                ),
                Tool::new(
                    "update_memory",
                    "Update an existing memory's title, content, or space assignment.",
                    schema_for_type::<UpdateMemoryInput>(),
                ),
                Tool::new(
                    "list_spaces",
                    "List all available memory spaces. \
                     Optionally include memory counts per space.",
                    schema_for_type::<ListSpacesInput>(),
                ),
                Tool::new(
                    "get_relevant_context",
                    "Retrieve memories relevant to the given query using intent extraction, \
                     hybrid search (keyword + semantic), and relevance scoring. Returns formatted \
                     memories with relevance scores. Use this to get context before performing \
                     tasks that might benefit from historical information or past decisions.",
                    schema_for_type::<GetRelevantContextInput>(),
                ),
                // Workspace & Handoff Tools
                Tool::new(
                    "create_workspace",
                    "Create a new workspace for tracking a goal-oriented task. Workspaces contain \
                     tasks and handoffs for session continuity. Use when starting work on a \
                     multi-session project or complex task.",
                    schema_for_type::<CreateWorkspaceInput>(),
                ),
                Tool::new(
                    "get_workspace",
                    "Get a workspace by ID, including its tasks and latest handoff. Use this to \
                     understand the current state of work on a project.",
                    schema_for_type::<GetWorkspaceInput>(),
                ),
                Tool::new(
                    "update_workspace",
                    "Update a workspace's status, goal, context, or blocker. Use to mark progress, \
                     note blockers, or update the goal as understanding evolves.",
                    schema_for_type::<UpdateWorkspaceInput>(),
                ),
                Tool::new(
                    "list_workspaces",
                    "List workspaces with optional filters. Use to find active or pending workspaces \
                     that need attention.",
                    schema_for_type::<ListWorkspacesInput>(),
                ),
                Tool::new(
                    "add_task",
                    "Add a task to a workspace. Tasks break down the workspace goal into actionable \
                     items. Mark high-priority tasks as next actions.",
                    schema_for_type::<AddTaskInput>(),
                ),
                Tool::new(
                    "update_task",
                    "Update a task's status, title, or other properties. Use to mark tasks complete, \
                     blocked, or update their details.",
                    schema_for_type::<UpdateTaskInputMcp>(),
                ),
                Tool::new(
                    "save_handoff",
                    "Save a handoff for session continuity. Document progress, current state, \
                     next steps, blockers, and learnings. ALWAYS call this before ending a session \
                     so the next session can resume effectively.",
                    schema_for_type::<SaveHandoffInput>(),
                ),
                Tool::new(
                    "resume_workspace",
                    "Resume work on a workspace. Returns the workspace with all tasks and the \
                     latest handoff context. Use this at the start of a session to get context \
                     about where work left off.",
                    schema_for_type::<ResumeWorkspaceInput>(),
                ),
            ];

            Ok(ListToolsResult {
                tools,
                ..Default::default()
            })
        }
    }

    fn call_tool(
        &self,
        request: CallToolRequestParam,
        _context: RequestContext<RoleServer>,
    ) -> impl std::future::Future<Output = Result<CallToolResult, McpError>> + Send + '_ {
        async move {
            let arguments = request.arguments.unwrap_or_default();
            let arguments_value = serde_json::Value::Object(
                arguments
                    .into_iter()
                    .collect::<serde_json::Map<String, serde_json::Value>>(),
            );

            let session_id = self.trace_collector.ensure_session(Some("mcp-client".into())).await;

            let timer = TraceTimer::start(
                session_id,
                request.name.to_string(),
                Some(arguments_value.clone()),
            );

            let result = match request.name.as_ref() {
                "search_memories" => {
                    let input: SearchMemoriesInput = serde_json::from_value(arguments_value)
                        .map_err(|e| {
                            McpError::invalid_params(format!("Invalid input: {e}"), None)
                        })?;

                    match self.tools.search_memories(input) {
                        Ok(result) => serde_json::to_string_pretty(&result).map_err(|e| {
                            McpError::internal_error(format!("Serialization error: {e}"), None)
                        })?,
                        Err(e) => {
                            let entry = timer.finish_error(e.clone(), Some("tool_error".into()));
                            self.trace_collector.record_trace(entry).await;
                            return Err(McpError::internal_error(e, None));
                        }
                    }
                }
                "get_memory" => {
                    let input: GetMemoryInput =
                        serde_json::from_value(arguments_value).map_err(|e| {
                            McpError::invalid_params(format!("Invalid input: {e}"), None)
                        })?;

                    match self.tools.get_memory(input) {
                        Ok(Some(memory)) => serde_json::to_string_pretty(&memory).map_err(|e| {
                            McpError::internal_error(format!("Serialization error: {e}"), None)
                        })?,
                        Ok(None) => "Memory not found".to_string(),
                        Err(e) => {
                            let entry = timer.finish_error(e.clone(), Some("tool_error".into()));
                            self.trace_collector.record_trace(entry).await;
                            return Err(McpError::internal_error(e, None));
                        }
                    }
                }
                "create_memory" => {
                    let input: CreateMemoryInput = serde_json::from_value(arguments_value)
                        .map_err(|e| {
                            McpError::invalid_params(format!("Invalid input: {e}"), None)
                        })?;

                    match self.tools.create_memory(input) {
                        Ok(memory) => serde_json::to_string_pretty(&memory).map_err(|e| {
                            McpError::internal_error(format!("Serialization error: {e}"), None)
                        })?,
                        Err(e) => {
                            let entry = timer.finish_error(e.clone(), Some("tool_error".into()));
                            self.trace_collector.record_trace(entry).await;
                            return Err(McpError::internal_error(e, None));
                        }
                    }
                }
                "update_memory" => {
                    let input: UpdateMemoryInput = serde_json::from_value(arguments_value)
                        .map_err(|e| {
                            McpError::invalid_params(format!("Invalid input: {e}"), None)
                        })?;

                    match self.tools.update_memory(input) {
                        Ok(memory) => serde_json::to_string_pretty(&memory).map_err(|e| {
                            McpError::internal_error(format!("Serialization error: {e}"), None)
                        })?,
                        Err(e) => {
                            let entry = timer.finish_error(e.clone(), Some("tool_error".into()));
                            self.trace_collector.record_trace(entry).await;
                            return Err(McpError::internal_error(e, None));
                        }
                    }
                }
                "list_spaces" => {
                    let input: ListSpacesInput =
                        serde_json::from_value(arguments_value).map_err(|e| {
                            McpError::invalid_params(format!("Invalid input: {e}"), None)
                        })?;

                    match self.tools.list_spaces(input) {
                        Ok(spaces) => serde_json::to_string_pretty(&spaces).map_err(|e| {
                            McpError::internal_error(format!("Serialization error: {e}"), None)
                        })?,
                        Err(e) => {
                            let entry = timer.finish_error(e.clone(), Some("tool_error".into()));
                            self.trace_collector.record_trace(entry).await;
                            return Err(McpError::internal_error(e, None));
                        }
                    }
                }
                "get_relevant_context" => {
                    let input: GetRelevantContextInput =
                        serde_json::from_value(arguments_value).map_err(|e| {
                            McpError::invalid_params(format!("Invalid input: {e}"), None)
                        })?;

                    match self.tools.get_relevant_context(input) {
                        Ok(result) => result,
                        Err(e) => {
                            let entry = timer.finish_error(e.clone(), Some("tool_error".into()));
                            self.trace_collector.record_trace(entry).await;
                            return Err(McpError::internal_error(e, None));
                        }
                    }
                }
                "create_workspace" => {
                    let input: CreateWorkspaceInput =
                        serde_json::from_value(arguments_value).map_err(|e| {
                            McpError::invalid_params(format!("Invalid input: {e}"), None)
                        })?;

                    match self.tools.create_workspace(input) {
                        Ok(workspace) => serde_json::to_string_pretty(&workspace).map_err(|e| {
                            McpError::internal_error(format!("Serialization error: {e}"), None)
                        })?,
                        Err(e) => {
                            let entry = timer.finish_error(e.clone(), Some("tool_error".into()));
                            self.trace_collector.record_trace(entry).await;
                            return Err(McpError::internal_error(e, None));
                        }
                    }
                }
                "get_workspace" => {
                    let input: GetWorkspaceInput =
                        serde_json::from_value(arguments_value).map_err(|e| {
                            McpError::invalid_params(format!("Invalid input: {e}"), None)
                        })?;

                    match self.tools.get_workspace(input) {
                        Ok(Some(workspace)) => serde_json::to_string_pretty(&workspace).map_err(|e| {
                            McpError::internal_error(format!("Serialization error: {e}"), None)
                        })?,
                        Ok(None) => "Workspace not found".to_string(),
                        Err(e) => {
                            let entry = timer.finish_error(e.clone(), Some("tool_error".into()));
                            self.trace_collector.record_trace(entry).await;
                            return Err(McpError::internal_error(e, None));
                        }
                    }
                }
                "update_workspace" => {
                    let input: UpdateWorkspaceInput =
                        serde_json::from_value(arguments_value).map_err(|e| {
                            McpError::invalid_params(format!("Invalid input: {e}"), None)
                        })?;

                    match self.tools.update_workspace(input) {
                        Ok(workspace) => serde_json::to_string_pretty(&workspace).map_err(|e| {
                            McpError::internal_error(format!("Serialization error: {e}"), None)
                        })?,
                        Err(e) => {
                            let entry = timer.finish_error(e.clone(), Some("tool_error".into()));
                            self.trace_collector.record_trace(entry).await;
                            return Err(McpError::internal_error(e, None));
                        }
                    }
                }
                "list_workspaces" => {
                    let input: ListWorkspacesInput =
                        serde_json::from_value(arguments_value).map_err(|e| {
                            McpError::invalid_params(format!("Invalid input: {e}"), None)
                        })?;

                    match self.tools.list_workspaces(input) {
                        Ok(workspaces) => serde_json::to_string_pretty(&workspaces).map_err(|e| {
                            McpError::internal_error(format!("Serialization error: {e}"), None)
                        })?,
                        Err(e) => {
                            let entry = timer.finish_error(e.clone(), Some("tool_error".into()));
                            self.trace_collector.record_trace(entry).await;
                            return Err(McpError::internal_error(e, None));
                        }
                    }
                }
                "add_task" => {
                    let input: AddTaskInput =
                        serde_json::from_value(arguments_value).map_err(|e| {
                            McpError::invalid_params(format!("Invalid input: {e}"), None)
                        })?;

                    match self.tools.add_task(input) {
                        Ok(task) => serde_json::to_string_pretty(&task).map_err(|e| {
                            McpError::internal_error(format!("Serialization error: {e}"), None)
                        })?,
                        Err(e) => {
                            let entry = timer.finish_error(e.clone(), Some("tool_error".into()));
                            self.trace_collector.record_trace(entry).await;
                            return Err(McpError::internal_error(e, None));
                        }
                    }
                }
                "update_task" => {
                    let input: UpdateTaskInputMcp =
                        serde_json::from_value(arguments_value).map_err(|e| {
                            McpError::invalid_params(format!("Invalid input: {e}"), None)
                        })?;

                    match self.tools.update_task(input) {
                        Ok(task) => serde_json::to_string_pretty(&task).map_err(|e| {
                            McpError::internal_error(format!("Serialization error: {e}"), None)
                        })?,
                        Err(e) => {
                            let entry = timer.finish_error(e.clone(), Some("tool_error".into()));
                            self.trace_collector.record_trace(entry).await;
                            return Err(McpError::internal_error(e, None));
                        }
                    }
                }
                "save_handoff" => {
                    let input: SaveHandoffInput =
                        serde_json::from_value(arguments_value).map_err(|e| {
                            McpError::invalid_params(format!("Invalid input: {e}"), None)
                        })?;

                    match self.tools.save_handoff(input) {
                        Ok(handoff) => serde_json::to_string_pretty(&handoff).map_err(|e| {
                            McpError::internal_error(format!("Serialization error: {e}"), None)
                        })?,
                        Err(e) => {
                            let entry = timer.finish_error(e.clone(), Some("tool_error".into()));
                            self.trace_collector.record_trace(entry).await;
                            return Err(McpError::internal_error(e, None));
                        }
                    }
                }
                "resume_workspace" => {
                    let input: ResumeWorkspaceInput =
                        serde_json::from_value(arguments_value).map_err(|e| {
                            McpError::invalid_params(format!("Invalid input: {e}"), None)
                        })?;

                    match self.tools.resume_workspace(input) {
                        Ok(workspace) => serde_json::to_string_pretty(&workspace).map_err(|e| {
                            McpError::internal_error(format!("Serialization error: {e}"), None)
                        })?,
                        Err(e) => {
                            let entry = timer.finish_error(e.clone(), Some("tool_error".into()));
                            self.trace_collector.record_trace(entry).await;
                            return Err(McpError::internal_error(e, None));
                        }
                    }
                }
                _ => {
                    let entry = timer.finish_error(
                        format!("Unknown tool: {}", request.name),
                        Some("unknown_tool".into()),
                    );
                    self.trace_collector.record_trace(entry).await;
                    return Err(McpError::invalid_params(
                        format!("Unknown tool: {}", request.name),
                        None,
                    ));
                }
            };

            let output_value: Option<serde_json::Value> = serde_json::from_str(&result).ok();
            let entry = timer.finish_success(output_value);
            self.trace_collector.record_trace(entry).await;

            Ok(CallToolResult::success(vec![Content::text(result)]))
        }
    }

    fn list_resources(
        &self,
        _request: Option<PaginatedRequestParam>,
        _context: RequestContext<RoleServer>,
    ) -> impl std::future::Future<Output = Result<ListResourcesResult, McpError>> + Send + '_ {
        async move {
            let resources = self
                .resources
                .list_resources()
                .map_err(|e| McpError::internal_error(e.to_string(), None))?;

            let mcp_resources: Vec<Resource> = resources
                .into_iter()
                .map(|r| {
                    RawResource {
                        uri: r.uri,
                        name: r.name,
                        title: None,
                        description: r.description,
                        mime_type: r.mime_type,
                        size: None,
                        icons: None,
                        meta: None,
                    }
                    .no_annotation()
                })
                .collect();

            Ok(ListResourcesResult {
                resources: mcp_resources,
                ..Default::default()
            })
        }
    }

    fn list_resource_templates(
        &self,
        _request: Option<PaginatedRequestParam>,
        _context: RequestContext<RoleServer>,
    ) -> impl std::future::Future<Output = Result<ListResourceTemplatesResult, McpError>> + Send + '_
    {
        async move {
            let templates = self.resources.list_resource_templates();

            let mcp_templates: Vec<ResourceTemplate> = templates
                .into_iter()
                .map(|t| {
                    RawResourceTemplate {
                        uri_template: t.uri_template,
                        name: t.name,
                        title: None,
                        description: t.description,
                        mime_type: t.mime_type,
                    }
                    .no_annotation()
                })
                .collect();

            Ok(ListResourceTemplatesResult {
                resource_templates: mcp_templates,
                ..Default::default()
            })
        }
    }

    fn read_resource(
        &self,
        request: ReadResourceRequestParam,
        _context: RequestContext<RoleServer>,
    ) -> impl std::future::Future<Output = Result<ReadResourceResult, McpError>> + Send + '_ {
        async move {
            let contents = self
                .resources
                .read_resource(&request.uri)
                .map_err(|e| McpError::internal_error(e.to_string(), None))?;

            Ok(ReadResourceResult {
                contents: vec![ResourceContents::text(
                    contents.text.unwrap_or_default(),
                    contents.uri,
                )],
            })
        }
    }

    fn list_prompts(
        &self,
        _request: Option<PaginatedRequestParam>,
        _context: RequestContext<RoleServer>,
    ) -> impl std::future::Future<Output = Result<ListPromptsResult, McpError>> + Send + '_ {
        async move {
            let prompts = vec![Prompt::new(
                "recall",
                Some("Search and recall relevant memories based on the current context."),
                Some(vec![PromptArgument {
                    name: "context".into(),
                    title: None,
                    description: Some("The context to search for relevant memories".into()),
                    required: Some(true),
                }]),
            )];

            Ok(ListPromptsResult {
                prompts,
                ..Default::default()
            })
        }
    }

    fn get_prompt(
        &self,
        request: GetPromptRequestParam,
        _context: RequestContext<RoleServer>,
    ) -> impl std::future::Future<Output = Result<GetPromptResult, McpError>> + Send + '_ {
        async move {
            match request.name.as_str() {
                "recall" => {
                    let context = request
                        .arguments
                        .as_ref()
                        .and_then(|args| args.get("context"))
                        .map(|v| v.to_string())
                        .unwrap_or_default();

                    // Search for relevant memories
                    let search_result = self.tools.search_memories(SearchMemoriesInput {
                        query: context.clone(),
                        space_id: None,
                        limit: Some(5),
                        summary_level: Some("brief".into()),
                        search_mode: None, // Use default (hybrid if model available)
                    });

                    let memory_context = match search_result {
                        Ok(result) if !result.memories.is_empty() => {
                            let mut ctx = String::from("Relevant memories:\n\n");
                            for (i, memory) in result.memories.iter().enumerate() {
                                ctx.push_str(&format!(
                                    "{}. {}\n   {}\n\n",
                                    i + 1,
                                    memory.title.as_deref().unwrap_or("Untitled"),
                                    memory.summary.as_deref().unwrap_or("")
                                ));
                            }
                            ctx
                        }
                        Ok(_) => "No relevant memories found.".to_string(),
                        Err(e) => format!("Error searching memories: {e}"),
                    };

                    Ok(GetPromptResult {
                        description: Some("Recalled memories based on context".into()),
                        messages: vec![PromptMessage::new_text(
                            rmcp::model::PromptMessageRole::User,
                            memory_context,
                        )],
                    })
                }
                _ => Err(McpError::invalid_params(
                    format!("Unknown prompt: {}", request.name),
                    None,
                )),
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::storage::Database;
    use crate::trace::TraceCollector;
    use std::sync::Mutex;

    fn create_test_handler() -> AiiiHandler {
        let db = Database::in_memory().unwrap();
        db.init_schema().unwrap();
        let db_state = Arc::new(DatabaseState { db: Mutex::new(db), path: std::path::PathBuf::from(":memory:") });

        let vault_state = Arc::new(VaultState::new());
        vault_state.unlock("test-passphrase").unwrap();

        let trace_collector = Arc::new(TraceCollector::new(db_state.clone()));

        AiiiHandler::new(db_state, vault_state, trace_collector)
    }

    #[test]
    fn test_get_info() {
        let handler = create_test_handler();
        let info = handler.get_info();

        assert_eq!(info.server_info.name, "aiii-memory");
    }
}
