import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "./auth.js";
import { roleForUser, USER_ROLES } from "./user-roles.js";

export async function requireSignedInUser(callbackURL) {
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(`/sign-in?callbackURL=${encodeURIComponent(callbackURL)}`);
  }
  return {
    ...session,
    user: {
      ...session.user,
      role: roleForUser(session.user),
    },
  };
}

export async function requireAdminUser(callbackURL = "/admin") {
  const session = await requireSignedInUser(callbackURL);
  if (session.user.role !== USER_ROLES.ADMIN) {
    redirect("/dashboard");
  }
  return session;
}
