/**
 * Seed data for MCP Registry
 *
 * This file contains seed data for popular open-source MCP servers
 * that can be used as templates in the registry.
 */

import type { InferInsertModel } from "drizzle-orm";
import type { mcpServer as pgMcpServer } from "../schema/pg/mcp-servers";

export type McpServerInsert = Omit<
  InferInsertModel<typeof pgMcpServer>,
  "id" | "organizationId" | "createdAt" | "updatedAt"
>;

/**
 * Open source MCP server definitions
 *
 * These are template definitions that can be used when users
 * want to add popular MCP servers to their organization.
 */
export const openSourceMcpServers: McpServerInsert[] = [
  {
    name: "athreei-browser",
    description:
      "Privacy-focused browser automation via Chrome extension. Control browser tabs, navigate pages, click elements, type text, take screenshots, and execute scripts - all with full audit logging and permission controls.",
    transport: "STDIO",
    command: "npx",
    args: JSON.stringify(["-y", "@athreei/mcp-server"]),
    status: "active",
    version: "0.1.0",
    capabilities: JSON.stringify([
      "browser_list_tabs",
      "browser_get_active_tab",
      "browser_navigate",
      "browser_get_content",
      "browser_get_elements",
      "browser_click",
      "browser_type",
      "browser_scroll",
      "browser_screenshot",
      "browser_execute_script",
      "browser_wait",
    ]),
  },
  {
    name: "filesystem",
    description:
      "Secure file operations with configurable access controls. Provides tools for reading, writing, and managing files and directories on the local filesystem.",
    transport: "STDIO",
    command: "npx",
    args: JSON.stringify(["-y", "@modelcontextprotocol/server-filesystem"]),
    status: "active",
    version: "0.6.2",
    capabilities: JSON.stringify([
      "read_file",
      "read_multiple_files",
      "write_file",
      "edit_file",
      "create_directory",
      "list_directory",
      "directory_tree",
      "move_file",
      "search_files",
      "get_file_info",
    ]),
  },
  {
    name: "github",
    description:
      "GitHub API integration enabling repository management, file operations, and GitHub functionality including issues, pull requests, branches, and more.",
    transport: "STDIO",
    command: "npx",
    args: JSON.stringify(["-y", "@modelcontextprotocol/server-github"]),
    status: "active",
    version: "0.6.2",
    capabilities: JSON.stringify([
      "create_or_update_file",
      "search_repositories",
      "create_repository",
      "get_file_contents",
      "push_files",
      "create_issue",
      "create_pull_request",
      "fork_repository",
      "create_branch",
      "list_commits",
      "list_issues",
      "update_issue",
      "add_issue_comment",
      "search_code",
      "search_issues",
      "search_users",
    ]),
  },
  {
    name: "puppeteer",
    description:
      "Browser automation and web scraping using Puppeteer. Navigate pages, take screenshots, click elements, fill forms, and execute JavaScript in a browser context.",
    transport: "STDIO",
    command: "npx",
    args: JSON.stringify(["-y", "@modelcontextprotocol/server-puppeteer"]),
    status: "active",
    version: "0.6.2",
    capabilities: JSON.stringify([
      "puppeteer_navigate",
      "puppeteer_screenshot",
      "puppeteer_click",
      "puppeteer_fill",
      "puppeteer_select",
      "puppeteer_hover",
      "puppeteer_evaluate",
    ]),
  },
  {
    name: "sqlite",
    description:
      "SQLite database integration with comprehensive query capabilities. Execute SQL queries, manage schemas, analyze data, and perform database operations.",
    transport: "STDIO",
    command: "npx",
    args: JSON.stringify(["-y", "@modelcontextprotocol/server-sqlite"]),
    status: "active",
    version: "0.6.2",
    capabilities: JSON.stringify([
      "read_query",
      "write_query",
      "create_table",
      "list_tables",
      "describe_table",
      "append_insight",
    ]),
  },
  {
    name: "fetch",
    description:
      "HTTP request capabilities for fetching web content. Retrieve and process content from URLs with support for various content types and robots.txt compliance.",
    transport: "STDIO",
    command: "npx",
    args: JSON.stringify(["-y", "@modelcontextprotocol/server-fetch"]),
    status: "active",
    version: "0.6.2",
    capabilities: JSON.stringify(["fetch"]),
  },
];

/**
 * Get seed data with generated IDs and timestamps
 *
 * @param organizationId - The organization to associate the servers with
 * @param idGenerator - Function to generate unique IDs (defaults to crypto.randomUUID)
 * @returns Array of MCP server records ready for insertion
 */
export function getMcpServerSeedData(
  organizationId: string,
  idGenerator: () => string = () => crypto.randomUUID()
): Array<InferInsertModel<typeof pgMcpServer>> {
  const now = new Date();

  return openSourceMcpServers.map((server) => ({
    id: idGenerator(),
    organizationId,
    ...server,
    createdAt: now,
    updatedAt: now,
  }));
}

/**
 * Validate seed data structure
 *
 * Ensures all required fields are present and valid
 */
export function validateSeedData(
  data: McpServerInsert[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const requiredFields = ["name", "transport", "status"] as const;

  for (const [index, server] of data.entries()) {
    for (const field of requiredFields) {
      if (!server[field]) {
        errors.push(`Server at index ${index} is missing required field: ${field}`);
      }
    }

    // Validate transport type
    if (server.transport && !["STDIO", "SSE", "HTTP"].includes(server.transport)) {
      errors.push(
        `Server "${server.name}" has invalid transport: ${server.transport}. Expected STDIO, SSE, or HTTP.`
      );
    }

    // Validate status
    if (server.status && !["active", "inactive", "error"].includes(server.status)) {
      errors.push(
        `Server "${server.name}" has invalid status: ${server.status}. Expected active, inactive, or error.`
      );
    }

    // Validate args is valid JSON if present
    if (server.args) {
      try {
        JSON.parse(server.args);
      } catch {
        errors.push(`Server "${server.name}" has invalid args JSON: ${server.args}`);
      }
    }

    // Validate capabilities is valid JSON if present
    if (server.capabilities) {
      try {
        const caps = JSON.parse(server.capabilities);
        if (!Array.isArray(caps)) {
          errors.push(
            `Server "${server.name}" capabilities must be a JSON array`
          );
        }
      } catch {
        errors.push(
          `Server "${server.name}" has invalid capabilities JSON: ${server.capabilities}`
        );
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
