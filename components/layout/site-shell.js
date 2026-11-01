"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import SiteNavigation from "./site-navigation";

const standalonePages = new Set([
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
  "/oauth/consent",
]);

export default function SiteShell({ children }) {
  const pathname = usePathname();
  const standalone = standalonePages.has(pathname);

  return (
    <>
      {!standalone && (
        <Suspense
          fallback={
            <div className="h-16 border-b lg:fixed lg:inset-y-0 lg:h-full lg:w-56 lg:border-r" />
          }
        >
          <SiteNavigation />
        </Suspense>
      )}
      <div id="workspace" className={`min-w-0 ${standalone ? "" : "lg:ml-56"}`}>
        {children}
      </div>
    </>
  );
}
