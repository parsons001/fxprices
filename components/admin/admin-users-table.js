"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { Ellipsis } from "lucide-react";
import { USER_ROLES } from "../../lib/user-roles.js";

const ROLE_OPTIONS = [
  { value: USER_ROLES.STANDARD, label: "Standard" },
  { value: USER_ROLES.SUBSCRIBED, label: "Subscribed" },
  { value: USER_ROLES.ADMIN, label: "Admin" },
];

export default function AdminUsersTable({ users, currentUserId }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState("");
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
    <section className="overflow-hidden rounded-xl border bg-card">
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
              return (
                <tr key={user.id} className="border-b last:border-0">
                  <th
                    scope="row"
                    className="whitespace-nowrap px-5 py-3.5 font-medium"
                  >
                    {user.name || "—"}
                  </th>
                  <td className="whitespace-nowrap px-5 py-3.5">
                    {user.email}
                  </td>
                  <td className="px-5 py-3.5">{user.role}</td>
                  <td className="px-5 py-3.5">
                    {user.emailVerified ? "Verified" : "Unverified"}
                  </td>
                  <td className="px-5 py-3.5">
                    {user.banned ? "Suspended" : "Active"}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5 text-muted-foreground">
                    {user.createdAt
                      ? new Date(user.createdAt).toLocaleDateString("en-GB", {
                          dateStyle: "medium",
                          timeZone: "UTC",
                        })
                      : "—"}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3.5">
                    <button
                      type="button"
                      aria-label={`Actions for ${user.email}`}
                      aria-haspopup="menu"
                      aria-expanded={openMenu?.user.id === user.id}
                      disabled={isPending}
                      onClick={(event) => {
                        const rect =
                          event.currentTarget.getBoundingClientRect();
                        const menuWidth = 224;
                        const menuHeight = 170;
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
                      className="flex size-9 list-none items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden"
                    >
                      <Ellipsis className="size-5" aria-hidden="true" />
                    </button>
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
                            role="menu"
                            aria-label={`Actions for ${user.email}`}
                            style={{
                              position: "fixed",
                              top: openMenu.top,
                              left: openMenu.left,
                            }}
                            className="z-50 w-56 rounded-md border bg-card p-1.5 text-card-foreground shadow-lg"
                          >
                            <label className="grid gap-1 px-2 py-1.5 text-xs font-medium text-muted-foreground">
                              Subscriber type
                              <select
                                aria-label={`Subscriber type for ${user.email}`}
                                value={user.role}
                                disabled={isSelf || isPending}
                                onChange={(event) => {
                                  setOpenMenu(null);
                                  performAction(
                                    user,
                                    "role",
                                    event.currentTarget.value,
                                  );
                                }}
                                className="h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground disabled:opacity-60"
                              >
                                {ROLE_OPTIONS.map((role) => (
                                  <option key={role.value} value={role.value}>
                                    {role.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <div className="my-1 border-t" />
                            <button
                              type="button"
                              role="menuitem"
                              disabled={isSelf || isPending}
                              onClick={() => {
                                setOpenMenu(null);
                                performAction(
                                  user,
                                  user.banned ? "unsuspend" : "suspend",
                                );
                              }}
                              className="flex h-9 w-full items-center rounded-sm px-2 text-left text-sm hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
                            >
                              {isPending
                                ? "Saving…"
                                : user.banned
                                  ? "Unsuspend account"
                                  : "Suspend account"}
                            </button>
                            <button
                              type="button"
                              role="menuitem"
                              disabled={isSelf || isPending}
                              onClick={() => {
                                setOpenMenu(null);
                                deleteUser(user);
                              }}
                              className="flex h-9 w-full items-center rounded-sm px-2 text-left text-sm text-red-700 hover:bg-red-50 disabled:pointer-events-none disabled:opacity-50"
                            >
                              Delete account
                            </button>
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
    </section>
  );
}
