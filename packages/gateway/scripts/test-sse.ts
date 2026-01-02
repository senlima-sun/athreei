/**
 * SSE Connection Test Script
 *
 * Tests the gateway SSE transport by:
 * 1. Connecting to the SSE endpoint
 * 2. Waiting for the session endpoint
 * 3. Sending MCP requests (initialize, tools/list)
 *
 * Usage:
 *   bun run scripts/test-sse.ts [gateway-url]
 *
 * Default gateway URL: http://localhost:3000
 */

const GATEWAY_URL = process.argv[2] || "http://localhost:3000";

interface McpResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: unknown;
  error?: { code: number; message: string };
}

async function testSseConnection(): Promise<void> {
  console.log(`\n🔌 Testing SSE connection to ${GATEWAY_URL}\n`);

  // Step 1: Check if gateway is running
  console.log("1. Checking gateway health...");
  try {
    const healthRes = await fetch(`${GATEWAY_URL}/mcp/health`);
    if (!healthRes.ok) {
      throw new Error(`Health check failed: ${healthRes.status}`);
    }
    console.log("   ✅ Gateway is running\n");
  } catch (error) {
    console.error("   ❌ Gateway not reachable:", error);
    console.log("\n   Make sure gateway is running with:");
    console.log("   bun run dev -- --transport sse --port 3000\n");
    process.exit(1);
  }

  // Step 2: Connect to SSE endpoint
  console.log("2. Connecting to SSE endpoint...");

  let sessionEndpoint: string | null = null;

  const ssePromise = new Promise<string>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("SSE connection timeout (10s)"));
    }, 10000);

    fetch(`${GATEWAY_URL}/mcp/sse`, {
      headers: {
        Accept: "text/event-stream",
      },
    })
      .then(async (res) => {
        if (!res.ok) {
          clearTimeout(timeout);
          reject(new Error(`SSE connection failed: ${res.status}`));
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) {
          clearTimeout(timeout);
          reject(new Error("No response body"));
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("event: endpoint")) {
              // Next line should be the data
              continue;
            }
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data.startsWith("/mcp/messages")) {
                clearTimeout(timeout);
                resolve(data);
                reader.cancel();
                return;
              }
            }
          }
        }
      })
      .catch((err) => {
        clearTimeout(timeout);
        reject(err);
      });
  });

  try {
    sessionEndpoint = await ssePromise;
    console.log(`   ✅ Session created: ${sessionEndpoint}\n`);
  } catch (error) {
    console.error("   ❌ SSE connection failed:", error);
    process.exit(1);
  }

  // Step 3: Send initialize request
  console.log("3. Sending initialize request...");
  const messagesUrl = `${GATEWAY_URL}${sessionEndpoint}`;

  try {
    const initRes = await fetch(messagesUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "test-client", version: "1.0.0" },
        },
      }),
    });

    const initData = (await initRes.json()) as McpResponse;

    if (initData.error) {
      console.error("   ❌ Initialize failed:", initData.error);
      process.exit(1);
    }

    console.log("   ✅ Initialize response:");
    console.log(`      Protocol: ${(initData.result as Record<string, unknown>)?.protocolVersion}`);
    console.log(`      Server: ${JSON.stringify((initData.result as Record<string, unknown>)?.serverInfo)}\n`);
  } catch (error) {
    console.error("   ❌ Initialize request failed:", error);
    process.exit(1);
  }

  // Step 4: Send tools/list request
  console.log("4. Sending tools/list request...");

  try {
    const toolsRes = await fetch(messagesUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/list",
      }),
    });

    const toolsData = (await toolsRes.json()) as McpResponse;

    if (toolsData.error) {
      console.error("   ❌ Tools list failed:", toolsData.error);
      process.exit(1);
    }

    const tools = (toolsData.result as { tools: Array<{ name: string }> })?.tools || [];
    console.log(`   ✅ Found ${tools.length} tools:`);

    if (tools.length > 0) {
      for (const tool of tools.slice(0, 10)) {
        console.log(`      - ${tool.name}`);
      }
      if (tools.length > 10) {
        console.log(`      ... and ${tools.length - 10} more`);
      }
    } else {
      console.log("      (no tools available - check MCP server connections)");
    }
  } catch (error) {
    console.error("   ❌ Tools list request failed:", error);
    process.exit(1);
  }

  console.log("\n✅ All tests passed!\n");
}

testSseConnection().catch(console.error);
