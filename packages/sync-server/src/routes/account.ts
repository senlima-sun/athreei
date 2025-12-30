import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import type { ErrorResponse } from '../types';
import { getDb } from '../db/client';
import * as schema from '../db/schema';
import { authMiddleware, getAuthContext } from '../middleware/auth';

const account = new Hono();

// All account routes require authentication
account.use('*', authMiddleware);

/**
 * Helper to convert Uint8Array to base64 string
 */
function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Helper to convert base64 string to Uint8Array
 */
function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Validation schemas
const EncryptionSaltSchema = z.object({
  salt: z.string().min(1), // Base64 encoded salt (16 bytes = ~24 chars)
});

/**
 * GET /account/encryption-salt - Get user's encryption salt
 * Returns the stored salt for trace encryption key derivation
 */
account.get('/encryption-salt', async (c) => {
  try {
    const { accountId } = getAuthContext(c);
    const db = getDb();

    const accountRecord = await db.query.accounts.findFirst({
      where: eq(schema.accounts.id, accountId),
      columns: {
        encryption_salt: true,
      },
    });

    if (!accountRecord) {
      return c.json<ErrorResponse>({ error: 'Account not found' }, 404);
    }

    // Return null if no salt is set (user hasn't set up trace encryption yet)
    if (!accountRecord.encryption_salt) {
      return c.json({ salt: null }, 200);
    }

    return c.json({
      salt: uint8ArrayToBase64(accountRecord.encryption_salt),
    }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get encryption salt';
    return c.json<ErrorResponse>({ error: message }, 500);
  }
});

/**
 * POST /account/encryption-salt - Set user's encryption salt
 * Stores the salt for trace encryption key derivation
 * This should be called once when the user first sets up trace encryption
 */
account.post(
  '/encryption-salt',
  zValidator('json', EncryptionSaltSchema),
  async (c) => {
    try {
      const { accountId } = getAuthContext(c);
      const { salt } = c.req.valid('json');
      const db = getDb();

      // Decode and validate salt length (should be 16 bytes for Argon2)
      const saltBytes = base64ToUint8Array(salt);
      if (saltBytes.length !== 16) {
        return c.json<ErrorResponse>(
          { error: 'Invalid salt length: expected 16 bytes' },
          400
        );
      }

      // Update the account with the encryption salt
      const result = await db
        .update(schema.accounts)
        .set({
          encryption_salt: saltBytes,
          updated_at: new Date(),
        })
        .where(eq(schema.accounts.id, accountId))
        .returning({ id: schema.accounts.id });

      if (result.length === 0) {
        return c.json<ErrorResponse>({ error: 'Account not found' }, 404);
      }

      return c.json({ success: true }, 200);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to set encryption salt';
      return c.json<ErrorResponse>({ error: message }, 500);
    }
  }
);

/**
 * DELETE /account/encryption-salt - Clear user's encryption salt
 * Removes the stored salt (effectively disabling trace decryption)
 */
account.delete('/encryption-salt', async (c) => {
  try {
    const { accountId } = getAuthContext(c);
    const db = getDb();

    const result = await db
      .update(schema.accounts)
      .set({
        encryption_salt: null,
        updated_at: new Date(),
      })
      .where(eq(schema.accounts.id, accountId))
      .returning({ id: schema.accounts.id });

    if (result.length === 0) {
      return c.json<ErrorResponse>({ error: 'Account not found' }, 404);
    }

    return c.json({ success: true }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to clear encryption salt';
    return c.json<ErrorResponse>({ error: message }, 500);
  }
});

export default account;
