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

export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type RegisterDeviceRequest = z.infer<typeof RegisterDeviceRequestSchema>;
export type SyncPushRequest = z.infer<typeof SyncPushRequestSchema>;
export type SyncSettingsUpdate = z.infer<typeof SyncSettingsSchema>;

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
