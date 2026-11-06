import Link from "next/link";
import { notFound } from "next/navigation";
import { ObjectId } from "mongodb";
import { requireAdminUser } from "../../../../lib/auth-session.js";
import { getDatabase } from "../../../../lib/db/mongodb.js";
import { roleForUser } from "../../../../lib/user-roles.js";
import LocalizedDate from "../../../../components/layout/localized-date.js";
import PageHeading from "../../../../components/layout/page-heading.js";
import { Button } from "../../../../components/ui/button.js";
import { Card } from "../../../../components/ui/card.js";

export const metadata = { title: "Admin user details" };
export const dynamic = "force-dynamic";

function toISOString(value) {
  return value instanceof Date && !Number.isNaN(value.valueOf())
    ? value.toISOString()
    : null;
}

export default async function AdminUserDetailsPage({ params }) {
  await requireAdminUser("/admin");
  const { userId } = await params;
  if (!/^[\da-f]{24}$/i.test(userId)) notFound();

  const databaseUserId = new ObjectId(userId);
  const database = await getDatabase();
  const user = await database
    .collection("user")
    .findOne({ _id: databaseUserId });

  if (!user) notFound();

  const now = new Date();
  const [accounts, activeSessionCount, sessions] = await Promise.all([
    database
      .collection("auth_accounts")
      .find(
        { userId: databaseUserId },
        { projection: { providerId: 1, createdAt: 1 } },
      )
      .sort({ createdAt: -1 })
      .toArray(),
    database.collection("session").countDocuments({
      userId: databaseUserId,
      expiresAt: { $gt: now },
    }),
    database
      .collection("session")
      .find(
        { userId: databaseUserId, expiresAt: { $gt: now } },
        {
          projection: {
            createdAt: 1,
            updatedAt: 1,
            expiresAt: 1,
            userAgent: 1,
          },
        },
      )
      .sort({ expiresAt: -1 })
      .limit(25)
      .toArray(),
  ]);
  const isSuspended = Boolean(user.banned);

  return (
    <>
      <PageHeading
        breadcrumb="Admin"
        title={user.name || user.email}
        description="Review account information, linked sign-in methods, and active sessions."
      />
      <main className="mx-auto grid max-w-[1440px] gap-6 px-4 pb-10 sm:px-6 lg:px-8">
        <div>
          <Button as={Link} href="/admin" variant="outline" size="sm">
            Back to users
          </Button>
        </div>

        <Card as="section" className="p-5 sm:p-6">
          <h2 className="font-semibold">Account</h2>
          <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <dt className="text-muted-foreground">Email</dt>
              <dd className="mt-1 break-all font-medium">{user.email}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Name</dt>
              <dd className="mt-1 font-medium">{user.name || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Role</dt>
              <dd className="mt-1 font-medium">{roleForUser(user)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Email status</dt>
              <dd className="mt-1 font-medium">
                {user.emailVerified ? "Verified" : "Unverified"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Account status</dt>
              <dd className="mt-1 font-medium">
                {isSuspended ? "Suspended" : "Active"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Member since</dt>
              <dd className="mt-1 font-medium">
                <LocalizedDate
                  value={toISOString(user.createdAt)}
                  options={{ dateStyle: "medium" }}
                />
              </dd>
            </div>
            {isSuspended && user.banReason && (
              <div>
                <dt className="text-muted-foreground">Suspension reason</dt>
                <dd className="mt-1 font-medium">{user.banReason}</dd>
              </div>
            )}
            {isSuspended && user.banExpires && (
              <div>
                <dt className="text-muted-foreground">Suspension expires</dt>
                <dd className="mt-1 font-medium">
                  <LocalizedDate
                    value={toISOString(user.banExpires)}
                    options={{ dateStyle: "medium", timeStyle: "short" }}
                  />
                </dd>
              </div>
            )}
          </dl>
        </Card>

        <Card as="section" className="p-5 sm:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-semibold">Sign-in methods</h2>
            <p className="text-sm text-muted-foreground">
              {accounts.length} linked{" "}
              {accounts.length === 1 ? "method" : "methods"}
            </p>
          </div>
          {accounts.length ? (
            <ul className="mt-4 divide-y">
              {accounts.map((account) => (
                <li
                  key={`${account.providerId}-${account._id}`}
                  className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm first:pt-0 last:pb-0"
                >
                  <span className="font-medium">{account.providerId}</span>
                  <span className="text-muted-foreground">
                    Linked{" "}
                    <LocalizedDate
                      value={toISOString(account.createdAt)}
                      options={{ dateStyle: "medium" }}
                    />
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              No linked sign-in methods found.
            </p>
          )}
        </Card>

        <Card as="section" className="overflow-hidden">
          <div className="flex flex-wrap items-baseline justify-between gap-2 p-5 sm:p-6">
            <h2 className="font-semibold">Active sessions</h2>
            <p className="text-sm text-muted-foreground">
              {activeSessionCount}{" "}
              {activeSessionCount === 1 ? "session" : "sessions"}
              {activeSessionCount > sessions.length
                ? " (showing latest 25)"
                : ""}
            </p>
          </div>
          {sessions.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-y bg-muted/40 text-xs text-muted-foreground">
                    <th scope="col" className="px-5 py-3 font-medium">
                      Device
                    </th>
                    <th scope="col" className="px-5 py-3 font-medium">
                      Started
                    </th>
                    <th scope="col" className="px-5 py-3 font-medium">
                      Last updated
                    </th>
                    <th scope="col" className="px-5 py-3 font-medium">
                      Expires
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session) => (
                    <tr key={session._id} className="border-b last:border-0">
                      <td className="max-w-sm px-5 py-3.5">
                        <span className="line-clamp-2">
                          {session.userAgent || "Unknown device"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5">
                        <LocalizedDate
                          value={toISOString(session.createdAt)}
                          options={{ dateStyle: "medium", timeStyle: "short" }}
                        />
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5">
                        <LocalizedDate
                          value={toISOString(session.updatedAt)}
                          options={{ dateStyle: "medium", timeStyle: "short" }}
                        />
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5">
                        <LocalizedDate
                          value={toISOString(session.expiresAt)}
                          options={{ dateStyle: "medium", timeStyle: "short" }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="border-t px-5 py-8 text-center text-sm text-muted-foreground">
              No active sessions.
            </p>
          )}
        </Card>
      </main>
    </>
  );
}
