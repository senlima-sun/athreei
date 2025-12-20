import * as argon2 from 'argon2';
import {
  createAccount,
  findAccountByEmail,
  deleteAccount,
} from '../db/client';
import { signJwt } from '../middleware/auth';
import type { AuthResponse } from '../types';

export async function registerAccount(
  email: string,
  password: string
): Promise<AuthResponse> {
  // Check if account already exists
  const existing = await findAccountByEmail(email);
  if (existing) {
    throw new Error('Account with this email already exists');
  }

  // Hash password with Argon2
  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MB
    timeCost: 3,
    parallelism: 4,
  });

  // Create account
  const account = await createAccount(email, passwordHash);

  // Generate JWT
  const token = await signJwt({
    accountId: account.id,
    email: account.email,
  });

  return {
    token,
    accountId: account.id,
    email: account.email,
  };
}

export async function loginAccount(
  email: string,
  password: string
): Promise<AuthResponse> {
  // Find account
  const account = await findAccountByEmail(email);
  if (!account) {
    throw new Error('Invalid email or password');
  }

  // Verify password
  const isValid = await argon2.verify(account.password_hash, password);
  if (!isValid) {
    throw new Error('Invalid email or password');
  }

  // Generate JWT
  const token = await signJwt({
    accountId: account.id,
    email: account.email,
  });

  return {
    token,
    accountId: account.id,
    email: account.email,
  };
}

export async function deleteUserAccount(accountId: string): Promise<void> {
  // Delete account (cascade will delete devices, sync items, etc.)
  await deleteAccount(accountId);
}
