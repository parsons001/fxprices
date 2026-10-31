import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "./auth.js";

export async function requireSignedInUser(callbackURL) {
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect(`/sign-in?callbackURL=${encodeURIComponent(callbackURL)}`);
  }
  return session;
}
