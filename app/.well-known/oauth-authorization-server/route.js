import { oauthProviderAuthServerMetadata } from "@better-auth/oauth-provider";
import { getAuth } from "../../../lib/auth.js";

export async function GET(request) {
  const auth = await getAuth();
  const response = await oauthProviderAuthServerMetadata(auth)(request);
  return Response.json(await response.json(), {
    status: response.status,
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}
