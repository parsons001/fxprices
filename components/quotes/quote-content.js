"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import FilterControls from "./filter-controls";
import Converter from "./converter";

export default function QuoteContent({
  amounts,
  currencies,
  senderCountry,
  sourceCurrency,
  selectedProviders,
  conversionFeesUnavailable,
  mode,
  snapshots,
  selectedDays,
}) {
  const searchParams = useSearchParams();
  const searchParamsKey = searchParams.toString();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(false);
  }, [searchParamsKey]);

  return (
    <>
      <FilterControls
        amounts={amounts}
        currencies={currencies}
        senderCountry={senderCountry}
        sourceCurrency={sourceCurrency}
        selectedProviders={selectedProviders}
        onLoadingChange={setIsLoading}
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
        selectedProviders={selectedProviders}
        isLoading={isLoading}
      />
    </>
  );
}
