"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SelectField } from "../ui/select-field";
import { SelectItem } from "../ui/select";
import { RANGE_OPTIONS, rangeLabel } from "../../lib/charts/chart-history";
import { SENDER_COUNTRIES } from "../../lib/config/sender-countries";
import { money } from "../../lib/utils/format";
import {
  DEFAULT_SELECTED_PROVIDERS,
  QUOTE_FILTER_OPTIONS,
} from "../../lib/quotes/quote-filters";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "../ui/combobox";

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
  selectedProviders = DEFAULT_SELECTED_PROVIDERS,
  senderCountry = "GB",
  sourceCurrency = "GBP",
  onLoadingChange = () => {},
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
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
  const [providers, setProviders] = useState(selectedProviders);
  const providerAnchor = useComboboxAnchor();

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
    setProviders(selectedProviders);
  }, [amounts, currencies, searchParams, selectedProviders]);

  function updateFilter(name, value, setValue = () => {}) {
    const next = new URLSearchParams(searchParams.toString());
    if (name === "senderCountry") next.delete("currency");
    if (value === "__all__") next.delete(name);
    else next.set(name, value);
    if (next.toString() === searchParams.toString()) return;
    setValue(value);
    onLoadingChange(true);
    startTransition(() =>
      router.replace(`${pathname}${next.toString() ? `?${next}` : ""}`, {
        scroll: false,
      }),
    );
  }

  function updateProviders(nextProviders) {
    if (!nextProviders.length) return;
    const next = new URLSearchParams(searchParams.toString());
    if (nextProviders.length === DEFAULT_SELECTED_PROVIDERS.length) {
      next.delete("providers");
    } else {
      next.set("providers", nextProviders.join(","));
    }
    if (next.toString() === searchParams.toString()) return;
    setProviders(nextProviders);
    onLoadingChange(true);
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
          <p className="mt-1 text-xs text-muted-foreground">
            View saved quotes by market and amount.
          </p>
        </div>
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
        <div
          className="grid min-w-0 gap-2 text-sm font-medium leading-none xl:col-span-4"
          role="group"
          aria-labelledby="provider-filter-label"
        >
          <span id="provider-filter-label">Providers</span>
          <Combobox
            multiple
            autoHighlight
            items={QUOTE_FILTER_OPTIONS.map(({ value }) => value)}
            value={providers}
            onValueChange={updateProviders}
          >
            <ComboboxChips ref={providerAnchor}>
              <ComboboxValue>
                {(values) => (
                  <>
                    {values.map((value) => (
                      <ComboboxChip key={value}>
                        {
                          QUOTE_FILTER_OPTIONS.find(
                            (option) => option.value === value,
                          )?.label
                        }
                      </ComboboxChip>
                    ))}
                    <ComboboxChipsInput
                      aria-label="Select providers"
                      placeholder={values.length ? "" : "Select providers"}
                    />
                  </>
                )}
              </ComboboxValue>
            </ComboboxChips>
            <ComboboxContent anchor={providerAnchor}>
              <ComboboxEmpty>No providers found.</ComboboxEmpty>
              <ComboboxList>
                {(value) => (
                  <ComboboxItem key={value} value={value}>
                    {
                      QUOTE_FILTER_OPTIONS.find(
                        (option) => option.value === value,
                      )?.label
                    }
                  </ComboboxItem>
                )}
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
        </div>
      </div>
    </section>
  );
}
