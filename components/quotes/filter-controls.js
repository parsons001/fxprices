"use client";

import { SelectField } from "../ui/select-field";
import { SelectItem } from "../ui/select";
import { RANGE_OPTIONS, rangeLabel } from "../../lib/charts/chart-history";
import { SENDER_COUNTRIES } from "../../lib/config/sender-countries";
import { money } from "../../lib/utils/format";
import {
  DEFAULT_SELECTED_PROVIDERS,
  QUOTE_FILTER_OPTIONS,
} from "../../lib/quotes/provider-filters";
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

export default function FilterControls({
  amounts,
  currencies,
  amount,
  currency,
  days,
  selectedProviders = DEFAULT_SELECTED_PROVIDERS,
  senderCountry = "GB",
  sourceCurrency = "GBP",
  sourceCurrencies = [],
  isPending = false,
  onFilterChange,
  onProvidersChange,
}) {
  const providerAnchor = useComboboxAnchor();

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
          onValueChange={(value) => onFilterChange("senderCountry", value)}
        >
          {Object.entries(SENDER_COUNTRIES).map(([code, config]) => (
            <SelectItem key={code} value={code}>
              {config.name}
            </SelectItem>
          ))}
        </SelectField>
        <SelectField
          label="Source currency"
          name="sourceCurrency"
          value={sourceCurrency}
          onValueChange={(value) => onFilterChange("sourceCurrency", value)}
        >
          {sourceCurrencies.map((value) => (
            <SelectItem key={value} value={value}>
              {value}
            </SelectItem>
          ))}
        </SelectField>
        <SelectField
          label="Target currency"
          name="currency"
          value={currency}
          onValueChange={(value) => onFilterChange("currency", value)}
        >
          {currencies.map((value) => (
            <SelectItem key={value} value={value}>
              {value}
            </SelectItem>
          ))}
        </SelectField>
        <SelectField
          label="Amount"
          name="gbpAmount"
          value={String(amount)}
          onValueChange={(value) => onFilterChange("gbpAmount", value)}
        >
          {amounts.map((value) => (
            <SelectItem key={value} value={String(value)}>
              {money(value, sourceCurrency)}
            </SelectItem>
          ))}
        </SelectField>
        <SelectField
          label="Chart range"
          name="days"
          value={String(days)}
          onValueChange={(value) => onFilterChange("days", value)}
        >
          {RANGE_OPTIONS.map((value) => (
            <SelectItem key={value} value={String(value)}>
              {rangeLabel(value)}
            </SelectItem>
          ))}
        </SelectField>
        <div
          className="grid min-w-0 gap-2 text-sm font-medium leading-none xl:col-span-3"
          role="group"
          aria-labelledby="provider-filter-label"
        >
          <span id="provider-filter-label">Providers</span>
          <Combobox
            multiple
            autoHighlight
            items={QUOTE_FILTER_OPTIONS.map(({ value }) => value)}
            value={selectedProviders}
            onValueChange={onProvidersChange}
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
