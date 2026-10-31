import AuthForm from "../../components/auth/auth-form";
import { safeCallbackURL } from "../../lib/auth-url.js";

export const metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }) {
  const params = await searchParams;
  const callbackURL = safeCallbackURL(params?.callbackURL);
  return <AuthForm mode="sign-in" callbackURL={callbackURL} />;
}
