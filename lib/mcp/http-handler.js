import { timingSafeEqual } from "node:crypto";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createFxMcpServer } from "./server.js";

function unauthorized() {
  return Response.json(
    { error: "Unauthorized" },
    {
      status: 401,
      headers: {
        "Cache-Control": "no-store",
        "WWW-Authenticate": "Bearer",
      },
    },
  );
}

function isAuthorized(request, secret) {
  const match = /^Bearer (.+)$/i.exec(
    request.headers.get("authorization") ?? "",
  );
  if (!match) return false;
  const supplied = Buffer.from(match[1]);
  const expected = Buffer.from(secret);
  return (
    supplied.length === expected.length && timingSafeEqual(supplied, expected)
  );
}

export async function handleMcpRequest(request) {
  const secret = process.env.MCP_API_KEY;
  if (!secret)
    return Response.json(
      { error: "MCP read access is not configured." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  if (!isAuthorized(request, secret)) return unauthorized();

  const server = createFxMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  try {
    await server.connect(transport);
    return await transport.handleRequest(request);
  } catch (error) {
    console.error("MCP request handling failed", error);
    return Response.json(
      {
        jsonrpc: "2.0",
        error: { code: -32603, message: "MCP request failed." },
        id: null,
      },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  } finally {
    await transport.close();
    await server.close();
  }
}
