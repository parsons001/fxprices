import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { getMcpResourceUrl, verifyMcpAccessToken } from "./oauth.js";
import { createFxMcpServer } from "./server.js";

export async function handleMcpRequest(
  request,
  authenticate = verifyMcpAccessToken,
) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.match(/^Bearer\s+\S+$/i)) {
    return oauthRequiredResponse();
  }

  let authInfo;
  try {
    authInfo = await authenticate(request);
  } catch (error) {
    console.error("MCP OAuth access-token verification failed", error);
    return oauthRequiredResponse();
  }

  const server = createFxMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  try {
    await server.connect(transport);
    return await transport.handleRequest(request, { authInfo });
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

function oauthRequiredResponse() {
  const metadataURL = new URL(
    "/.well-known/oauth-protected-resource/api/mcp",
    getMcpResourceUrl(),
  );
  return Response.json(
    { error: "A valid MCP OAuth access token is required." },
    {
      status: 401,
      headers: {
        "Cache-Control": "no-store",
        "WWW-Authenticate": `Bearer resource_metadata="${metadataURL.href}"`,
      },
    },
  );
}
