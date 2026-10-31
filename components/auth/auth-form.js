"use client";

import { useState } from "react";
import Link from "next/link";
import { authClient } from "../../lib/auth-client";

const TITLES = {
  "sign-in": "Sign in to FX Compare",
  "sign-up": "Create your account",
  "forgot-password": "Reset your password",
  "reset-password": "Choose a new password",
};

export default function AuthForm({
  mode,
  callbackURL = "/convert",
  token = "",
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    setIsLoading(true);
    try {
      if (mode === "sign-in") {
        const result = await authClient.signIn.email({
          email,
          password,
          callbackURL,
        });
        if (result.error) throw new Error(result.error.message);
        window.location.assign(callbackURL);
        return;
      }
      if (mode === "sign-up") {
        const result = await authClient.signUp.email({
          name,
          email,
          password,
          callbackURL,
        });
        if (result.error) throw new Error(result.error.message);
        setNotice(
          "Check your email for a verification link to finish creating your account.",
        );
        return;
      }
      if (mode === "forgot-password") {
        const result = await authClient.requestPasswordReset({
          email,
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (result.error) throw new Error(result.error.message);
        setNotice(
          "If an account exists for that email, a password reset link has been sent.",
        );
        return;
      }
      const result = await authClient.resetPassword({
        newPassword: password,
        token,
      });
      if (result.error) throw new Error(result.error.message);
      setNotice("Your password has been reset. You can now sign in.");
    } catch (requestError) {
      setError(
        requestError.message || "Authentication failed. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function signInWithGoogle() {
    setError("");
    setIsLoading(true);
    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL,
      });
      if (result.error) throw new Error(result.error.message);
    } catch (requestError) {
      setError(
        requestError.message || "Google sign-in failed. Please try again.",
      );
      setIsLoading(false);
    }
  }

  const hasEmailPasswordForm = mode !== "reset-password" || Boolean(token);

  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10 sm:px-6">
      <section className="w-full max-w-md rounded-xl border bg-card p-6 shadow-sm sm:p-8">
        <Link
          href="/sign-in"
          className="text-sm font-semibold tracking-tight text-muted-foreground hover:text-foreground"
        >
          FX Compare
        </Link>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">
          {TITLES[mode]}
        </h1>
        {mode === "sign-up" && (
          <p className="mt-2 text-sm text-muted-foreground">
            Verify your email to access your saved quote comparisons.
          </p>
        )}
        {mode === "reset-password" && !token && (
          <p className="mt-3 text-sm text-muted-foreground">
            This password reset link is invalid or expired. Request a new one.
          </p>
        )}

        {hasEmailPasswordForm && (
          <form onSubmit={submit} className="mt-6 grid gap-4">
            {mode === "sign-up" && (
              <label className="grid gap-2 text-sm font-medium">
                Name
                <input
                  autoComplete="name"
                  className="h-10 rounded-md border bg-background px-3 font-normal"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </label>
            )}
            {mode !== "reset-password" && (
              <label className="grid gap-2 text-sm font-medium">
                Email
                <input
                  type="email"
                  autoComplete="email"
                  className="h-10 rounded-md border bg-background px-3 font-normal"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </label>
            )}
            {mode !== "forgot-password" && (
              <label className="grid gap-2 text-sm font-medium">
                {mode === "reset-password" ? "New password" : "Password"}
                <input
                  type="password"
                  autoComplete={
                    mode === "sign-up"
                      ? "new-password"
                      : mode === "reset-password"
                        ? "new-password"
                        : "current-password"
                  }
                  className="h-10 rounded-md border bg-background px-3 font-normal"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={8}
                  required
                />
              </label>
            )}
            {mode === "sign-in" && (
              <div className="-mt-2 text-right">
                <Link
                  href="/forgot-password"
                  className="text-sm text-muted-foreground underline-offset-4 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
            )}
            <button
              type="submit"
              disabled={isLoading}
              className="mt-1 h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              {isLoading
                ? "Please wait…"
                : mode === "sign-in"
                  ? "Sign in"
                  : mode === "sign-up"
                    ? "Create account"
                    : mode === "forgot-password"
                      ? "Send reset link"
                      : "Reset password"}
            </button>
          </form>
        )}

        {(mode === "sign-in" || mode === "sign-up") && (
          <>
            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              or
              <span className="h-px flex-1 bg-border" />
            </div>
            <button
              type="button"
              onClick={signInWithGoogle}
              disabled={isLoading}
              className="h-10 w-full rounded-md border bg-background px-4 text-sm font-medium hover:bg-muted disabled:opacity-60"
            >
              Continue with Google
            </button>
          </>
        )}

        {error && (
          <p role="alert" className="mt-4 text-sm text-red-700">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="mt-4 text-sm text-emerald-800">
            {notice}
          </p>
        )}
        <p className="mt-6 text-center text-sm text-muted-foreground">
          {mode === "sign-in" ? (
            <>
              Need an account?{" "}
              <Link
                href={`/sign-up?callbackURL=${encodeURIComponent(callbackURL)}`}
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                Create one
              </Link>
            </>
          ) : mode === "sign-up" ? (
            <>
              Already registered?{" "}
              <Link
                href={`/sign-in?callbackURL=${encodeURIComponent(callbackURL)}`}
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                Sign in
              </Link>
            </>
          ) : (
            <Link
              href="/sign-in"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Back to sign in
            </Link>
          )}
        </p>
      </section>
    </main>
  );
}
