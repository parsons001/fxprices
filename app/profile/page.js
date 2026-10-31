import Link from "next/link";
import { requireSignedInUser } from "../../lib/auth-session.js";

export const metadata = { title: "Your profile" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await requireSignedInUser("/profile");
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <section className="rounded-xl border bg-card p-6 sm:p-8">
        <p className="text-sm font-medium text-muted-foreground">Account</p>
        <h1 className="mt-2 text-2xl font-semibold">Your profile</h1>
        <dl className="mt-6 grid gap-4 text-sm">
          <div>
            <dt className="text-muted-foreground">Name</dt>
            <dd className="mt-1 font-medium">{session.user.name}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Email</dt>
            <dd className="mt-1 font-medium">{session.user.email}</dd>
          </div>
        </dl>
        <Link
          href="/convert"
          className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Return to quotes
        </Link>
      </section>
    </main>
  );
}
