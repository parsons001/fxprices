import { headers } from "next/headers";
import { requireSignedInUser } from "../../lib/auth-session.js";
import ProfileSettings from "../../components/auth/profile-settings.js";
import { getAuth } from "../../lib/auth.js";

export const metadata = { title: "Your profile" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await requireSignedInUser("/profile");
  const auth = await getAuth();
  const accounts = await auth.api.listUserAccounts({
    headers: await headers(),
  });
  return (
    <main className="mx-auto max-w-[1440px] px-4 pb-10 sm:px-6 lg:px-8">
      <header className="flex h-16 items-center gap-2 border-b bg-card text-sm">
        <span className="text-muted-foreground">Dashboard</span>
        <span aria-hidden="true" className="text-muted-foreground">
          /
        </span>
        <span className="font-medium">Profile</span>
      </header>
      <div className="pb-6 pt-7">
        <h1 className="text-2xl font-semibold tracking-tight">Your profile</h1>
        <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
          Manage your account information and security.
        </p>
      </div>
      <ProfileSettings user={session.user} accounts={accounts} />
    </main>
  );
}
