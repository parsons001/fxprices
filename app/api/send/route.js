import { sendStore } from "../../../lib/db/send-store.js";
import { createSavedQuotesHandler } from "../../../lib/api/saved-quotes-handler.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const GET = createSavedQuotesHandler(sendStore);
