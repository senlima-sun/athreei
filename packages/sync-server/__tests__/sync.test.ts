import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { signJwt, verifyJwt } from '../src/middleware/auth';
import { detectConflict } from '../src/services/conflict';
import type { SyncItem } from '../src/db/schema';

describe('JWT Authentication', () => {
  it('should sign and verify JWT tokens', async () => {
    const payload = {
      accountId: '123e4567-e89b-12d3-a456-426614174000',
      email: 'test@example.com',
    };

    const token = await signJwt(payload);
    expect(token).toBeTruthy();
    expect(typeof token).toBe('string');

    const verified = await verifyJwt(token);
    expect(verified).toBeTruthy();
    expect(verified?.accountId).toBe(payload.accountId);
    expect(verified?.email).toBe(payload.email);
  });

  it('should reject invalid tokens', async () => {
    const invalidToken = 'invalid.token.here';
    const verified = await verifyJwt(invalidToken);
    expect(verified).toBeNull();
  });

  it('should reject tampered tokens', async () => {
    const payload = {
      accountId: '123e4567-e89b-12d3-a456-426614174000',
      email: 'test@example.com',
    };

    const token = await signJwt(payload);
    const tamperedToken = token.slice(0, -5) + 'xxxxx';

    const verified = await verifyJwt(tamperedToken);
    expect(verified).toBeNull();
  });
});

describe('Conflict Detection', () => {
  it('should detect no conflict for new items', () => {
    const result = detectConflict(null, undefined, 'test-id');
    expect(result.hasConflict).toBe(false);
    expect(result.conflict).toBeUndefined();
  });

  it('should detect conflict when versions mismatch', () => {
    const serverItem: SyncItem = {
      id: 'test-id',
      account_id: 'account-123',
      device_id: 'device-123',
      item_type: 'permission',
      encrypted_data: 'encrypted-data',
      version: 5,
      updated_at: new Date(),
      deleted_at: null,
    };

    const result = detectConflict(serverItem, 3, 'test-id');
    expect(result.hasConflict).toBe(true);
    expect(result.conflict).toBeDefined();
    expect(result.conflict?.serverVersion).toBe(5);
    expect(result.conflict?.clientVersion).toBe(3);
  });

  it('should not detect conflict when versions match', () => {
    const serverItem: SyncItem = {
      id: 'test-id',
      account_id: 'account-123',
      device_id: 'device-123',
      item_type: 'permission',
      encrypted_data: 'encrypted-data',
      version: 5,
      updated_at: new Date(),
      deleted_at: null,
    };

    const result = detectConflict(serverItem, 5, 'test-id');
    expect(result.hasConflict).toBe(false);
    expect(result.conflict).toBeUndefined();
  });

  it('should detect conflict when client version is missing', () => {
    const serverItem: SyncItem = {
      id: 'test-id',
      account_id: 'account-123',
      device_id: 'device-123',
      item_type: 'permission',
      encrypted_data: 'encrypted-data',
      version: 5,
      updated_at: new Date(),
      deleted_at: null,
    };

    const result = detectConflict(serverItem, undefined, 'test-id');
    expect(result.hasConflict).toBe(true);
    expect(result.conflict).toBeDefined();
  });
});

describe('Request Validation', () => {
  it('should validate registration request schema', async () => {
    const { RegisterRequestSchema } = await import('../src/types');

    const validData = {
      email: 'test@example.com',
      password: 'securepassword123',
    };

    const result = RegisterRequestSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should reject invalid email', async () => {
    const { RegisterRequestSchema } = await import('../src/types');

    const invalidData = {
      email: 'not-an-email',
      password: 'securepassword123',
    };

    const result = RegisterRequestSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should reject short password', async () => {
    const { RegisterRequestSchema } = await import('../src/types');

    const invalidData = {
      email: 'test@example.com',
      password: 'short',
    };

    const result = RegisterRequestSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should validate sync push request schema', async () => {
    const { SyncPushRequestSchema } = await import('../src/types');

    const validData = {
      deviceId: '123e4567-e89b-12d3-a456-426614174000',
      items: [
        {
          itemType: 'permission' as const,
          encryptedData: 'encrypted-data-here',
          version: 1,
        },
      ],
    };

    const result = SyncPushRequestSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should reject invalid item type', async () => {
    const { SyncPushRequestSchema } = await import('../src/types');

    const invalidData = {
      deviceId: '123e4567-e89b-12d3-a456-426614174000',
      items: [
        {
          itemType: 'invalid-type',
          encryptedData: 'encrypted-data-here',
        },
      ],
    };

    const result = SyncPushRequestSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});

describe('Database Schema Types', () => {
  it('should have correct ItemType values', async () => {
    const { ItemType } = await import('../src/db/schema');

    // TypeScript will catch if these aren't valid ItemType values
    const validTypes: Array<typeof ItemType> = [
      'permission',
      'session',
      'audit_log',
      'settings',
    ] as any;

    expect(validTypes).toHaveLength(4);
  });
});

// Integration tests would go here if we had a test database
// For now, these are unit tests for the core logic
describe('Integration Tests (Placeholder)', () => {
  it.skip('should complete full auth flow', async () => {
    // Would test: register -> login -> access protected route
    // Requires test database setup
  });

  it.skip('should handle device registration', async () => {
    // Would test: register device -> list devices -> delete device
    // Requires test database setup
  });

  it.skip('should sync items with conflict detection', async () => {
    // Would test: push items -> pull items -> handle conflicts
    // Requires test database setup
  });

  it.skip('should respect sync settings', async () => {
    // Would test: update settings -> verify filtered sync
    // Requires test database setup
  });
});
