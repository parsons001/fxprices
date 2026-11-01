import { headers } from "next/headers";
import { requireAdminUser } from "../../../../../lib/auth-session.js";
import { getAuth } from "../../../../../lib/auth.js";
import { USER_ROLES } from "../../../../../lib/user-roles.js";

const validRoles = new Set(Object.values(USER_ROLES));

export async function POST(request, { params }) {
  const session = await requireAdminUser("/admin");
  const { userId } = await params;
  if (!userId || userId === session.user.id) {
    return Response.json(
      { error: "You cannot change your own account from the admin page." },
      { status: 400 },
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const auth = await getAuth();
  const requestHeaders = await headers();
  try {
    if (body.action === "role") {
      if (!validRoles.has(body.role)) {
        return Response.json(
          { error: "Invalid subscriber type." },
          { status: 400 },
        );
      }
      await auth.api.setRole({
        body: { userId, role: body.role },
        headers: requestHeaders,
      });
    } else if (body.action === "suspend") {
      await auth.api.banUser({
        body: { userId, banReason: "Suspended by an administrator" },
        headers: requestHeaders,
      });
    } else if (body.action === "unsuspend") {
      await auth.api.unbanUser({
        body: { userId },
        headers: requestHeaders,
      });
    } else if (body.action === "delete") {
      await auth.api.removeUser({
        body: { userId },
        headers: requestHeaders,
      });
    } else {
      return Response.json(
        { error: "Unsupported admin action." },
        { status: 400 },
      );
    }
  } catch (error) {
    const status = error.statusCode ?? error.status;
    if (!Number.isInteger(status) || status >= 500) {
      console.error("Admin user action failed", error);
      return Response.json(
        { error: "The account could not be updated. Please try again." },
        { status: 500 },
      );
    }
    return Response.json(
      { error: error.message || "The admin action was rejected." },
      { status },
    );
  }

  return Response.json({ success: true });
}
