"use client";

import { useState } from "react";
import { authClient } from "../../lib/auth-client";
import LocalizedDate from "../layout/localized-date";
import { Card } from "../ui/card";
import { Button } from "../ui/button";

export default function ProfileSettings({ user, accounts }) {
  const [name, setName] = useState(user.name ?? "");
  const [email, setEmail] = useState(user.email ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileNotice, setProfileNotice] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordNotice, setPasswordNotice] = useState("");
  const [signOutError, setSignOutError] = useState("");
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function signOut() {
    setSignOutError("");
    setIsSigningOut(true);
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error(result.error.message);
      window.location.assign("/sign-in");
    } catch (requestError) {
      setSignOutError(requestError.message || "Could not sign out.");
      setIsSigningOut(false);
    }
  }

  async function saveProfile(event) {
    event.preventDefault();
    setProfileError("");
    setProfileNotice("");
    setIsSavingProfile(true);
    try {
      if (name.trim() !== user.name) {
        const result = await authClient.updateUser({ name: name.trim() });
        if (result.error) throw new Error(result.error.message);
      }

      if (email.trim().toLowerCase() !== user.email.toLowerCase()) {
        const result = await authClient.changeEmail({
          newEmail: email.trim(),
          callbackURL: "/profile",
        });
        if (result.error) throw new Error(result.error.message);
        setProfileNotice(
          "Check your current email for a link to confirm the address change.",
        );
      } else {
        setProfileNotice("Your profile details have been saved.");
      }
    } catch (requestError) {
      setProfileError(
        requestError.message || "Profile details could not be saved.",
      );
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function changePassword(event) {
    event.preventDefault();
    setPasswordError("");
    setPasswordNotice("");
    setIsSavingPassword(true);
    try {
      const result = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });
      if (result.error) throw new Error(result.error.message);
      setCurrentPassword("");
      setNewPassword("");
      setPasswordNotice("Your password has been updated.");
    } catch (requestError) {
      setPasswordError(
        requestError.message || "Password could not be changed.",
      );
    } finally {
      setIsSavingPassword(false);
    }
  }

  const role =
    user.role === "admin"
      ? "Admin"
      : user.role === "subscribed"
        ? "Subscribed"
        : "Standard";
  const hasPassword = accounts.some(
    (account) => account.providerId === "credential",
  );
  const signInMethods = [
    ...new Set(
      accounts.map((account) =>
        account.providerId === "credential"
          ? "Email and password"
          : account.providerId.charAt(0).toUpperCase() +
            account.providerId.slice(1),
      ),
    ),
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <Card as="section" className="p-6 sm:p-8">
        <div className="flex items-center gap-4">
          <div
            aria-hidden="true"
            className="flex size-14 shrink-0 items-center justify-center rounded-full bg-muted text-xl font-semibold uppercase"
          >
            {(name || user.email || "?").trim().charAt(0)}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold">
              {name || "Your account"}
            </h2>
            <p className="truncate text-sm text-muted-foreground">
              {user.email}
            </p>
          </div>
        </div>
        <dl className="mt-7 divide-y text-sm">
          <div className="flex items-center justify-between gap-4 py-3">
            <dt className="text-muted-foreground">Subscriber type</dt>
            <dd className="font-medium">{role}</dd>
          </div>
          <div className="flex items-center justify-between gap-4 py-3">
            <dt className="text-muted-foreground">Email status</dt>
            <dd className="font-medium">
              {user.emailVerified ? "Verified" : "Unverified"}
            </dd>
          </div>
          <div className="flex items-start justify-between gap-4 py-3">
            <dt className="text-muted-foreground">Sign-in methods</dt>
            <dd className="text-right font-medium">
              {signInMethods.length ? signInMethods.join(", ") : "Unknown"}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4 py-3">
            <dt className="text-muted-foreground">Member since</dt>
            <dd className="text-right font-medium">
              <LocalizedDate
                value={user.createdAt}
                options={{ dateStyle: "medium" }}
              />
            </dd>
          </div>
        </dl>
        <div className="mt-5 border-t pt-5">
          {signOutError && (
            <p role="alert" className="mb-3 text-sm text-red-700">
              {signOutError}
            </p>
          )}
          <Button
            type="button"
            onClick={signOut}
            disabled={isSigningOut}
            variant="link"
            className="text-muted-foreground hover:text-foreground"
          >
            {isSigningOut ? "Signing out…" : "Sign out"}
          </Button>
        </div>
      </Card>

      <div className="grid gap-6">
        <Card as="section" className="p-6 sm:p-8">
          <div className="mb-5">
            <h2 className="font-semibold">Personal information</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Update your name or email address.
            </p>
          </div>
          <form onSubmit={saveProfile} className="grid gap-4">
            <label className="grid gap-2 text-sm font-medium">
              Name
              <input
                autoComplete="name"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm font-normal shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Email
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm font-normal shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
              />
            </label>
            {profileError && (
              <p role="alert" className="text-sm text-red-700">
                {profileError}
              </p>
            )}
            {profileNotice && (
              <p role="status" className="text-sm text-emerald-800">
                {profileNotice}
              </p>
            )}
            <Button type="submit" disabled={isSavingProfile}>
              {isSavingProfile ? "Saving…" : "Save changes"}
            </Button>
          </form>
        </Card>

        {hasPassword && (
          <Card as="section" className="p-6 sm:p-8">
            <div className="mb-5">
              <h2 className="font-semibold">Change password</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Other signed-in sessions will be signed out after the change.
              </p>
            </div>
            <form onSubmit={changePassword} className="grid gap-4">
              <label className="grid gap-2 text-sm font-medium">
                Current password
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm font-normal shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                New password
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm font-normal shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
                />
              </label>
              {passwordError && (
                <p role="alert" className="text-sm text-red-700">
                  {passwordError}
                </p>
              )}
              {passwordNotice && (
                <p role="status" className="text-sm text-emerald-800">
                  {passwordNotice}
                </p>
              )}
              <Button
                type="submit"
                disabled={isSavingPassword}
                variant="outline"
              >
                {isSavingPassword ? "Updating…" : "Update password"}
              </Button>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}
