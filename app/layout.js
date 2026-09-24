import { Suspense } from "react";
import "./globals.css";
import SiteNavigation from "../components/site-navigation";
export const metadata = { title: { default: "FX", template: "%s | FX" }, description: "Compare Wise and Revolut conversion rates, fees and markup." };
export default function Layout({ children }) {
  return <html lang="en"><body>
    <a href="#workspace" className="sr-only z-50 rounded bg-primary p-3 text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to content</a>
    <Suspense fallback={<div className="h-16 border-b lg:fixed lg:inset-y-0 lg:h-full lg:w-56 lg:border-r" />}><SiteNavigation /></Suspense>
    <div id="workspace" className="min-w-0 lg:ml-56">{children}</div>
  </body></html>;
}
