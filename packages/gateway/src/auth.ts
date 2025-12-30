/**
 * API Key Authentication
 *
 * Handles API key validation and authentication for Gateway ↔ Platform communication.
 */

import { log } from "./logger.js";

/** API key prefix */
const API_KEY_PREFIX = "ak_";

/** Minimum API key length (prefix + at least 32 chars of random data) */
const MIN_API_KEY_LENGTH = API_KEY_PREFIX.length + 32;

/**
 * Validate API key format
 */
export function validateApiKeyFormat(apiKey: string): {
  valid: boolean;
  error?: string;
} {
  if (!apiKey) {
    return { valid: false, error: "API key is required" };
  }

  if (typeof apiKey !== "string") {
    return { valid: false, error: "API key must be a string" };
  }

  // Check prefix
  if (!apiKey.startsWith(API_KEY_PREFIX)) {
    return {
      valid: false,
      error: `API key must start with "${API_KEY_PREFIX}"`,
    };
  }

  // Check minimum length
  if (apiKey.length < MIN_API_KEY_LENGTH) {
    return { valid: false, error: "API key is too short" };
  }

  // Check for valid base64url characters after prefix
  const keyPart = apiKey.slice(API_KEY_PREFIX.length);
  if (!/^[A-Za-z0-9_-]+$/.test(keyPart)) {
    return {
      valid: false,
      error: "API key contains invalid characters",
    };
  }

  return { valid: true };
}

/**
 * Extract the key prefix (for display/logging without exposing the full key)
 */
export function getKeyPrefix(apiKey: string): string {
  // Return first 12 characters for identification
  return apiKey.slice(0, 12) + "...";
}

/**
 * Create authorization header value
 */
export function createAuthHeader(apiKey: string): string {
  return `Bearer ${apiKey}`;
}

/**
 * Parse authorization header and extract API key
 */
export function parseAuthHeader(header: string): string | null {
  if (!header) {
    return null;
  }

  const parts = header.split(" ");
  if (parts.length !== 2) {
    return null;
  }

  const [scheme, token] = parts;
  if (scheme.toLowerCase() !== "bearer") {
    return null;
  }

  return token;
}

/**
 * Authenticated request options
 */
export interface AuthenticatedRequestOptions {
  apiKey: string;
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  body?: unknown;
  headers?: Record<string, string>;
}

/**
 * Make an authenticated request to the Platform API
 */
export async function authenticatedFetch(
  url: string,
  options: AuthenticatedRequestOptions
): Promise<Response> {
  const { apiKey, method = "GET", body, headers = {} } = options;

  // Validate API key format before making request
  const validation = validateApiKeyFormat(apiKey);
  if (!validation.valid) {
    throw new Error(`Invalid API key: ${validation.error}`);
  }

  const requestHeaders: Record<string, string> = {
    ...headers,
    Authorization: createAuthHeader(apiKey),
    "Content-Type": "application/json",
  };

  const requestOptions: RequestInit = {
    method,
    headers: requestHeaders,
  };

  if (body !== undefined && method !== "GET") {
    requestOptions.body = JSON.stringify(body);
  }

  log.debug(`Making authenticated request: ${method} ${url}`);

  const response = await fetch(url, requestOptions);

  if (response.status === 401) {
    throw new AuthenticationError("Invalid or expired API key");
  }

  if (response.status === 403) {
    throw new AuthorizationError("Access denied");
  }

  return response;
}

/**
 * Authentication error (invalid credentials)
 */
export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthenticationError";
  }
}

/**
 * Authorization error (valid credentials but insufficient permissions)
 */
export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthorizationError";
  }
}
