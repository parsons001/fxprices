import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "../../../../lib/auth.js";

async function handle(request, method) {
  const handlers = toNextJsHandler(await getAuth());
  return handlers[method](request);
}

export function GET(request) {
  return handle(request, "GET");
}

export function POST(request) {
  return handle(request, "POST");
}
