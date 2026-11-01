import { requireAdminUser } from "../../lib/auth-session.js";
import { getDatabase } from "../../lib/db/mongodb.js";
import { roleForUser } from "../../lib/user-roles.js";
import AdminUsersTable from "../../components/admin/admin-users-table.js";

export const metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await requireAdminUser("/admin");
  const database = await getDatabase();
  const users = await database
    .collection("user")
    .find(
      {},
      {
        projection: {
          name: 1,
          email: 1,
          emailVerified: 1,
          role: 1,
          banned: 1,
          createdAt: 1,
        },
      },
    )
    .sort({ createdAt: -1 })
    .limit(100)
    .toArray();

  return (
    <main className="mx-auto max-w-[1440px] px-4 pb-10 sm:px-6 lg:px-8">
      <header className="flex h-16 items-center gap-2 border-b bg-card text-sm">
        <span className="text-muted-foreground">Dashboard</span>
        <span aria-hidden="true" className="text-muted-foreground">
          /
        </span>
        <span className="font-medium">Admin</span>
      </header>
      <div className="pb-6 pt-7">
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
          Signed in as {session.user.email}. Showing up to 100 accounts.
        </p>
      </div>
      <AdminUsersTable
        currentUserId={session.user.id}
        users={users.map((user) => ({
          id: user._id.toString(),
          name: user.name ?? "",
          email: user.email,
          role: roleForUser(user),
          emailVerified: Boolean(user.emailVerified),
          banned: Boolean(user.banned),
          createdAt: user.createdAt?.toISOString() ?? null,
        }))}
      />
    </main>
  );
}
