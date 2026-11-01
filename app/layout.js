import { Analytics } from "@vercel/analytics/next";
import { GeistSans } from "geist/font/sans";
import "./globals.css";
import SiteShell from "../components/layout/site-shell";
export const metadata = {
  title: { default: "FX", template: "%s | FX" },
  description: "Compare Wise and Revolut conversion rates, fees and markup.",
};
export default function Layout({ children }) {
  return (
    <html lang="en">
      <body className={GeistSans.variable}>
        <a
          href="#workspace"
          className="sr-only z-50 rounded bg-primary p-3 text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Skip to content
        </a>
        <SiteShell>{children}</SiteShell>
        <Analytics />
      </body>
    </html>
  );
}
