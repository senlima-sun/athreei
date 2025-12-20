export interface Account {
  id: string;
  email: string;
  password_hash: string;
  created_at: Date;
  updated_at: Date;
}

export interface Device {
  id: string;
  account_id: string;
  name: string;
  public_key: string;
  last_seen: Date | null;
  created_at: Date;
}

export type ItemType = 'permission' | 'session' | 'audit_log' | 'settings';

export interface SyncItem {
  id: string;
  account_id: string;
  device_id: string;
  item_type: ItemType;
  encrypted_data: string;
  version: number;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface SyncState {
  account_id: string;
  device_id: string;
  last_sync: Date | null;
  sync_cursor: string | null;
}

export interface SyncSettings {
  account_id: string;
  sync_permissions: boolean;
  sync_audit_log: boolean;
  sync_sessions: boolean;
  sync_settings: boolean;
  audit_log_retention_days: number;
}
