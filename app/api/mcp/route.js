import { handleMcpRequest } from "../../../lib/mcp/http-handler.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request) {
  return handleMcpRequest(request);
}
