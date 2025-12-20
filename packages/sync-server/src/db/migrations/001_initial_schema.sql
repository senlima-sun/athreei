-- Initial schema for athreei sync server
-- E2E encrypted data sync with conflict resolution

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Accounts table
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_accounts_email ON accounts(email);

-- Devices table (each user can have multiple devices)
CREATE TABLE IF NOT EXISTS devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  public_key TEXT NOT NULL,
  last_seen TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_devices_account_id ON devices(account_id);

-- Sync items (encrypted blobs)
CREATE TABLE IF NOT EXISTS sync_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('permission', 'session', 'audit_log', 'settings')),
  encrypted_data TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(account_id, id)
);

CREATE INDEX idx_sync_items_account_id ON sync_items(account_id);
CREATE INDEX idx_sync_items_device_id ON sync_items(device_id);
CREATE INDEX idx_sync_items_type ON sync_items(item_type);
CREATE INDEX idx_sync_items_updated_at ON sync_items(updated_at);
CREATE INDEX idx_sync_items_deleted_at ON sync_items(deleted_at) WHERE deleted_at IS NOT NULL;

-- Sync state (for cursor-based sync)
CREATE TABLE IF NOT EXISTS sync_state (
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  last_sync TIMESTAMPTZ,
  sync_cursor TEXT,
  PRIMARY KEY (account_id, device_id)
);

-- Sync settings
CREATE TABLE IF NOT EXISTS sync_settings (
  account_id UUID PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  sync_permissions BOOLEAN DEFAULT true,
  sync_audit_log BOOLEAN DEFAULT true,
  sync_sessions BOOLEAN DEFAULT true,
  sync_settings BOOLEAN DEFAULT true,
  audit_log_retention_days INTEGER DEFAULT 90 CHECK (audit_log_retention_days > 0)
);

-- Trigger to update updated_at on accounts
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to automatically create default sync settings
CREATE OR REPLACE FUNCTION create_default_sync_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO sync_settings (account_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER create_sync_settings_on_account AFTER INSERT ON accounts
  FOR EACH ROW EXECUTE FUNCTION create_default_sync_settings();
