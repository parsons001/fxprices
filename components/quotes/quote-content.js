"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import FilterControls from "./filter-controls";
import Converter from "./converter";
import {
  DEFAULT_SELECTED_PROVIDERS,
  resolveSelectedProviders,
} from "../../lib/quotes/provider-filters";

export default function QuoteContent({
  amounts,
  currencies,
  senderCountry,
  sourceCurrency,
  sourceCurrencies,
  selectedCurrency,
  selectedAmount,
  conversionFeesUnavailable,
  mode,
  snapshots,
  selectedDays,
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [amountSourceCurrency, setAmountSourceCurrency] =
    useState(sourceCurrency);
  const currentProviders = resolveSelectedProviders({
    providers: searchParams.getAll("providers"),
  });

  useEffect(() => {
    setAmountSourceCurrency(sourceCurrency);
  }, [sourceCurrency]);

  function updateFilter(name, value) {
    const next = new URLSearchParams(searchParams.toString());
    if (name === "sourceCurrency") {
      setAmountSourceCurrency(value);
      next.delete("currency");
    }
    if (value === "__all__") next.delete(name);
    else next.set(name, value);
    if (next.toString() === searchParams.toString()) return;
    startTransition(() =>
      router.replace(`${pathname}${next.toString() ? `?${next}` : ""}`, {
        scroll: false,
      }),
    );
  }

  function updateProviders(providers) {
    if (!providers.length) return;
    const next = new URLSearchParams(searchParams.toString());
    if (providers.length === DEFAULT_SELECTED_PROVIDERS.length) {
      next.delete("providers");
    } else {
      next.set("providers", providers.join(","));
    }
    if (next.toString() === searchParams.toString()) return;
    window.history.replaceState(
      null,
      "",
      `${pathname}${next.toString() ? `?${next}` : ""}`,
    );
  }

  return (
    <>
      <FilterControls
        amounts={amounts}
        currencies={currencies}
        amount={selectedAmount}
        currency={selectedCurrency}
        days={selectedDays}
        senderCountry={senderCountry}
        sourceCurrency={amountSourceCurrency}
        sourceCurrencies={sourceCurrencies}
        selectedProviders={currentProviders}
        isPending={isPending}
        onFilterChange={updateFilter}
        onProvidersChange={updateProviders}
      />
      {conversionFeesUnavailable && (
        <div
          role="alert"
          className="mt-6 rounded-xl border border-amber-300 bg-amber-50 px-5 py-4 text-sm text-amber-950"
        >
          Conversion fees could not be loaded. International payment fees are
          temporarily unavailable and appear as —. Try refreshing the page.
        </div>
      )}
      <Converter
        mode={mode}
        senderCountry={senderCountry}
        sourceCurrency={sourceCurrency}
        snapshots={snapshots}
        selectedDays={selectedDays}
        selectedProviders={currentProviders}
        isLoading={isPending}
      />
    </>
  );
}
