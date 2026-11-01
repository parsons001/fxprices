import { getMcpResourceMetadata } from "../../../../../lib/mcp/oauth.js";

export async function GET(request) {
  return Response.json(await getMcpResourceMetadata(request), {
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}
