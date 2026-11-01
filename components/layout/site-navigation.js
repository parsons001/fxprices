"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeftRight,
  ChartNoAxesCombined,
  Shield,
  Send,
  ChevronRight,
} from "lucide-react";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { authClient } from "../../lib/auth-client";
import { USER_ROLES } from "../../lib/user-roles";

export default function SiteNavigation() {
  const pathname = usePathname();
  const country = useSearchParams().get("senderCountry") ?? "GB";
  const { data: session } = authClient.useSession();
  const isAdmin = session?.user?.role === USER_ROLES.ADMIN;
  const [signOutError, setSignOutError] = useState("");
  const authPage = [
    "/sign-in",
    "/sign-up",
    "/forgot-password",
    "/reset-password",
  ].includes(pathname);

  if (authPage) return null;

  async function handleSignOut() {
    const result = await authClient.signOut();
    if (result.error) {
      setSignOutError(result.error.message);
      return;
    }
    window.location.assign("/sign-in");
  }

  return (
    <aside className="border-b bg-card lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-56 lg:flex-col lg:border-r lg:border-b-0">
      <div className="flex h-16 items-center border-b px-5">
        <Link
          href={`/dashboard?senderCountry=${country}`}
          prefetch={false}
          className="flex items-center gap-2.5 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Image
              src="/hat-glasses.svg"
              width={24}
              height={24}
              alt=""
              aria-hidden="true"
            />
          </span>
          <span className="text-sm font-semibold tracking-tight">
            FX Compare
          </span>
        </Link>
      </div>
      <nav aria-label="Main navigation" className="p-3 lg:p-4">
        <p className="mb-3 hidden px-2 text-xs font-medium text-muted-foreground lg:block">
          Dashboard
        </p>
        <div className="flex gap-2 lg:flex-col lg:gap-1">
          {[
            {
              href: "/dashboard",
              label: "Overview",
              Icon: ChartNoAxesCombined,
            },
            { href: "/convert", label: "Convert", Icon: ArrowLeftRight },
            { href: "/send", label: "Send", Icon: Send },
          ].map(({ href, label, Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={`${href}?senderCountry=${country}`}
                prefetch={false}
                aria-current={active ? "page" : undefined}
                className={`flex flex-1 items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${active ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"}`}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                {label}
                {active && (
                  <ChevronRight
                    className="ml-auto size-3.5"
                    aria-hidden="true"
                  />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
      {session?.user && (
        <div className="border-t px-5 py-3 lg:hidden">
          {isAdmin && (
            <Link
              href="/admin"
              aria-current={pathname.startsWith("/admin") ? "page" : undefined}
              className={`mb-3 flex items-center gap-3 rounded-md px-3 py-2 text-sm ${pathname.startsWith("/admin") ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"}`}
            >
              <Shield className="size-4" aria-hidden="true" />
              Admin
            </Link>
          )}
          <div className="flex items-center justify-between">
            <Link href="/profile" className="min-w-0">
              <span className="block truncate text-xs font-medium">
                {session.user.name || session.user.email}
              </span>
              <span className="mt-1 block truncate text-xs text-muted-foreground">
                {session.user.email}
              </span>
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="ml-4 shrink-0 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Sign out
            </button>
          </div>
          {signOutError && (
            <p role="alert" className="mt-2 text-xs text-red-700">
              {signOutError}
            </p>
          )}
        </div>
      )}
      <div className="mt-auto hidden p-3 lg:block">
        {session?.user && (
          <>
            {isAdmin && (
              <Link
                href="/admin"
                aria-current={
                  pathname.startsWith("/admin") ? "page" : undefined
                }
                className={`mb-2 flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${pathname.startsWith("/admin") ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"}`}
              >
                <Shield className="size-4" aria-hidden="true" />
                Admin
              </Link>
            )}
            <div className="-mx-3 border-t px-3 pt-3">
              <div className="rounded-md p-2">
                <Link
                  href="/profile"
                  className="flex min-w-0 items-center gap-3 rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <span
                    aria-hidden="true"
                    className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium uppercase"
                  >
                    {(session.user.name || session.user.email || "?")
                      .trim()
                      .charAt(0)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {session.user.name || "Your profile"}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {session.user.email}
                    </span>
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="ml-12 mt-2 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  Sign out
                </button>
                {signOutError && (
                  <p role="alert" className="mt-2 text-xs text-red-700">
                    {signOutError}
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
