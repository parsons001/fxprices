import { Suspense } from "react";
import "./globals.css";
import SiteNavigation from "../components/site-navigation";

export const metadata = {
  title: { default: "FX", template: "%s | FX" },
  description: "Compare Wise and Revolut conversion rates, fees and markup.",
};

export default function Layout({ children }) {
  return <html lang="en"><body>
    <div className="mx-auto w-[min(1200px,calc(100%-2rem))] py-12 max-[600px]:py-6">
      <Suspense fallback={<nav className="mb-8 h-12" aria-label="Main navigation" />}><SiteNavigation /></Suspense>
      {children}
    </div>
  </body></html>;
}
