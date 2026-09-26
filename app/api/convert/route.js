import { conversionStore } from "../../../lib/db/conversion-store.js";
import { createSavedQuotesHandler } from "../../../lib/api/saved-quotes-handler.js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const GET = createSavedQuotesHandler(conversionStore);
