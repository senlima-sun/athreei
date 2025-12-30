/**
 * Route aggregator
 *
 * Exports all route modules for use in the main app.
 */

export { default as healthRoutes } from "./health";
export { default as authRoutes } from "./auth";
export { default as configRoutes } from "./config";
export { default as organizationsRoutes } from "./organizations";
export { default as endpointsRoutes } from "./endpoints";
export { default as apiKeysRoutes } from "./api-keys";
export { default as mcpServersRoutes } from "./mcp-servers";
export { default as namespacesRoutes } from "./namespaces";
