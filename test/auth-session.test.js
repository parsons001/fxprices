import { test } from "node:test";
import assert from "node:assert/strict";
import { safeCallbackURL } from "../lib/auth-url.js";

test("Authentication callback redirects stay on local app paths", () => {
  assert.equal(
    safeCallbackURL("/send?senderCountry=IE"),
    "/send?senderCountry=IE",
  );
  assert.equal(safeCallbackURL("https://example.com"), "/convert");
  assert.equal(safeCallbackURL("//example.com"), "/convert");
  assert.equal(safeCallbackURL("/\\example.com"), "/convert");
  assert.equal(safeCallbackURL(undefined), "/convert");
});
