/**
 * Route aggregator
 *
 * Exports all route modules for use in the main app.
 */

export { default as healthRoutes } from "./health"
export { default as authRoutes } from "./auth"
export { default as configRoutes } from "./config"
export { default as organizationsRoutes } from "./organizations"
export { default as endpointsRoutes } from "./endpoints"
export { default as apiKeysRoutes } from "./api-keys"
export { default as mcpServersRoutes } from "./mcp-servers"
export { default as namespacesRoutes } from "./namespaces"
export { default as gatewayRoutes } from "./gateway"
export { default as tracesRoutes } from "./traces"
export { default as toolsRoutes } from "./tools"
export { default as registryRoutes } from "./registry"
export { default as oauthRoutes } from "./oauth"
