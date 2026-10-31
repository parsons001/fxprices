"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import FilterControls from "./filter-controls";
import Converter from "./converter";
import { attachConversionFees } from "../../lib/quotes/additional-fees";
import {
  sourceCurrenciesForPairs,
  targetCurrenciesForSource,
} from "../../lib/config/currency-pairs";
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
  currencyPairsByCountry,
  selectedCurrency,
  selectedAmount,
  conversionFeesUnavailable,
  mode,
  snapshots,
  selectedDays,
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsKey = searchParams.toString();
  const requestId = useRef(0);
  const metadataRequestId = useRef(0);
  const [selectedCountry, setSelectedCountry] = useState(senderCountry);
  const [selectedSourceCurrency, setSelectedSourceCurrency] =
    useState(sourceCurrency);
  const [selectedTargetCurrency, setSelectedTargetCurrency] =
    useState(selectedCurrency);
  const [selectedAmountValue, setSelectedAmountValue] =
    useState(selectedAmount);
  const [selectedDaysValue, setSelectedDaysValue] = useState(selectedDays);
  const [selectedProviders, setSelectedProviders] = useState(() =>
    resolveSelectedProviders({ providers: searchParams.getAll("providers") }),
  );
  const [availableCurrencies, setAvailableCurrencies] = useState(currencies);
  const [availableSourceCurrencies, setAvailableSourceCurrencies] =
    useState(sourceCurrencies);
  const [currentSnapshots, setCurrentSnapshots] = useState(snapshots);
  const [isLoading, setIsLoading] = useState(false);
  const [conversionFeesMissing, setConversionFeesMissing] = useState(
    conversionFeesUnavailable,
  );
  const [loadError, setLoadError] = useState("");
  const [quoteDataUnavailable, setQuoteDataUnavailable] = useState(false);

  useEffect(() => {
    setSelectedCountry(senderCountry);
    setSelectedSourceCurrency(sourceCurrency);
  }, [senderCountry, sourceCurrency]);

  useEffect(() => {
    setAvailableCurrencies(currencies);
    setAvailableSourceCurrencies(sourceCurrencies);
  }, [currencies, sourceCurrencies]);

  useEffect(() => {
    setSelectedTargetCurrency(selectedCurrency);
    setSelectedAmountValue(selectedAmount);
    setSelectedDaysValue(selectedDays);
  }, [selectedCurrency, selectedAmount, selectedDays]);

  useEffect(() => {
    setCurrentSnapshots(snapshots);
    setConversionFeesMissing(conversionFeesUnavailable);
  }, [snapshots, conversionFeesUnavailable]);

  useEffect(() => {
    setSelectedProviders(
      resolveSelectedProviders({
        providers: new URLSearchParams(searchParamsKey).getAll("providers"),
      }),
    );
  }, [searchParamsKey]);

  function updateUrl(params) {
    window.history.replaceState(
      null,
      "",
      `${pathname}${params.toString() ? `?${params}` : ""}`,
    );
  }

  async function loadQuotes(params) {
    const currentRequestId = ++requestId.current;
    setIsLoading(true);
    setLoadError("");
    setQuoteDataUnavailable(false);
    const query = new URLSearchParams(params);
    const responseUrl = `/api/${mode}?${query}`;

    try {
      const response = await fetch(responseUrl, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) {
        if (result.error === "Quote configuration is unavailable.") {
          if (requestId.current === currentRequestId) {
            setCurrentSnapshots([]);
            setConversionFeesMissing(false);
            setQuoteDataUnavailable(true);
          }
          return;
        }
        throw new Error(result.error ?? "Saved quotes could not be loaded.");
      }
      let nextSnapshots = result.snapshots ?? [];
      let missingFees = false;
      if (mode === "send") {
        try {
          const convertResponse = await fetch(`/api/convert?${query}`, {
            cache: "no-store",
          });
          if (!convertResponse.ok)
            throw new Error("Conversion quotes unavailable");
          const convertResult = await convertResponse.json();
          nextSnapshots = attachConversionFees(
            nextSnapshots,
            convertResult.snapshots ?? [],
          );
        } catch {
          missingFees = true;
        }
      }
      if (requestId.current !== currentRequestId) return;
      setCurrentSnapshots(nextSnapshots);
      setConversionFeesMissing(missingFees);
    } catch (error) {
      if (requestId.current !== currentRequestId) return;
      setCurrentSnapshots([]);
      if (error.message === "Quote configuration is unavailable.") {
        setConversionFeesMissing(false);
        setQuoteDataUnavailable(true);
      } else {
        setLoadError(error.message);
      }
    } finally {
      if (requestId.current === currentRequestId) setIsLoading(false);
    }
  }

  async function updateFilter(name, value) {
    const currentMetadataRequestId = ++metadataRequestId.current;
    const currentQuery = window.location.search.slice(1);
    const next = new URLSearchParams(currentQuery);
    let targetCurrency = selectedTargetCurrency;
    let sourceCurrency = selectedSourceCurrency;
    let country = selectedCountry;
    let amountValue = selectedAmountValue;
    let daysValue = selectedDaysValue;
    if (name === "sourceCurrency") {
      sourceCurrency = value;
      setSelectedSourceCurrency(value);
      next.delete("currency");
      const countryPairs = currencyPairsByCountry[country] ?? [];
      const targets = targetCurrenciesForSource(sourceCurrency, countryPairs);
      targetCurrency = targets.includes("EUR")
        ? "EUR"
        : targets.includes("GBP")
          ? "GBP"
          : targets[0];
      setSelectedTargetCurrency(targetCurrency);
      setAvailableCurrencies(targets);
      setAvailableSourceCurrencies(sourceCurrenciesForPairs(countryPairs));
    } else if (name === "senderCountry") {
      country = value;
      setSelectedCountry(value);
    } else if (name === "currency") {
      targetCurrency = value;
      setSelectedTargetCurrency(value);
    } else if (name === "gbpAmount") {
      amountValue = value;
      setSelectedAmountValue(amountValue);
    } else if (name === "days") {
      daysValue = Number(value);
      setSelectedDaysValue(daysValue);
    }
    if (value === "__all__") next.delete(name);
    else next.set(name, value);
    if (name === "senderCountry") {
      const metaParams = new URLSearchParams({ senderCountry: country });
      metaParams.set("sourceCurrency", sourceCurrency);
      try {
        const response = await fetch(`/api/${mode}/meta?${metaParams}`, {
          cache: "no-store",
        });
        const metadata = await response.json();
        if (metadataRequestId.current !== currentMetadataRequestId) return;
        if (!response.ok)
          throw new Error(metadata.error ?? "Currency options unavailable.");
        sourceCurrency = metadata.sourceCurrency;
        targetCurrency = metadata.currencies.includes("EUR")
          ? "EUR"
          : metadata.currencies.includes("GBP")
            ? "GBP"
            : metadata.currencies[0];
        setSelectedSourceCurrency(sourceCurrency);
        setSelectedTargetCurrency(targetCurrency);
        setAvailableCurrencies(metadata.currencies);
        setAvailableSourceCurrencies(metadata.sourceCurrencies);
        next.set("sourceCurrency", sourceCurrency);
        next.set("currency", targetCurrency);
      } catch (error) {
        if (error.message === "Quote configuration is unavailable.") {
          setCurrentSnapshots([]);
          setConversionFeesMissing(false);
          setLoadError("");
          setQuoteDataUnavailable(true);
        } else {
          setLoadError(error.message);
        }
        return;
      }
    }
    next.set("senderCountry", country);
    next.set("sourceCurrency", sourceCurrency);
    next.set("currency", targetCurrency);
    next.set("gbpAmount", amountValue);
    next.set("days", String(daysValue));
    if (next.toString() === currentQuery) return;
    updateUrl(next);
    loadQuotes(next);
  }

  function updateProviders(providers) {
    if (!providers.length) return;
    setSelectedProviders(providers);
    const currentQuery = window.location.search.slice(1);
    const next = new URLSearchParams(currentQuery);
    if (providers.length === DEFAULT_SELECTED_PROVIDERS.length) {
      next.delete("providers");
    } else {
      next.set("providers", providers.join(","));
    }
    if (next.toString() === currentQuery) return;
    updateUrl(next);
  }

  return (
    <>
      <FilterControls
        amounts={amounts}
        currencies={availableCurrencies}
        amount={selectedAmountValue}
        currency={selectedTargetCurrency}
        days={selectedDaysValue}
        senderCountry={selectedCountry}
        sourceCurrency={selectedSourceCurrency}
        sourceCurrencies={availableSourceCurrencies}
        selectedProviders={selectedProviders}
        isPending={isLoading}
        onFilterChange={updateFilter}
        onProvidersChange={updateProviders}
      />
      {conversionFeesMissing && (
        <div
          role="alert"
          className="mt-6 rounded-xl border border-amber-300 bg-amber-50 px-5 py-4 text-sm text-amber-950"
        >
          Conversion fees could not be loaded. International payment fees are
          temporarily unavailable and appear as —. Try refreshing the page.
        </div>
      )}
      {loadError && (
        <div
          role="alert"
          className="mt-6 rounded-xl border border-red-300 bg-red-50 px-5 py-4 text-sm text-red-950"
        >
          {loadError}
        </div>
      )}
      <Converter
        mode={mode}
        senderCountry={selectedCountry}
        sourceCurrency={selectedSourceCurrency}
        snapshots={quoteDataUnavailable ? [] : currentSnapshots}
        selectedDays={selectedDaysValue}
        selectedProviders={selectedProviders}
        isLoading={isLoading}
        emptyMessage={
          quoteDataUnavailable
            ? "Quote data does not exist."
            : "No saved quotes"
        }
      />
    </>
  );
}
