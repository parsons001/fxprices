import { test } from "node:test";
import assert from "node:assert/strict";
import { roleForUser, USER_ROLES } from "../lib/user-roles.js";

test("roles default to standard and accept subscribed or admin assignments", () => {
  assert.equal(roleForUser({ email: "standard@example.com" }), "standard");
  assert.equal(roleForUser({ email: "admin@example.com" }), "standard");
  assert.equal(
    roleForUser({ email: "standard@example.com", role: "admin" }),
    USER_ROLES.ADMIN,
  );
  assert.equal(
    roleForUser({ email: "subscribed@example.com", role: "subscribed" }),
    "subscribed",
  );
  assert.equal(
    roleForUser({ email: "unknown@example.com", role: "owner" }),
    "standard",
  );
});
