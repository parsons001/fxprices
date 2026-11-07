"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createPortal } from "react-dom";
import { Ellipsis, LoaderCircle } from "lucide-react";
import { formatRoleLabel, USER_ROLES } from "../../lib/user-roles.js";
import LocalizedDate from "../layout/localized-date";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

const ROLE_OPTIONS = [
  { value: USER_ROLES.STANDARD, label: "Standard" },
  { value: USER_ROLES.SUBSCRIBED, label: "Subscribed" },
  { value: USER_ROLES.ADMIN, label: "Admin" },
];

export default function AdminUsersTable({ users, currentUserId }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState("");
  const [pendingAction, setPendingAction] = useState("");
  const [error, setError] = useState("");
  const [openMenu, setOpenMenu] = useState(null);

  useEffect(() => {
    if (!openMenu) return;
    function closeOnEscape(event) {
      if (event.key === "Escape") setOpenMenu(null);
    }
    function closeOnViewportChange() {
      setOpenMenu(null);
    }
    window.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", closeOnViewportChange);
    window.addEventListener("scroll", closeOnViewportChange, true);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", closeOnViewportChange);
      window.removeEventListener("scroll", closeOnViewportChange, true);
    };
  }, [openMenu]);

  async function performAction(user, action, role) {
    setError("");
    setPendingId(user.id);
    setPendingAction(action);
    try {
      const response = await fetch(
        `/api/admin/users/${encodeURIComponent(user.id)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, ...(role ? { role } : {}) }),
        },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "The admin action failed.");
      router.refresh();
    } catch (actionError) {
      setError(actionError.message || "The admin action failed.");
    } finally {
      setPendingId("");
      setPendingAction("");
    }
  }

  async function deleteUser(user) {
    setOpenMenu(null);
    const confirmed = window.confirm(
      `Permanently delete ${user.email}? This cannot be undone.`,
    );
    if (confirmed) await performAction(user, "delete");
  }

  return (
    <Card as="section" className="overflow-hidden">
      {error && (
        <p
          role="alert"
          className="border-b bg-red-50 px-5 py-3 text-sm text-red-800"
        >
          {error}
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-xs text-muted-foreground">
              <th scope="col" className="px-5 py-3 font-medium">
                Name
              </th>
              <th scope="col" className="px-5 py-3 font-medium">
                Email
              </th>
              <th scope="col" className="px-5 py-3 font-medium">
                Subscriber type
              </th>
              <th scope="col" className="px-5 py-3 font-medium">
                Email status
              </th>
              <th scope="col" className="px-5 py-3 font-medium">
                Account status
              </th>
              <th scope="col" className="px-5 py-3 font-medium">
                Joined
              </th>
              <th scope="col" className="px-5 py-3 font-medium">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const isSelf = user.id === currentUserId;
              const isPending = pendingId === user.id;
              const isUpdatingRole = isPending && pendingAction === "role";
              return (
                <tr key={user.id} className="border-b last:border-0">
                  <th
                    scope="row"
                    className="whitespace-nowrap px-5 py-3.5 font-medium"
                  >
                    <Link
                      href={`/admin/users/${encodeURIComponent(user.id)}`}
                      className="rounded-sm underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      {user.name || user.email}
                    </Link>
                  </th>
                  <td className="whitespace-nowrap px-5 py-3.5">
                    {user.name ? user.email : "—"}
                  </td>
                  <td className="px-5 py-3.5">{formatRoleLabel(user.role)}</td>
                  <td className="px-5 py-3.5">
                    {user.emailVerified ? "Verified" : "Unverified"}
                  </td>
                  <td className="px-5 py-3.5">
                    {user.banned ? "Suspended" : "Active"}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-muted-foreground">
                    <LocalizedDate
                      value={user.createdAt}
                      options={{ dateStyle: "medium" }}
                    />
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5">
                    <Button
                      type="button"
                      aria-label={`Actions for ${user.email}`}
                      aria-haspopup="menu"
                      aria-expanded={openMenu?.user.id === user.id}
                      disabled={isPending}
                      variant="ghost"
                      size="icon"
                      onClick={(event) => {
                        const rect =
                          event.currentTarget.getBoundingClientRect();
                        const menuWidth = 240;
                        const menuHeight = 240;
                        const left = Math.max(
                          8,
                          Math.min(
                            rect.right - menuWidth,
                            window.innerWidth - menuWidth - 8,
                          ),
                        );
                        const top =
                          rect.bottom + menuHeight + 8 > window.innerHeight
                            ? Math.max(8, rect.top - menuHeight - 4)
                            : rect.bottom + 4;
                        setOpenMenu(
                          openMenu?.user.id === user.id
                            ? null
                            : { user, left, top },
                        );
                      }}
                    >
                      <Ellipsis className="size-5" aria-hidden="true" />
                    </Button>
                    {openMenu?.user.id === user.id &&
                      createPortal(
                        <>
                          <button
                            type="button"
                            aria-label="Close actions menu"
                            className="fixed inset-0 z-40 cursor-default"
                            onClick={() => setOpenMenu(null)}
                          />
                          <div
                            role="dialog"
                            aria-label={`Manage ${user.email}`}
                            style={{
                              position: "fixed",
                              top: openMenu.top,
                              left: openMenu.left,
                            }}
                            className="z-50 w-60 rounded-lg border bg-card p-2 text-card-foreground shadow-xl"
                          >
                            <div className="border-b px-2 pb-2">
                              <p className="text-sm font-semibold">
                                Manage account
                              </p>
                              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                {user.email}
                              </p>
                            </div>
                            <label className="grid gap-1.5 px-2 py-3 text-xs font-medium text-muted-foreground">
                              <span className="flex items-center justify-between gap-2">
                                <span>Subscriber type</span>
                                {isUpdatingRole && (
                                  <span
                                    role="status"
                                    className="inline-flex items-center gap-1.5 font-normal"
                                  >
                                    <LoaderCircle
                                      className="size-3 animate-spin"
                                      aria-hidden="true"
                                    />
                                    Updating…
                                  </span>
                                )}
                              </span>
                              <Select
                                value={user.role}
                                disabled={isSelf || isPending}
                                onValueChange={(role) => {
                                  performAction(user, "role", role);
                                }}
                              >
                                <SelectTrigger
                                  aria-label={`Subscriber type for ${user.email}`}
                                  className="h-9 bg-background px-2.5 text-foreground shadow-sm hover:border-foreground/30"
                                >
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {ROLE_OPTIONS.map((role) => (
                                    <SelectItem
                                      key={role.value}
                                      value={role.value}
                                    >
                                      {role.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {isSelf && (
                                <span className="font-normal">
                                  You can’t change your own role.
                                </span>
                              )}
                            </label>
                            <div className="border-t pt-1">
                              <Button
                                type="button"
                                disabled={isSelf || isPending}
                                variant="ghost"
                                size="menu"
                                className="rounded-md"
                                onClick={() => {
                                  setOpenMenu(null);
                                  performAction(
                                    user,
                                    user.banned ? "unsuspend" : "suspend",
                                  );
                                }}
                              >
                                {isPending
                                  ? "Saving…"
                                  : user.banned
                                    ? "Unsuspend account"
                                    : "Suspend account"}
                              </Button>
                              <Button
                                type="button"
                                disabled={isSelf || isPending}
                                variant="destructive"
                                size="menu"
                                className="rounded-md"
                                onClick={() => {
                                  setOpenMenu(null);
                                  deleteUser(user);
                                }}
                              >
                                Delete account
                              </Button>
                            </div>
                          </div>
                        </>,
                        document.body,
                      )}
                  </td>
                </tr>
              );
            })}
            {!users.length && (
              <tr>
                <td
                  colSpan={7}
                  className="px-5 py-10 text-center text-muted-foreground"
                >
                  No user accounts found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
