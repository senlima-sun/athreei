/**
 * Tests for Traces API Routes
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  TraceUploadRequestSchema,
  TraceQuerySchema,
  TraceBulkDeleteSchema,
  TraceUploadItemSchema,
} from '../src/types';

describe('Trace Schemas', () => {
  describe('TraceUploadItemSchema', () => {
    it('validates a valid trace upload item', () => {
      const validItem = {
        requestId: '123e4567-e89b-12d3-a456-426614174000',
        toolName: 'screenshot',
        encryptedPayload: 'base64encrypteddata==',
        status: 'success' as const,
        durationMs: 150,
      };

      const result = TraceUploadItemSchema.safeParse(validItem);
      expect(result.success).toBe(true);
    });

    it('validates item with optional fields', () => {
      const itemWithOptional = {
        requestId: '123e4567-e89b-12d3-a456-426614174000',
        namespaceId: '223e4567-e89b-12d3-a456-426614174001',
        mcpServerId: '323e4567-e89b-12d3-a456-426614174002',
        endpointId: '423e4567-e89b-12d3-a456-426614174003',
        toolName: 'click',
        encryptedPayload: 'encrypteddata==',
        status: 'error' as const,
        durationMs: 200,
        createdAt: '2024-12-30T10:00:00.000Z',
      };

      const result = TraceUploadItemSchema.safeParse(itemWithOptional);
      expect(result.success).toBe(true);
    });

    it('rejects invalid requestId format', () => {
      const invalidItem = {
        requestId: 'not-a-uuid',
        toolName: 'screenshot',
        encryptedPayload: 'data',
        status: 'success' as const,
      };

      const result = TraceUploadItemSchema.safeParse(invalidItem);
      expect(result.success).toBe(false);
    });

    it('rejects empty toolName', () => {
      const invalidItem = {
        requestId: '123e4567-e89b-12d3-a456-426614174000',
        toolName: '',
        encryptedPayload: 'data',
        status: 'success' as const,
      };

      const result = TraceUploadItemSchema.safeParse(invalidItem);
      expect(result.success).toBe(false);
    });

    it('rejects invalid status', () => {
      const invalidItem = {
        requestId: '123e4567-e89b-12d3-a456-426614174000',
        toolName: 'screenshot',
        encryptedPayload: 'data',
        status: 'pending',
      };

      const result = TraceUploadItemSchema.safeParse(invalidItem);
      expect(result.success).toBe(false);
    });
  });

  describe('TraceUploadRequestSchema', () => {
    it('validates a valid trace upload request', () => {
      const validRequest = {
        traces: [
          {
            requestId: '123e4567-e89b-12d3-a456-426614174000',
            toolName: 'screenshot',
            encryptedPayload: 'base64data==',
            status: 'success' as const,
          },
          {
            requestId: '223e4567-e89b-12d3-a456-426614174001',
            toolName: 'click',
            encryptedPayload: 'base64data==',
            status: 'error' as const,
          },
        ],
      };

      const result = TraceUploadRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('rejects empty traces array', () => {
      const invalidRequest = {
        traces: [],
      };

      const result = TraceUploadRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('rejects more than 100 traces', () => {
      const traces = Array.from({ length: 101 }, (_, i) => ({
        requestId: `123e4567-e89b-12d3-a456-${String(i).padStart(12, '0')}`,
        toolName: 'screenshot',
        encryptedPayload: 'data',
        status: 'success' as const,
      }));

      const result = TraceUploadRequestSchema.safeParse({ traces });
      expect(result.success).toBe(false);
    });
  });

  describe('TraceQuerySchema', () => {
    it('validates an empty query (uses defaults)', () => {
      const result = TraceQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(50);
        expect(result.data.offset).toBe(0);
      }
    });

    it('validates query with all filters', () => {
      const validQuery = {
        endpoint: '123e4567-e89b-12d3-a456-426614174000',
        namespace: '223e4567-e89b-12d3-a456-426614174001',
        mcpServer: '323e4567-e89b-12d3-a456-426614174002',
        tool: 'screenshot',
        status: 'success' as const,
        from: '2024-12-01T00:00:00.000Z',
        to: '2024-12-31T23:59:59.999Z',
        limit: 25,
        offset: 10,
      };

      const result = TraceQuerySchema.safeParse(validQuery);
      expect(result.success).toBe(true);
    });

    it('coerces string limit and offset to numbers', () => {
      const query = {
        limit: '25',
        offset: '10',
      };

      const result = TraceQuerySchema.safeParse(query);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(25);
        expect(result.data.offset).toBe(10);
      }
    });

    it('rejects limit greater than 100', () => {
      const result = TraceQuerySchema.safeParse({ limit: 150 });
      expect(result.success).toBe(false);
    });

    it('rejects negative offset', () => {
      const result = TraceQuerySchema.safeParse({ offset: -5 });
      expect(result.success).toBe(false);
    });

    it('validates status filter values', () => {
      expect(TraceQuerySchema.safeParse({ status: 'success' }).success).toBe(true);
      expect(TraceQuerySchema.safeParse({ status: 'error' }).success).toBe(true);
      expect(TraceQuerySchema.safeParse({ status: 'pending' }).success).toBe(false);
    });
  });

  describe('TraceBulkDeleteSchema', () => {
    it('validates delete by traceIds', () => {
      const validRequest = {
        traceIds: [
          '123e4567-e89b-12d3-a456-426614174000',
          '223e4567-e89b-12d3-a456-426614174001',
        ],
      };

      const result = TraceBulkDeleteSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('validates delete by date', () => {
      const validRequest = {
        before: '2024-12-01T00:00:00.000Z',
      };

      const result = TraceBulkDeleteSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('validates delete by namespace', () => {
      const validRequest = {
        namespace: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = TraceBulkDeleteSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('validates delete by endpoint', () => {
      const validRequest = {
        endpoint: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = TraceBulkDeleteSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('validates combined filters', () => {
      const validRequest = {
        before: '2024-12-01T00:00:00.000Z',
        namespace: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = TraceBulkDeleteSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('rejects more than 100 traceIds', () => {
      const traceIds = Array.from(
        { length: 101 },
        (_, i) => `123e4567-e89b-12d3-a456-${String(i).padStart(12, '0')}`
      );

      const result = TraceBulkDeleteSchema.safeParse({ traceIds });
      expect(result.success).toBe(false);
    });

    it('rejects invalid UUID in traceIds', () => {
      const result = TraceBulkDeleteSchema.safeParse({
        traceIds: ['not-a-uuid'],
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('Database Schema Types', () => {
  it('should have TraceStatus type with correct values', async () => {
    // Import the type from schema
    const { traceStatusEnum } = await import('../src/db/schema');

    // Check enum values
    expect(traceStatusEnum.enumValues).toContain('success');
    expect(traceStatusEnum.enumValues).toContain('error');
    expect(traceStatusEnum.enumValues).toHaveLength(2);
  });
});

describe('Helper Functions', () => {
  describe('Base64 encoding/decoding', () => {
    // Testing the base64 helper logic that will be used in the routes

    it('roundtrips Uint8Array to base64 and back', () => {
      const original = new Uint8Array([0, 1, 2, 3, 255, 254, 253]);

      // Encode to base64
      let binary = '';
      for (let i = 0; i < original.length; i++) {
        binary += String.fromCharCode(original[i]);
      }
      const base64 = btoa(binary);

      // Decode from base64
      const decoded = atob(base64);
      const bytes = new Uint8Array(decoded.length);
      for (let i = 0; i < decoded.length; i++) {
        bytes[i] = decoded.charCodeAt(i);
      }

      expect(bytes).toEqual(original);
    });

    it('handles empty array', () => {
      const original = new Uint8Array([]);

      let binary = '';
      for (let i = 0; i < original.length; i++) {
        binary += String.fromCharCode(original[i]);
      }
      const base64 = btoa(binary);

      expect(base64).toBe('');
    });
  });
});

// Integration tests would require database setup
describe('Integration Tests (Placeholder)', () => {
  it.skip('should upload traces and retrieve them', async () => {
    // Would test: POST /api/traces -> GET /api/traces
    // Requires test database setup
  });

  it.skip('should filter traces by namespace', async () => {
    // Would test: GET /api/traces?namespace=xxx
    // Requires test database setup
  });

  it.skip('should filter traces by status', async () => {
    // Would test: GET /api/traces?status=error
    // Requires test database setup
  });

  it.skip('should get single trace by UUID', async () => {
    // Would test: GET /api/traces/:uuid
    // Requires test database setup
  });

  it.skip('should bulk delete traces', async () => {
    // Would test: DELETE /api/traces
    // Requires test database setup
  });

  it.skip('should require at least one filter for bulk delete', async () => {
    // Would test: DELETE /api/traces with empty body returns 400
    // Requires test database setup
  });

  it.skip('should require authentication for all endpoints', async () => {
    // Would test: All endpoints return 401 without auth header
    // Requires test database setup
  });
});
