import AuthForm from "../../components/auth/auth-form";
import { safeCallbackURL } from "../../lib/auth-url.js";

export const metadata = { title: "Create account" };

export default async function SignUpPage({ searchParams }) {
  const params = await searchParams;
  const callbackURL = safeCallbackURL(params?.callbackURL);
  return <AuthForm mode="sign-up" callbackURL={callbackURL} />;
}
