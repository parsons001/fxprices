"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function SiteNavigation() {
  const pathname = usePathname();
  return <nav aria-label="Main navigation" className="mb-8 flex items-center gap-2 border-b pb-4">
    <Link href="/convert" className="mr-auto text-sm font-bold tracking-widest" aria-label="FX home">FX</Link>
    {[{ href: "/convert", label: "Convert" }, { href: "/send", label: "Send" }].map(({ href, label }) => {
      const active = pathname === href || pathname.startsWith(`${href}/`);
      return <Link key={href} href={href} aria-current={active ? "page" : undefined}
        className={`rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
        {label}
      </Link>;
    })}
  </nav>;
}
