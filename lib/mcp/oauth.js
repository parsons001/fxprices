import { oauthProviderResourceClient } from "@better-auth/oauth-provider/resource-client";
import { oauthProviderAuthServerMetadata } from "@better-auth/oauth-provider";
import { getAuth } from "../auth.js";

export const MCP_READ_SCOPE = "mcp:read";
const AUTH_BASE_PATH = "/api/auth";

let resourceActionsPromise;

async function getResourceActions() {
  resourceActionsPromise ??= getAuth().then((auth) =>
    oauthProviderResourceClient(auth).getActions(),
  );
  return resourceActionsPromise;
}

export function getMcpResourceUrl() {
  const baseURL = process.env.BETTER_AUTH_URL;
  if (!baseURL) throw new Error("BETTER_AUTH_URL is not configured.");
  return new URL("/api/mcp", baseURL).href;
}

function getOAuthIssuerUrl() {
  const baseURL = process.env.BETTER_AUTH_URL;
  if (!baseURL) throw new Error("BETTER_AUTH_URL is not configured.");
  return new URL(AUTH_BASE_PATH, baseURL).href.replace(/\/$/, "");
}

export async function getMcpResourceMetadata(request) {
  const auth = await getAuth();
  const authMetadataResponse =
    await oauthProviderAuthServerMetadata(auth)(request);
  if (!authMetadataResponse.ok) {
    throw new Error("Unable to load OAuth authorization-server metadata.");
  }
  const authMetadata = await authMetadataResponse.json();
  if (typeof authMetadata.issuer !== "string" || !authMetadata.issuer) {
    throw new Error("OAuth authorization-server metadata has no issuer.");
  }
  return {
    resource: getMcpResourceUrl(),
    authorization_servers: [authMetadata.issuer],
    scopes_supported: [MCP_READ_SCOPE],
    bearer_methods_supported: ["header"],
  };
}

export async function verifyMcpAccessToken(request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.match(/^Bearer\s+\S+$/i)) {
    throw new Error("A bearer access token is required.");
  }
  const actions = await getResourceActions();
  const payload = await actions.verifyAccessTokenRequest(request, {
    verifyOptions: {
      audience: getMcpResourceUrl(),
      issuer: getOAuthIssuerUrl(),
    },
    jwksUrl: new URL(`${AUTH_BASE_PATH}/jwks`, process.env.BETTER_AUTH_URL)
      .href,
    requiredScopes: [MCP_READ_SCOPE],
  });
  if (typeof payload.client_id !== "string" || !payload.client_id) {
    throw new Error("OAuth access token is missing its client identifier.");
  }

  const token = authorization.replace(/^Bearer\s+/i, "");

  return {
    token,
    clientId: payload.client_id,
    scopes: typeof payload.scope === "string" ? payload.scope.split(/\s+/) : [],
    ...(typeof payload.exp === "number" ? { expiresAt: payload.exp } : {}),
    resource: new URL(getMcpResourceUrl()),
    extra: { subject: payload.sub },
  };
}
