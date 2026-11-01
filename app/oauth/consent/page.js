import OAuthConsent from "../../../components/auth/oauth-consent.js";

export const metadata = { title: "Authorize MCP access" };

function serializeOAuthQuery(params) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (key === "oauth_query") continue;
    if (Array.isArray(value)) {
      value.forEach((entry) => query.append(key, entry));
    } else if (typeof value === "string") {
      query.append(key, value);
    }
  }
  return query.toString();
}

export default async function OAuthConsentPage({ searchParams }) {
  const params = await searchParams;
  const oauthQuery =
    typeof params?.oauth_query === "string"
      ? params.oauth_query
      : serializeOAuthQuery(params);
  return <OAuthConsent oauthQuery={oauthQuery} />;
}
