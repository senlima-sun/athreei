import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { eq, and, gte, lte, desc, sql, inArray } from 'drizzle-orm';
import {
  TraceUploadRequestSchema,
  TraceQuerySchema,
  TraceBulkDeleteSchema,
  type TraceResponse,
  type TraceListResponse,
  type TraceUploadResponse,
  type TraceBulkDeleteResponse,
  type ErrorResponse,
} from '../types';
import { getDb } from '../db/client';
import * as schema from '../db/schema';
import { authMiddleware, getAuthContext } from '../middleware/auth';

const traces = new Hono();

// All trace routes require authentication
traces.use('*', authMiddleware);

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

/**
 * Helper to convert trace from DB to response format
 */
function traceToResponse(trace: schema.Trace): TraceResponse {
  return {
    id: trace.id,
    namespaceId: trace.namespace_id,
    mcpServerId: trace.mcp_server_id,
    endpointId: trace.endpoint_id,
    toolName: trace.tool_name,
    requestId: trace.request_id,
    encryptedPayload: uint8ArrayToBase64(trace.encrypted_payload),
    status: trace.status,
    durationMs: trace.duration_ms,
    createdAt: trace.created_at.toISOString(),
  };
}

/**
 * POST /traces - Upload traces from Gateway (batch)
 */
traces.post(
  '/',
  zValidator('json', TraceUploadRequestSchema),
  async (c) => {
    try {
      const { accountId } = getAuthContext(c);
      const { traces: traceItems } = c.req.valid('json');
      const db = getDb();

      const errors: string[] = [];
      let uploaded = 0;

      // Insert traces in batch
      const tracesToInsert = traceItems.map((item) => ({
        account_id: accountId,
        namespace_id: item.namespaceId ?? null,
        mcp_server_id: item.mcpServerId ?? null,
        endpoint_id: item.endpointId ?? null,
        tool_name: item.toolName,
        request_id: item.requestId,
        encrypted_payload: base64ToUint8Array(item.encryptedPayload),
        status: item.status as 'success' | 'error',
        duration_ms: item.durationMs ?? null,
        created_at: item.createdAt ? new Date(item.createdAt) : new Date(),
      }));

      try {
        await db.insert(schema.traces).values(tracesToInsert);
        uploaded = tracesToInsert.length;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Batch insert failed: ${message}`);
      }

      const response: TraceUploadResponse = {
        success: errors.length === 0,
        uploaded,
        failed: traceItems.length - uploaded,
        errors: errors.length > 0 ? errors : undefined,
      };

      return c.json(response, errors.length === 0 ? 200 : 207);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to upload traces';
      return c.json<ErrorResponse>({ error: message }, 500);
    }
  }
);

/**
 * GET /traces - List traces (paginated with filters)
 */
traces.get(
  '/',
  zValidator('query', TraceQuerySchema),
  async (c) => {
    try {
      const { accountId } = getAuthContext(c);
      const query = c.req.valid('query');
      const db = getDb();

      // Build conditions
      const conditions = [eq(schema.traces.account_id, accountId)];

      if (query.endpoint) {
        conditions.push(eq(schema.traces.endpoint_id, query.endpoint));
      }
      if (query.namespace) {
        conditions.push(eq(schema.traces.namespace_id, query.namespace));
      }
      if (query.mcpServer) {
        conditions.push(eq(schema.traces.mcp_server_id, query.mcpServer));
      }
      if (query.tool) {
        conditions.push(eq(schema.traces.tool_name, query.tool));
      }
      if (query.status) {
        conditions.push(eq(schema.traces.status, query.status));
      }
      if (query.from) {
        conditions.push(gte(schema.traces.created_at, new Date(query.from)));
      }
      if (query.to) {
        conditions.push(lte(schema.traces.created_at, new Date(query.to)));
      }

      const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

      // Get total count
      const [countResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(schema.traces)
        .where(whereClause);

      const total = countResult?.count ?? 0;

      // Get traces with pagination
      const traceResults = await db
        .select()
        .from(schema.traces)
        .where(whereClause)
        .orderBy(desc(schema.traces.created_at))
        .limit(query.limit)
        .offset(query.offset);

      const response: TraceListResponse = {
        traces: traceResults.map(traceToResponse),
        total,
        hasMore: query.offset + traceResults.length < total,
      };

      return c.json(response, 200);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to list traces';
      return c.json<ErrorResponse>({ error: message }, 500);
    }
  }
);

/**
 * GET /traces/:uuid - Get single trace
 */
traces.get('/:uuid', async (c) => {
  try {
    const { accountId } = getAuthContext(c);
    const traceId = c.req.param('uuid');
    const db = getDb();

    const trace = await db.query.traces.findFirst({
      where: and(
        eq(schema.traces.id, traceId),
        eq(schema.traces.account_id, accountId)
      ),
    });

    if (!trace) {
      return c.json<ErrorResponse>({ error: 'Trace not found' }, 404);
    }

    return c.json<TraceResponse>(traceToResponse(trace), 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get trace';
    return c.json<ErrorResponse>({ error: message }, 500);
  }
});

/**
 * DELETE /traces - Delete traces (bulk)
 */
traces.delete(
  '/',
  zValidator('json', TraceBulkDeleteSchema),
  async (c) => {
    try {
      const { accountId } = getAuthContext(c);
      const { traceIds, before, namespace, endpoint } = c.req.valid('json');
      const db = getDb();

      // Build conditions
      const conditions = [eq(schema.traces.account_id, accountId)];

      if (traceIds && traceIds.length > 0) {
        conditions.push(inArray(schema.traces.id, traceIds));
      }
      if (before) {
        conditions.push(lte(schema.traces.created_at, new Date(before)));
      }
      if (namespace) {
        conditions.push(eq(schema.traces.namespace_id, namespace));
      }
      if (endpoint) {
        conditions.push(eq(schema.traces.endpoint_id, endpoint));
      }

      // Require at least one filter beyond accountId to prevent accidental mass deletion
      if (conditions.length === 1) {
        return c.json<ErrorResponse>(
          { error: 'At least one filter (traceIds, before, namespace, or endpoint) is required' },
          400
        );
      }

      const whereClause = and(...conditions);

      // Delete and get count
      const result = await db
        .delete(schema.traces)
        .where(whereClause!)
        .returning({ id: schema.traces.id });

      const response: TraceBulkDeleteResponse = {
        success: true,
        deleted: result.length,
      };

      return c.json(response, 200);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete traces';
      return c.json<ErrorResponse>({ error: message }, 500);
    }
  }
);

export default traces;
