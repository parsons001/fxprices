import { test } from "node:test";
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createFxMcpServer } from "../lib/mcp/server.js";
import { handleMcpRequest } from "../lib/mcp/http-handler.js";

function fakeDatabase(collections) {
  const calls = [];
  return {
    calls,
    collection(name) {
      return {
        countDocuments: async (filter) => {
          calls.push({ method: "countDocuments", name, filter });
          return collections[name]?.length ?? 0;
        },
        aggregate: (pipeline) => ({
          toArray: async () => {
            calls.push({ method: "aggregate", name, pipeline });
            return [];
          },
        }),
        find: (filter, options) => {
          calls.push({ method: "find", name, filter, options });
          let skip = 0;
          let limit = Infinity;
          const cursor = {
            sort() {
              return cursor;
            },
            skip(value) {
              skip = value;
              return cursor;
            },
            limit(value) {
              limit = value;
              return cursor;
            },
            async toArray() {
              return (collections[name] ?? []).slice(skip, skip + limit);
            },
          };
          return cursor;
        },
      };
    },
  };
}

async function invokeTool(server, name, args) {
  const client = new Client({ name: "fx-test-client", version: "1.0.0" });
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);
  try {
    return await client.callTool({ name, arguments: args });
  } finally {
    await client.close();
    await server.close();
  }
}

test("MCP snapshot tool pages both read-only quote collections", async () => {
  const snapshot = {
    _id: { toString: () => "snapshot-1" },
    currency: "EUR",
    amount: 500,
    fetchedAt: new Date("2026-10-16T12:00:00.000Z"),
    quotes: [{ provider: "Wise", feeGbp: 1.2 }],
  };
  const db = fakeDatabase({
    conversion_snapshots: [snapshot, snapshot],
    send_snapshots: [snapshot],
  });
  const result = await invokeTool(
    createFxMcpServer(async () => db),
    "list_quote_snapshots",
    { currency: "EUR", amount: 500, page: 2, pageSize: 1 },
  );
  assert.equal(result.isError, undefined);
  assert.deepEqual(
    result.structuredContent.collections.map((collection) => ({
      collection: collection.collection,
      total: collection.total,
      hasMore: collection.hasMore,
      snapshots: collection.snapshots.length,
    })),
    [
      {
        collection: "conversion_snapshots",
        total: 2,
        hasMore: false,
        snapshots: 1,
      },
      { collection: "send_snapshots", total: 1, hasMore: false, snapshots: 0 },
    ],
  );
  assert.equal(
    result.structuredContent.collections[0].snapshots[0].id,
    "snapshot-1",
  );
  assert.equal(
    db.calls.every((call) => call.method !== "insertOne"),
    true,
  );
});

test("MCP overview exposes collection and market counts", async () => {
  const db = fakeDatabase({
    conversion_snapshots: [],
    send_snapshots: [],
  });
  const result = await invokeTool(
    createFxMcpServer(async () => db),
    "get_quote_database_overview",
    {},
  );
  assert.deepEqual(
    result.structuredContent.collections.map((collection) => [
      collection.collection,
      collection.snapshotCount,
    ]),
    [
      ["conversion_snapshots", 0],
      ["send_snapshots", 0],
    ],
  );
});

test("MCP endpoint is public, speaks stateless Streamable HTTP, and lists read-only tools", async () => {
  const response = await handleMcpRequest(
    new Request("https://example.test/api/mcp", {
      method: "POST",
      headers: {
        Accept: "application/json, text/event-stream",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-03-26",
          capabilities: {},
          clientInfo: { name: "mcp-test", version: "1.0.0" },
        },
      }),
    }),
  );
  assert.equal(response.status, 200);
  const initialized = await response.json();
  assert.equal(initialized.result.serverInfo.name, "fx-prices-readonly");

  const tools = await handleMcpRequest(
    new Request("https://example.test/api/mcp", {
      method: "POST",
      headers: {
        Accept: "application/json, text/event-stream",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/list",
        params: {},
      }),
    }),
  );
  const toolList = await tools.json();
  assert.deepEqual(toolList.result.tools.map((tool) => tool.name).sort(), [
    "get_quote_database_overview",
    "list_quote_snapshots",
  ]);
  assert.ok(
    toolList.result.tools.every((tool) => tool.annotations?.readOnlyHint),
  );
});
