import { test } from "node:test";
import assert from "node:assert/strict";
import {
  formatRoleLabel,
  roleForUser,
  roleLabelForUser,
  USER_ROLES,
} from "../lib/user-roles.js";

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

test("role labels capitalize their first letter without changing stored roles", () => {
  assert.equal(formatRoleLabel(USER_ROLES.STANDARD), "Standard");
  assert.equal(formatRoleLabel(USER_ROLES.SUBSCRIBED), "Subscribed");
  assert.equal(roleLabelForUser({ role: USER_ROLES.ADMIN }), "Admin");
});
