"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SelectField } from "./ui/select-field";
import { SelectItem } from "./ui/select";
import { useView } from "./view-tabs";
import { RANGE_OPTIONS, rangeLabel } from "../lib/chart-history";
import { SENDER_COUNTRIES } from "../lib/sender-countries";
import { money } from "../lib/format";



function getDefaultCurrency(currencies) {
  return currencies.includes("EUR") ? "EUR" : currencies.includes("GBP") ? "GBP" : currencies[0];
}

function getDefaultAmount(amounts) {
  return String(amounts.includes(1000) ? 1000 : amounts[0]);
}

function initialValue(searchParams, name, fallback, options) {
  const value = searchParams.get(name);
  return value && options.includes(value) ? value : fallback;
}

export default function FilterControls({ amounts, currencies, quoteDates = [], senderCountry = "GB", sourceCurrency = "GBP" }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const view = useView();
  const [, startTransition] = useTransition();
  const [amount, setAmount] = useState(() =>
    initialValue(searchParams, "gbpAmount", getDefaultAmount(amounts), amounts.map(String)),
  );
  const [currency, setCurrency] = useState(() =>
    initialValue(searchParams, "currency", getDefaultCurrency(currencies), currencies),
  );
  const [days, setDays] = useState(() =>
    initialValue(searchParams, "days", "30", RANGE_OPTIONS.map(String)),
  );

  useEffect(() => {
    setAmount(
      initialValue(searchParams, "gbpAmount", getDefaultAmount(amounts), amounts.map(String)),
    );
    setCurrency(initialValue(searchParams, "currency", getDefaultCurrency(currencies), currencies));
    setDays(
      initialValue(searchParams, "days", "30", RANGE_OPTIONS.map(String)),
    );
  }, [amounts, currencies, searchParams]);

  const quoteDate = initialValue(searchParams, "quoteDate", quoteDates[0] ?? "", quoteDates);

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
    <div
      className="grid grid-cols-4 items-end gap-4 rounded-xl border bg-card p-5 max-[600px]:grid-cols-1"
    >
      <SelectField label="Sending country" name="senderCountry" value={senderCountry}
        onValueChange={(value) => updateFilter("senderCountry", value)}>
        {Object.entries(SENDER_COUNTRIES).map(([code, config]) => <SelectItem key={code} value={code}>{config.name}</SelectItem>)}
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
        onValueChange={(value) => updateFilter("currency", value, setCurrency)}
      >
        {currencies.map((value) => (
          <SelectItem key={value} value={value}>
            {value}
          </SelectItem>
        ))}
      </SelectField>
      {view === "table" && (quoteDates.length ? (
        <SelectField label="Quote date" name="quoteDate" value={quoteDate}
          onValueChange={(value) => updateFilter("quoteDate", value)}>
          {quoteDates.map((date) => <SelectItem key={date} value={date}>
            {new Date(date).toLocaleString("en-GB", { timeZone: "UTC", dateStyle: "medium", timeStyle: "medium" })} UTC
          </SelectItem>)}
        </SelectField>
      ) : <p className="text-sm text-muted-foreground">No saved quote dates available.</p>)}
      {view === "graph" && (
        <SelectField
          label="History"
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
  );
}
