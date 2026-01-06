/**
 * API Validation Schemas
 *
 * Re-exports all Zod validation schemas used by API routes.
 */

// MCP Servers
export {
  transportTypes,
  statusTypes,
  createServerSchema,
  updateServerSchema,
  listQuerySchema,
  type TransportType,
  type StatusType,
  type CreateServerInput,
  type UpdateServerInput,
  type ListServersQuery,
} from "./mcp-servers"

// Namespaces
export {
  createNamespaceSchema,
  updateNamespaceSchema,
  addServerSchema,
  updateServerMappingSchema,
  type CreateNamespaceInput,
  type UpdateNamespaceInput,
  type AddServerInput,
  type UpdateServerMappingInput,
} from "./namespaces"

// Endpoints
export {
  authTypes,
  endpointStatusTypes,
  createEndpointSchema,
  updateEndpointSchema,
  type AuthType,
  type EndpointStatusType,
  type CreateEndpointInput,
  type UpdateEndpointInput,
} from "./endpoints"

// API Keys
export { createApiKeySchema, type CreateApiKeyInput } from "./api-keys"

// Gateway
export {
  getConfigQuerySchema,
  postTracesSchema,
  type GetConfigQuery,
  type PostTracesInput,
  type TraceInput,
} from "./gateway"

// Organizations
export {
  memberRoles,
  createOrganizationSchema,
  updateOrganizationSchema,
  inviteMemberSchema,
  type MemberRole,
  type CreateOrganizationInput,
  type UpdateOrganizationInput,
  type InviteMemberInput,
} from "./organizations"

// Tools
export {
  listToolsQuerySchema,
  updateToolSchema,
  type ListToolsQuery,
  type UpdateToolInput,
} from "./tools"

// Traces
export {
  traceStatusTypes,
  listTracesQuerySchema,
  traceIdParamSchema,
  type TraceStatusType,
  type ListTracesQuery,
  type TraceIdParam,
} from "./traces"

// Registry
export { registryQuerySchema, type RegistryQuery } from "./registry"

// OAuth
export {
  oauthProviders,
  connectOAuthSchema,
  getTokenSchema,
  deleteTokenQuerySchema,
  oauthConnectionSchema,
  type OAuthProvider,
  type ConnectOAuthInput,
  type GetTokenInput,
  type DeleteTokenQuery,
  type OAuthConnection,
} from "./oauth"
