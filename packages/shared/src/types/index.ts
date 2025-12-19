/**
 * Shared type definitions for athreei
 */

// Permission model
export type PermissionLevel = "denied" | "allowed" | "ask";

export interface Permission {
  id: string;
  origin: string;
  tool: string;
  allowed: PermissionLevel;
  createdAt: number;
  updatedAt: number;
}

// Audit log
export type AuditStatus = "success" | "denied" | "error";

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  aiApp?: string;
  tool: string;
  origin?: string;
  args?: Record<string, unknown>;
  result?: unknown;
  status: AuditStatus;
}

// Session tracking
export interface Session {
  id: string;
  tabId?: number;
  origin: string;
  startedAt: number;
  endedAt?: number;
  metadata?: Record<string, unknown>;
}

// Native messaging types
export interface NativeMessage {
  id: string;
  type: "request" | "response" | "event";
  payload: unknown;
}

export interface NativeRequest extends NativeMessage {
  type: "request";
  method: string;
  payload: Record<string, unknown>;
}

export interface NativeResponse extends NativeMessage {
  type: "response";
  success: boolean;
  payload: unknown;
  error?: string;
}

// aiii:* event types
export interface AiiiEventDetail {
  requestId?: string;
  tool?: string;
  args?: Record<string, unknown>;
  success?: boolean;
  result?: unknown;
  error?: string;
}

export interface AiiiToolRegistration {
  tool: string;
  description: string;
  parameters: Record<
    string,
    {
      type: string;
      required?: boolean;
      default?: unknown;
      description?: string;
    }
  >;
}

// Browser tool types
export interface TabInfo {
  id: number;
  url: string;
  title: string;
  active: boolean;
  windowId: number;
}

export interface ElementInfo {
  selector: string;
  role: string;
  label?: string;
  text?: string;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  enabled: boolean;
  visible: boolean;
}

// MCP client info (from protocol)
export interface MCPClientInfo {
  name: string;
  version: string;
}
