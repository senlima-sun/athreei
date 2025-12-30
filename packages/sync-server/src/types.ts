import { z } from 'zod';

// Request/Response schemas
export const RegisterRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const LoginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const RegisterDeviceRequestSchema = z.object({
  name: z.string().min(1),
  publicKey: z.string(),
});

export const SyncPushRequestSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().uuid().optional(),
      itemType: z.enum(['permission', 'session', 'audit_log', 'settings']),
      encryptedData: z.string(),
      version: z.number().int().optional(),
      deleted: z.boolean().optional(),
    })
  ),
  deviceId: z.string().uuid(),
});

export const SyncSettingsSchema = z.object({
  syncPermissions: z.boolean().optional(),
  syncAuditLog: z.boolean().optional(),
  syncSessions: z.boolean().optional(),
  syncSettings: z.boolean().optional(),
  auditLogRetentionDays: z.number().int().positive().optional(),
});

// Trace schemas
export const TraceUploadItemSchema = z.object({
  requestId: z.string().uuid(),
  namespaceId: z.string().uuid().optional(),
  mcpServerId: z.string().uuid().optional(),
  endpointId: z.string().uuid().optional(),
  toolName: z.string().min(1),
  encryptedPayload: z.string(), // Base64 encoded encrypted payload
  status: z.enum(['success', 'error']),
  durationMs: z.number().int().optional(),
  createdAt: z.string().datetime().optional(),
});

export const TraceUploadRequestSchema = z.object({
  traces: z.array(TraceUploadItemSchema).min(1).max(100),
});

export const TraceQuerySchema = z.object({
  endpoint: z.string().uuid().optional(),
  namespace: z.string().uuid().optional(),
  mcpServer: z.string().uuid().optional(),
  tool: z.string().optional(),
  status: z.enum(['success', 'error']).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const TraceBulkDeleteSchema = z.object({
  traceIds: z.array(z.string().uuid()).min(1).max(100).optional(),
  before: z.string().datetime().optional(),
  namespace: z.string().uuid().optional(),
  endpoint: z.string().uuid().optional(),
});

export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type RegisterDeviceRequest = z.infer<typeof RegisterDeviceRequestSchema>;
export type SyncPushRequest = z.infer<typeof SyncPushRequestSchema>;
export type SyncSettingsUpdate = z.infer<typeof SyncSettingsSchema>;
export type TraceUploadItem = z.infer<typeof TraceUploadItemSchema>;
export type TraceUploadRequest = z.infer<typeof TraceUploadRequestSchema>;
export type TraceQuery = z.infer<typeof TraceQuerySchema>;
export type TraceBulkDelete = z.infer<typeof TraceBulkDeleteSchema>;

// Response types
export interface AuthResponse {
  token: string;
  accountId: string;
  email: string;
}

export interface DeviceResponse {
  id: string;
  name: string;
  publicKey: string;
  lastSeen: string | null;
  createdAt: string;
}

export interface SyncItemResponse {
  id: string;
  itemType: string;
  encryptedData: string;
  version: number;
  updatedAt: string;
  deletedAt: string | null;
  deviceId: string;
}

export interface SyncPullResponse {
  items: SyncItemResponse[];
  cursor: string | null;
  hasMore: boolean;
}

export interface SyncPushResponse {
  success: boolean;
  conflicts?: ConflictResponse[];
  synced: number;
}

export interface ConflictResponse {
  itemId: string;
  serverVersion: number;
  clientVersion: number;
  serverData: SyncItemResponse;
}

export interface SyncSettingsResponse {
  syncPermissions: boolean;
  syncAuditLog: boolean;
  syncSessions: boolean;
  syncSettings: boolean;
  auditLogRetentionDays: number;
}

export interface ErrorResponse {
  error: string;
  details?: string;
}

// Trace response types
export interface TraceResponse {
  id: string;
  namespaceId: string | null;
  mcpServerId: string | null;
  endpointId: string | null;
  toolName: string;
  requestId: string;
  encryptedPayload: string; // Base64 encoded
  status: 'success' | 'error';
  durationMs: number | null;
  createdAt: string;
}

export interface TraceListResponse {
  traces: TraceResponse[];
  total: number;
  hasMore: boolean;
}

export interface TraceUploadResponse {
  success: boolean;
  uploaded: number;
  failed: number;
  errors?: string[];
}

export interface TraceBulkDeleteResponse {
  success: boolean;
  deleted: number;
}

// JWT payload
export interface JwtPayload {
  accountId: string;
  email: string;
  iat?: number;
  exp?: number;
}

// Context extension for Hono
export interface AuthContext {
  accountId: string;
  email: string;
}
