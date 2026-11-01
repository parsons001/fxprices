"use client";

import { useEffect, useState } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { authClient } from "../../lib/auth-client";

export default function OAuthConsent({ oauthQuery }) {
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();
  const [clientName, setClientName] = useState("");
  const [error, setError] = useState("");
  const [isLoadingClient, setIsLoadingClient] = useState(true);
  const [decision, setDecision] = useState(null);

  useEffect(() => {
    let active = true;
    async function loadClient() {
      try {
        const clientId = new URLSearchParams(oauthQuery).get("client_id");
        if (!clientId) throw new Error("The OAuth request is incomplete.");
        const response = await fetch(
          "/api/auth/oauth2/public-client-prelogin",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              client_id: clientId,
              oauth_query: oauthQuery,
            }),
          },
        );
        const result = await response.json();
        if (!response.ok) {
          throw new Error("The requesting app could not be verified.");
        }
        if (active) {
          setClientName(result.client_name || result.name || "An MCP client");
        }
      } catch (requestError) {
        if (active) {
          setError(
            requestError.message || "The OAuth request could not be verified.",
          );
        }
      } finally {
        if (active) setIsLoadingClient(false);
      }
    }

    loadClient();
    return () => {
      active = false;
    };
  }, [oauthQuery]);

  async function respond(accept) {
    setDecision(accept ? "allow" : "deny");
    setError("");
    try {
      const response = await fetch("/api/auth/oauth2/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accept, oauth_query: oauthQuery }),
      });
      const result = await response.json();
      if (!response.ok || !result.url) {
        throw new Error("Your authorization response could not be processed.");
      }
      window.location.assign(new URL(result.url, window.location.origin));
    } catch (requestError) {
      setError(
        requestError.message ||
          "Your authorization response could not be processed.",
      );
      setDecision(null);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg items-center px-4 py-12">
      <Card
        as="section"
        aria-busy={isLoadingClient || Boolean(decision)}
        className="w-full p-6 shadow-sm"
      >
        <h1 className="text-xl font-semibold">
          {session?.user
            ? `Hi ${session.user.name?.trim() || "there"}, authorize MCP access`
            : "Authorize MCP access"}
        </h1>
        <p
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="mt-3 text-sm text-muted-foreground"
        >
          {isLoadingClient
            ? "Verifying the requesting app and checking its access request…"
            : decision === "allow"
              ? "Granting read-only access and returning you to the requesting app…"
              : decision === "deny"
                ? "Declining the request and returning you to the requesting app…"
                : `${clientName} is requesting read-only access to saved FX quote data.`}
        </p>
        <p className="mt-3 rounded-md bg-muted p-3 text-sm">
          Permission requested: <code>mcp:read</code>. If you allow, the app can
          read saved quote summaries and daily average rates. It cannot change
          your data.
        </p>
        {!isLoadingClient && !error && !decision && (
          <p className="mt-3 text-sm text-muted-foreground">
            Choose Allow to connect, or Deny to return without granting access.
          </p>
        )}
        {error && (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <Button
            type="button"
            disabled={isLoadingClient || Boolean(decision) || Boolean(error)}
            variant="outline"
            onClick={() => respond(false)}
          >
            {decision === "deny" ? "Declining…" : "Deny"}
          </Button>
          <Button
            type="button"
            disabled={isLoadingClient || Boolean(decision) || Boolean(error)}
            onClick={() => respond(true)}
          >
            {decision === "allow" ? "Approving…" : "Allow access"}
          </Button>
        </div>
      </Card>
    </main>
  );
}
