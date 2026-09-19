import "./globals.css";
import { Suspense } from "react";
import FilterControls from "../components/filter-controls";
import ViewTabs from "../components/view-tabs";
import { AMOUNTS_GBP, CURRENCIES } from "../lib/currencies";

export const metadata = {
  title: "FX Convert",
  description: "Compare Wise and Revolut conversion rates, fees and markup.",
};

export default function Layout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="mx-auto w-[min(1200px,calc(100%-2rem))] py-12 max-[600px]:py-6">
          <header>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-red-700">
              FX CONVERT
            </p>
            <h1 className="my-3 text-4xl font-semibold tracking-tight sm:text-5xl">
              Conversion rates
            </h1>
          </header>
          <ViewTabs>
            <Suspense
              fallback={<div className="h-[74px] rounded-xl border bg-card" />}
            >
              <FilterControls amounts={AMOUNTS_GBP} currencies={CURRENCIES} />
            </Suspense>
            {children}
          </ViewTabs>
        </div>
      </body>
    </html>
  );
}
