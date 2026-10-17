import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createFxMcpServer } from "./server.js";

export async function handleMcpRequest(request) {
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
