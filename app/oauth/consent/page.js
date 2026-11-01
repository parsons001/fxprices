import OAuthConsent from "../../../components/auth/oauth-consent.js";

export const metadata = { title: "Authorize MCP access" };

export default async function OAuthConsentPage({ searchParams }) {
  const params = await searchParams;
  const oauthQuery =
    typeof params?.oauth_query === "string" ? params.oauth_query : "";
  return <OAuthConsent oauthQuery={oauthQuery} />;
}
