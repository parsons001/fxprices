"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { authClient } from "../../lib/auth-client";
import { Card } from "../ui/card";
import { Button } from "../ui/button";

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
  const isLoginPage = mode === "sign-in" || mode === "sign-up";

  return (
    <main className="relative flex min-h-screen w-full flex-col items-center justify-center bg-muted px-4 py-10 sm:px-6">
      {isLoginPage && (
        <Link
          href="/sign-in"
          aria-label="FX Compare home"
          className="mb-6 flex items-center gap-2.5 rounded-md text-sm font-medium tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary">
            <Image
              src="/hat-glasses.svg"
              width={22}
              height={22}
              alt=""
              aria-hidden="true"
            />
          </span>
          FX Compare
        </Link>
      )}
      <Card
        as="section"
        className={`w-full p-6 sm:p-8 ${isLoginPage ? "max-w-[360px]" : "max-w-sm"}`}
      >
        <div
          className={`${isLoginPage ? "mb-6" : "mb-7 mt-5"} flex flex-col items-center text-center`}
        >
          {!isLoginPage && (
            <Link
              href="/sign-in"
              aria-label="FX Compare home"
              className="mb-5 flex size-11 items-center justify-center rounded-xl bg-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
            >
              <Image
                src="/hat-glasses.svg"
                width={28}
                height={28}
                alt=""
                aria-hidden="true"
              />
            </Link>
          )}
          <h1 className="text-2xl font-semibold tracking-tight">
            {isLoginPage
              ? mode === "sign-in"
                ? "Welcome back"
                : "Create an account"
              : TITLES[mode]}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "sign-in"
              ? "Continue with your Google account or email"
              : mode === "sign-up"
                ? "Sign up to access your quote comparisons."
                : mode === "forgot-password"
                  ? "Enter your email and we’ll send you a reset link."
                  : "Enter a new password for your account."}
          </p>
        </div>
        {mode === "sign-up" && (
          <p className="-mt-2 mb-5 text-center text-xs text-muted-foreground">
            Email verification is required before signing in.
          </p>
        )}
        {mode === "reset-password" && !token && (
          <p className="mb-5 text-center text-sm text-muted-foreground">
            This password reset link is invalid or expired. Request a new one.
          </p>
        )}

        {isLoginPage && (
          <>
            <Button
              type="button"
              onClick={signInWithGoogle}
              disabled={isLoading}
              variant="outline"
              className="w-full gap-2"
            >
              <span aria-hidden="true" className="text-base font-semibold">
                G
              </span>
              Continue with Google
            </Button>
            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              Or continue with email
              <span className="h-px flex-1 bg-border" />
            </div>
          </>
        )}

        {hasEmailPasswordForm && (
          <form onSubmit={submit} className="grid gap-4">
            {mode === "sign-up" && (
              <label className="grid gap-2 text-sm font-medium leading-none">
                Name
                <input
                  autoComplete="name"
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm font-normal shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </label>
            )}
            {mode !== "reset-password" && (
              <div className="grid gap-2">
                <label
                  htmlFor="auth-email"
                  className="text-sm font-medium leading-none"
                >
                  Email
                </label>
                <input
                  id="auth-email"
                  type="email"
                  autoComplete="email"
                  placeholder="name@example.com"
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
              </div>
            )}
            {mode !== "forgot-password" && (
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="auth-password"
                    className="text-sm font-medium leading-none"
                  >
                    {mode === "reset-password" ? "New password" : "Password"}
                  </label>
                  {mode === "sign-in" && (
                    <Link
                      href="/forgot-password"
                      className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                    >
                      Forgot your password?
                    </Link>
                  )}
                </div>
                <input
                  id="auth-password"
                  type="password"
                  autoComplete={
                    mode === "sign-up"
                      ? "new-password"
                      : mode === "reset-password"
                        ? "new-password"
                        : "current-password"
                  }
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={8}
                  required
                />
              </div>
            )}
            <Button type="submit" disabled={isLoading} className="mt-1">
              {isLoading
                ? "Please wait…"
                : mode === "sign-in"
                  ? "Login"
                  : mode === "sign-up"
                    ? "Create account"
                    : mode === "forgot-password"
                      ? "Send reset link"
                      : "Reset password"}
            </Button>
          </form>
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
      </Card>
      {isLoginPage && (
        <p className="mt-6 max-w-sm text-center text-xs leading-5 text-muted-foreground">
          {mode === "sign-up"
            ? "Verify your email address to start using FX Compare."
            : "Your quote comparisons are ready when you are."}
        </p>
      )}
    </main>
  );
}
