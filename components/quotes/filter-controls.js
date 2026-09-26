"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SelectField } from "../ui/select-field";
import { SelectItem } from "../ui/select";
import { useView, ViewSwitcher } from "./view-tabs";
import { RANGE_OPTIONS, rangeLabel } from "../../lib/charts/chart-history";
import { SENDER_COUNTRIES } from "../../lib/config/sender-countries";
import { money } from "../../lib/utils/format";

function getDefaultCurrency(currencies) {
  return currencies.includes("EUR")
    ? "EUR"
    : currencies.includes("GBP")
      ? "GBP"
      : currencies[0];
}

function getDefaultAmount(amounts) {
  return String(amounts.includes(1000) ? 1000 : amounts[0]);
}

function initialValue(searchParams, name, fallback, options) {
  const value = searchParams.get(name);
  return value && options.includes(value) ? value : fallback;
}

export default function FilterControls({
  amounts,
  currencies,
  quoteDates = [],
  senderCountry = "GB",
  sourceCurrency = "GBP",
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const view = useView();
  const [isPending, startTransition] = useTransition();
  const [amount, setAmount] = useState(() =>
    initialValue(
      searchParams,
      "gbpAmount",
      getDefaultAmount(amounts),
      amounts.map(String),
    ),
  );
  const [currency, setCurrency] = useState(() =>
    initialValue(
      searchParams,
      "currency",
      getDefaultCurrency(currencies),
      currencies,
    ),
  );
  const [days, setDays] = useState(() =>
    initialValue(searchParams, "days", "30", RANGE_OPTIONS.map(String)),
  );

  useEffect(() => {
    setAmount(
      initialValue(
        searchParams,
        "gbpAmount",
        getDefaultAmount(amounts),
        amounts.map(String),
      ),
    );
    setCurrency(
      initialValue(
        searchParams,
        "currency",
        getDefaultCurrency(currencies),
        currencies,
      ),
    );
    setDays(
      initialValue(searchParams, "days", "30", RANGE_OPTIONS.map(String)),
    );
  }, [amounts, currencies, searchParams]);

  const quoteDate = initialValue(
    searchParams,
    "quoteDate",
    quoteDates[0] ?? "",
    quoteDates,
  );

  function updateFilter(name, value, setValue = () => {}) {
    setValue(value);
    const next = new URLSearchParams(searchParams.toString());
    if (name === "senderCountry") next.delete("currency");
    if (name !== "quoteDate") next.delete("quoteDate");
    if (value === "__all__") next.delete(name);
    else next.set(name, value);
    startTransition(() =>
      router.replace(`${pathname}${next.toString() ? `?${next}` : ""}`, {
        scroll: false,
      }),
    );
  }

  return (
    <section
      aria-labelledby="filter-heading"
      aria-busy={isPending}
      className="rounded-xl border bg-card"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 border-b px-5 py-4 sm:px-6">
        <div>
          <h2 id="filter-heading" className="text-sm font-semibold">
            Filters
          </h2>
          <p className="mt-1 text-xs text-muted-foreground" role="status">
            {isPending
              ? "Loading saved data…"
              : "View saved quotes by market and amount."}
          </p>
        </div>
        <ViewSwitcher />
      </div>
      <div className="grid grid-cols-1 items-end gap-4 p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-4">
        <SelectField
          label="Profile country"
          name="senderCountry"
          value={senderCountry}
          onValueChange={(value) => updateFilter("senderCountry", value)}
        >
          {Object.entries(SENDER_COUNTRIES).map(([code, config]) => (
            <SelectItem key={code} value={code}>
              {config.name}
            </SelectItem>
          ))}
        </SelectField>
        <SelectField
          label={`${sourceCurrency} amount`}
          name="gbpAmount"
          value={amount}
          onValueChange={(value) => updateFilter("gbpAmount", value, setAmount)}
        >
          {amounts.map((value) => (
            <SelectItem key={value} value={String(value)}>
              {money(value, sourceCurrency)}
            </SelectItem>
          ))}
        </SelectField>
        <SelectField
          label="Target currency"
          name="currency"
          value={currency}
          onValueChange={(value) =>
            updateFilter("currency", value, setCurrency)
          }
        >
          {currencies.map((value) => (
            <SelectItem key={value} value={value}>
              {value}
            </SelectItem>
          ))}
        </SelectField>
        {view === "table" &&
          (quoteDates.length ? (
            <SelectField
              label="Quote date"
              name="quoteDate"
              value={quoteDate}
              onValueChange={(value) => updateFilter("quoteDate", value)}
            >
              {quoteDates.map((date) => (
                <SelectItem key={date} value={date}>
                  {new Date(date).toLocaleString("en-GB", {
                    timeZone: "UTC",
                    dateStyle: "medium",
                    timeStyle: "medium",
                  })}{" "}
                  UTC
                </SelectItem>
              ))}
            </SelectField>
          ) : (
            <p className="text-sm text-muted-foreground">
              No saved quote dates available.
            </p>
          ))}
        {view === "graph" && (
          <SelectField
            label="Chart range"
            name="days"
            value={days}
            onValueChange={(value) => updateFilter("days", value, setDays)}
          >
            {RANGE_OPTIONS.map((value) => (
              <SelectItem key={value} value={String(value)}>
                {rangeLabel(value)}
              </SelectItem>
            ))}
          </SelectField>
        )}
      </div>
    </section>
  );
}
