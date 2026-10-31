import AuthForm from "../../components/auth/auth-form";

export const metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage({ searchParams }) {
  const params = await searchParams;
  return (
    <AuthForm
      mode="reset-password"
      callbackURL="/convert"
      token={params?.token ?? ""}
    />
  );
}
