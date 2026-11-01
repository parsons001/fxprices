"use client";
import Link from "next/link";
import {
  ArrowLeftRight,
  ChartNoAxesCombined,
  Shield,
  Send,
  ChevronRight,
  CircleUserRound,
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
  const authPage = [
    "/sign-in",
    "/sign-up",
    "/forgot-password",
    "/reset-password",
    "/oauth/consent",
  ].includes(pathname);

  if (authPage) return null;

  return (
    <aside className="border-b bg-card lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-56 lg:flex-col lg:border-r lg:border-b-0">
      <div className="flex h-16 items-center justify-between border-b px-5">
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
        {session?.user && (
          <Link
            href="/profile"
            aria-label="Profile"
            aria-current={pathname.startsWith("/profile") ? "page" : undefined}
            className="flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring lg:hidden"
          >
            <CircleUserRound className="size-5" aria-hidden="true" />
          </Link>
        )}
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
            ...(isAdmin
              ? [{ href: "/admin", label: "Admin", Icon: Shield }]
              : []),
          ].map(({ href, label, Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={`${href}?senderCountry=${country}`}
                prefetch={false}
                aria-current={active ? "page" : undefined}
                className={`flex flex-1 items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 lg:w-full lg:flex-none ${active ? "bg-muted/60 text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"}`}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                {label}
                {active && (
                  <ChevronRight
                    className="ml-auto hidden size-3.5 lg:block"
                    aria-hidden="true"
                  />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
      <div className="mt-auto hidden px-3 pb-3 lg:block">
        {session?.user && (
          <div className="border-t pt-3">
            <div className="rounded-lg border bg-background p-2">
              <Link
                href="/profile"
                aria-current={
                  pathname.startsWith("/profile") ? "page" : undefined
                }
                className="flex min-w-0 items-center gap-3 rounded-md p-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <span
                  aria-hidden="true"
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gray-200 text-sm font-medium uppercase"
                >
                  {(session.user.name || "🤖").trim().charAt(0)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">
                    {session.user.name || "Your profile"}
                  </span>
                  <span className="block truncate text-[11px] leading-4 text-muted-foreground">
                    {session.user.email}
                  </span>
                </span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
