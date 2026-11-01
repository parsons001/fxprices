export const USER_ROLES = Object.freeze({
  STANDARD: "standard",
  SUBSCRIBED: "subscribed",
  ADMIN: "admin",
});

const VALID_ROLES = new Set(Object.values(USER_ROLES));

export function roleForUser(user = {}) {
  return VALID_ROLES.has(user.role) ? user.role : USER_ROLES.STANDARD;
}
