import { cookies, headers } from "next/headers";
import { getDb } from "@/lib/db";
import { verifyToken } from "@/lib/auth-helpers";
import { requestStore } from "@/lib/request-store";
import type { PermissionSet } from "@/lib/permissions";
import { OWNER_PERMISSIONS, resolvePermissions } from "@/lib/permissions";

export type AppSession = {
  userId: string;
  ownerId: string;
  email: string;
  role: "owner" | "employee" | "superadmin";
  businessId: string | null;
  activated: boolean;
  permissions: PermissionSet;
  profileId: string;
};

export async function requireSession(requireActivated = true): Promise<AppSession> {
  const store = requestStore.getStore();
  let token = store?.token;
  const cookieStore = await cookies();

  if (!token) {
    token = cookieStore.get("token")?.value;
  }

  if (!token) {
    const headersList = await headers();
    const authHeader = headersList.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    }
  }

  if (!token) throw new Error("Unauthorized");
  const payload = await verifyToken(token);
  if (!payload) throw new Error("Unauthorized");

  const db = await getDb();
  let user: any = await db.collection("users").findOne({
    $or: [{ _id: payload.userId as any }, { firebase_uid: payload.userId }],
  } as any);
  const cleanPayloadEmail = (payload.email || "").toLowerCase().trim();
  const isGenericFallbackEmail = !cleanPayloadEmail || ["user@pos.local", "user@urobili.pos", "user@urobili.com"].includes(cleanPayloadEmail);
  if (!user && !isGenericFallbackEmail) {
    if (payload.role === "owner" || payload.role === "superadmin") {
      user = await db.collection("users").findOne({ email: cleanPayloadEmail, role: payload.role } as any);
    }
    if (!user) {
      user = await db.collection("users").findOne({ email: cleanPayloadEmail } as any);
    }
  }
  if (!user) {
    const isEmp = payload.role === "employee" || String(payload.userId).includes("emp");
    if (isEmp) {
      const cleanEmpId = String(payload.userId).replace(/^emp_/, "");
      const emp = await db.collection("employees").findOne({
        $or: [
          { _id: payload.userId as any },
          { _id: cleanEmpId as any },
          ...(payload.email && !isGenericFallbackEmail ? [{ email: payload.email }] : []),
          ...(cleanPayloadEmail && !isGenericFallbackEmail ? [{ email: cleanPayloadEmail }] : []),
        ],
      } as any);

      if (!emp || !emp.owner_id || ["urobili_default_owner", "urobili-default"].includes(emp.owner_id)) {
        throw new Error("Unauthorized: Employee has no linked store owner.");
      }

      const now = new Date().toISOString();
      user = {
        _id: payload.userId,
        employee_id: emp._id,
        email: emp.email || (isGenericFallbackEmail ? `${payload.userId}@pos.local` : cleanPayloadEmail),
        full_name: emp.name || "Employee",
        role: "employee",
        owner_id: emp.owner_id,
        permissions: emp.permissions || {},
        activated: true,
        status: emp.status || "active",
        created_at: now,
        updated_at: now,
      };
      try {
        await db.collection("users").insertOne(user as any);
      } catch (_) {}
    } else {
      const now = new Date().toISOString();
      const uniqueEmail = isGenericFallbackEmail ? `${payload.userId}@pos.local` : cleanPayloadEmail;
      user = {
        _id: payload.userId,
        email: uniqueEmail,
        full_name: "Shop Owner",
        role: "owner",
        owner_id: payload.userId,
        activated: true,
        status: "active",
        created_at: now,
        updated_at: now,
      };
      try {
        await db.collection("users").insertOne(user as any);
      } catch (_) {}
    }
  }

  const role = (user.role as AppSession["role"]) || (payload.role as AppSession["role"]) || "owner";
  const activated = true;

  // Strict Authoritarian Owner Resolution: Never allow shared fallback owner IDs
  if (role === "employee") {
    let resolvedOwnerId = user.owner_id;
    if (!resolvedOwnerId || resolvedOwnerId === user._id || ["urobili_default_owner", "urobili-default"].includes(resolvedOwnerId)) {
      const emp = await db.collection("employees").findOne({
        $or: [
          { _id: user._id as any },
          { _id: (user as any).employee_id as any },
          ...(user.phone ? [{ phone: user.phone }] : []),
          ...(user.email ? [{ email: user.email }] : []),
          ...(user.username ? [{ username: user.username }] : []),
        ],
      } as any);
      if (emp && emp.owner_id && !["urobili_default_owner", "urobili-default", user._id].includes(emp.owner_id)) {
        resolvedOwnerId = emp.owner_id;
        try {
          await db.collection("users").updateOne({ _id: user._id as any }, { $set: { owner_id: emp.owner_id } });
          user.owner_id = emp.owner_id;
        } catch (_) {}
      } else {
        throw new Error("Unauthorized: Employee has no linked store owner.");
      }
    }
  } else if (role === "owner") {
    // If owner record previously inherited a corrupt or fallback owner_id, strictly re-anchor to their own unique user._id
    if (!user.owner_id || ["urobili_default_owner", "urobili-default", "owner"].includes(user.owner_id)) {
      user.owner_id = user._id;
      try {
        await db.collection("users").updateOne({ _id: user._id as any }, { $set: { owner_id: user._id } });
      } catch (_) {}
    }
  }

  const businessId = (user.business_id as string) || null;
  if (businessId) {
    const biz = await db.collection("businesses").findOne({ _id: businessId } as any);
    if (biz && biz.status === "suspended") {
      throw new Error("Business suspended. Please contact administrator.");
    }
  }

  const activeProfile = store?.activeProfile || cookieStore.get("active_profile")?.value || "default";
  const ownerIdBase = role === "employee" ? (user.owner_id as string) : (user._id as any as string);
  if (!ownerIdBase || ["urobili_default_owner", "urobili-default"].includes(ownerIdBase)) {
    throw new Error("Unauthorized: Invalid tenant identity.");
  }
  const ownerId = activeProfile === "default" ? ownerIdBase : `${ownerIdBase}:${activeProfile}`;
  let resolvedBusinessId = activeProfile === "default" ? businessId : null;
  if (activeProfile !== "default") {
    try {
      const profBiz = await db.collection("businesses").findOne({ owner_id: ownerId } as any);
      if (profBiz) resolvedBusinessId = profBiz._id as any as string;
    } catch (_) {}
  }
  const permissions = (user.permissions as PermissionSet) || (role === "owner" ? OWNER_PERMISSIONS : {});
  const resolvedPermissions = role === "owner" ? OWNER_PERMISSIONS : resolvePermissions(role, user.permissions);

  // Authoritarian status enforcement
  if (user.status === "suspended" || user.status === "frozen" || user.status === "banned") {
    throw new Error("Account suspended or frozen. Please contact administrator.");
  }

  // Bind tenant identity to the current AsyncLocalStorage request scope for database-level isolation
  if (store) {
    store.ownerId = ownerId;
    store.userId = user._id as any as string;
    store.role = role;
  }

  return {
    userId: user._id as any as string,
    ownerId,
    email: user.email as string,
    role,
    businessId: resolvedBusinessId,
    activated,
    permissions: resolvedPermissions,
    profileId: activeProfile,
  };
}

/** Authoritarian RBAC check: throws 403 Forbidden if user lacks the required permission. */
export function requirePermission(session: AppSession, perm: keyof PermissionSet): void {
  if (session.role === "owner" || session.role === "superadmin") return;
  if (!session.permissions || !session.permissions[perm]) {
    const err = new Error(`Access denied: missing '${String(perm)}' permission`);
    (err as any).statusCode = 403;
    throw err;
  }
}

/** Authoritarian Owner-only check: throws 403 Forbidden for staff/employees. */
export function requireOwner(session: AppSession, actionDesc = "perform this action"): void {
  if (session.role !== "owner" && session.role !== "superadmin") {
    const err = new Error(`Access denied: only the business owner can ${actionDesc}`);
    (err as any).statusCode = 403;
    throw err;
  }
}

export function generateLicenseKey(prefix: string) {
  const seg = () => crypto.randomUUID().replace(/-/g, "").slice(0, 4).toUpperCase();
  return `${prefix}-${seg()}-${seg()}-${seg()}`;
}
