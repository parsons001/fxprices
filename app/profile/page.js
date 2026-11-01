import { headers } from "next/headers";
import { requireSignedInUser } from "../../lib/auth-session.js";
import ProfileSettings from "../../components/auth/profile-settings.js";
import { getAuth } from "../../lib/auth.js";
import PageHeading from "../../components/layout/page-heading.js";

export const metadata = { title: "Your profile" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await requireSignedInUser("/profile");
  const auth = await getAuth();
  const accounts = await auth.api.listUserAccounts({
    headers: await headers(),
  });
  return (
    <>
      <PageHeading
        breadcrumb="Profile"
        title="Your profile"
        description="Manage your account information and security."
      />
      <main className="mx-auto max-w-[1440px] px-4 pb-10 sm:px-6 lg:px-8">
        <ProfileSettings user={session.user} accounts={accounts} />
      </main>
    </>
  );
}
