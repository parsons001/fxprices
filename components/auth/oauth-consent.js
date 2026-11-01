"use client";

import { useEffect, useState } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";

export default function OAuthConsent({ oauthQuery }) {
  const [clientName, setClientName] = useState("");
  const [error, setError] = useState("");
  const [isLoadingClient, setIsLoadingClient] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    setIsSubmitting(true);
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
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg items-center px-4 py-12">
      <Card as="section" className="w-full p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Authorize MCP access</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {isLoadingClient
            ? "Verifying the requesting app…"
            : `${clientName} is requesting read-only access to saved FX quote data.`}
        </p>
        <p className="mt-3 rounded-md bg-muted p-3 text-sm">
          Permission requested: <code>mcp:read</code>. This allows the client to
          read saved quote summaries and daily average rates.
        </p>
        {error && (
          <p role="alert" className="mt-4 text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <Button
            type="button"
            disabled={isLoadingClient || isSubmitting || Boolean(error)}
            variant="outline"
            onClick={() => respond(false)}
          >
            Deny
          </Button>
          <Button
            type="button"
            disabled={isLoadingClient || isSubmitting || Boolean(error)}
            onClick={() => respond(true)}
          >
            {isSubmitting ? "Continuing…" : "Allow access"}
          </Button>
        </div>
      </Card>
    </main>
  );
}
