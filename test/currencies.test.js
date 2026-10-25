import { test } from "node:test";
import assert from "node:assert/strict";
import {
  defaultQuoteAmount,
  getCurrencySettings,
  parseGlobalCurrencySettings,
} from "../lib/config/currencies.js";

test("Default quote amount uses 1000 when configured, otherwise the first configured amount", () => {
  assert.equal(defaultQuoteAmount([250, 1000, 500]), 1000);
  assert.equal(defaultQuoteAmount([250, 500]), 250);
});

test("Global Config currency settings normalize currencies and preserve amount values", () => {
  const settings = parseGlobalCurrencySettings({
    FX_CURRENCY_PAIRS: {
      GB: ["GBP:usd", "GBP:EUR", "GBP:USD"],
      IE: ["EUR:GBP", "GBP:USD"],
    },
    FX_AMOUNTS: [250, 1000, 250],
  });
  assert.deepEqual(settings.amounts, [250, 1000]);
  assert.ok(
    settings.currencyPairs.GB.some(
      ({ sourceCurrency, currency }) =>
        sourceCurrency === "GBP" && currency === "USD",
    ),
  );
  assert.ok(
    settings.currencyPairs.IE.some(
      ({ sourceCurrency, currency }) =>
        sourceCurrency === "EUR" && currency === "GBP",
    ),
  );
  assert.deepEqual(settings.currencyPairs.GB, [
    { sourceCurrency: "GBP", currency: "USD" },
    { sourceCurrency: "GBP", currency: "EUR" },
  ]);
});

test("Global Config rejects malformed currencies and amounts", () => {
  assert.throws(
    () =>
      parseGlobalCurrencySettings({
        FX_CURRENCY_PAIRS: { GB: ["GBP:US"], IE: ["EUR:EUR"] },
        FX_AMOUNTS: [100],
      }),
    /SOURCE:TARGET/,
  );
  assert.throws(
    () =>
      parseGlobalCurrencySettings({
        FX_CURRENCY_PAIRS: { GB: ["GBP:EUR"], IE: ["EUR:EUR"] },
        FX_AMOUNTS: [100, 0],
      }),
    /positive finite numbers/,
  );
});

test("Global Config requires a country map and numeric amount array", () => {
  assert.throws(
    () =>
      parseGlobalCurrencySettings({
        FX_CURRENCY_PAIRS: "GBP:EUR",
        FX_AMOUNTS: [100],
      }),
    /FX_CURRENCY_PAIRS.*object/,
  );
  assert.throws(
    () =>
      parseGlobalCurrencySettings({
        FX_CURRENCY_PAIRS: { GB: ["GBP:EUR"], IE: ["EUR:EUR"] },
        FX_AMOUNTS: "100,500",
      }),
    /FX_AMOUNTS.*array/,
  );
  assert.throws(
    () =>
      parseGlobalCurrencySettings({
        FX_CURRENCY_PAIRS: { GB: ["GBP:EUR"], IE: ["EUR:EUR"] },
        FX_AMOUNTS: ["100"],
      }),
    /only positive finite numbers/,
  );
});

test("Global Config requires a pair list for every supported profile country", () => {
  assert.throws(
    () =>
      parseGlobalCurrencySettings({
        FX_CURRENCY_PAIRS: { GB: ["GBP:EUR"] },
        FX_AMOUNTS: [100],
      }),
    /FX_CURRENCY_PAIRS\.IE/,
  );
});

test("Global Config settings are required and do not fall back", () => {
  assert.throws(
    () => parseGlobalCurrencySettings(),
    /Global Config key "FX_CURRENCY_PAIRS" is required/,
  );
  assert.throws(
    () =>
      parseGlobalCurrencySettings({
        FX_CURRENCY_PAIRS: { GB: ["GBP:EUR"], IE: ["EUR:EUR"] },
      }),
    /Global Config key "FX_AMOUNTS" is required/,
  );
});

test("Missing Global Config connection is reported by the SDK", async () => {
  const globalConfig = process.env.GLOBAL_CONFIG;
  const edgeConfig = process.env.EDGE_CONFIG;
  delete process.env.GLOBAL_CONFIG;
  delete process.env.EDGE_CONFIG;
  try {
    await assert.rejects(getCurrencySettings());
  } finally {
    if (globalConfig === undefined) delete process.env.GLOBAL_CONFIG;
    else process.env.GLOBAL_CONFIG = globalConfig;
    if (edgeConfig === undefined) delete process.env.EDGE_CONFIG;
    else process.env.EDGE_CONFIG = edgeConfig;
  }
});
