import { test } from "node:test";
import assert from "node:assert/strict";
import { describeSessionDevice } from "../lib/session-device.js";

test("describes a desktop browser and operating system", () => {
  assert.equal(
    describeSessionDevice(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    ),
    "Chrome 120.0.0.0 · macOS 10.15.7 · Desktop",
  );
});

test("describes a mobile browser and operating system", () => {
  assert.equal(
    describeSessionDevice(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    ),
    "Safari 17.0 · iOS 17.0 · iPhone",
  );
});

test("prioritizes Edge over its Chromium base and detects tablets", () => {
  assert.equal(
    describeSessionDevice(
      "Mozilla/5.0 (Linux; Android 10; Tablet) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36 EdgA/120.0.0.0",
    ),
    "Microsoft Edge 120.0.0.0 · Android 10 · Tablet",
  );
});

test("includes Android models and friendly Windows versions", () => {
  assert.equal(
    describeSessionDevice(
      "Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP2A.240105.002) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36",
    ),
    "Chrome 120.0.0.0 · Android 14 · Pixel 8 · Mobile device",
  );
  assert.equal(
    describeSessionDevice(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    ),
    "Chrome 120.0.0.0 · Windows 10 or 11 · Desktop",
  );
});

test("handles missing or unrecognized user agents", () => {
  assert.equal(describeSessionDevice(undefined), "Unknown device");
  assert.equal(describeSessionDevice("CustomClient/1.0"), "Unknown device");
});
