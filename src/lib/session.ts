import { cookies, headers } from "next/headers";
import { getDb } from "@/lib/db";
import { verifyToken } from "@/lib/auth-helpers";
import { requestStore } from "@/lib/request-store";
import type { PermissionSet } from "@/lib/permissions";
import { OWNER_PERMISSIONS } from "@/lib/permissions";

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

// In-memory session cache to avoid repeated roundtrips across international networks to MongoDB Atlas
interface CachedSessionUser {
  user: any;
  cachedAt: number;
}
const sessionUserCache = new Map<string, CachedSessionUser>();
const SESSION_CACHE_TTL_MS = 30000; // 30 seconds

export function clearSessionUserCache(userId?: string) {
  if (userId) {
    sessionUserCache.delete(userId);
  } else {
    sessionUserCache.clear();
  }
}

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

  const nowTime = Date.now();
  let user: any = null;
  const cached = sessionUserCache.get(payload.userId);
  if (cached && nowTime - cached.cachedAt < SESSION_CACHE_TTL_MS) {
    user = cached.user;
  }

  if (!user) {
    const db = await getDb();
    user = await db.collection("users").findOne({ _id: payload.userId } as any);
    if (!user && payload.email) {
      user = await db.collection("users").findOne({ email: payload.email.toLowerCase().trim() } as any);
    }
    if (!user) {
      const isEmp = payload.role === "employee" || String(payload.userId).includes("emp");
      const newOwnerId = isEmp ? "classicworld_default_owner" : payload.userId;
      const now = new Date().toISOString();
      user = {
        _id: payload.userId,
        email: payload.email || "user@classicworld.pos",
        full_name: isEmp ? "Employee" : "Shop Owner",
        role: isEmp ? "employee" : "owner",
        owner_id: newOwnerId,
        activated: true,
        status: "active",
        created_at: now,
        updated_at: now,
      };
      try {
        await db.collection("users").insertOne(user as any);
      } catch (_) {}
    }
    if (user) {
      sessionUserCache.set(payload.userId, { user, cachedAt: nowTime });
    }
  }

  const role = (user.role as AppSession["role"]) || (payload.role as AppSession["role"]) || "owner";
  const activated = true;

  const businessId = (user.business_id as string) || null;
  if (businessId) {
    const db = await getDb();
    const biz = await db.collection("businesses").findOne({ _id: businessId } as any);
    if (biz && biz.status === "suspended") {
      throw new Error("Business suspended. Please contact administrator.");
    }
  }

  const activeProfile = store?.activeProfile || cookieStore.get("active_profile")?.value || "default";

  let resolvedOwnerId = user.owner_id;
  // If employee's owner_id is missing, self-referencing, or fallback, auto-resolve to real shop owner
  if (role === "employee" && (!resolvedOwnerId || resolvedOwnerId === user._id || resolvedOwnerId === "classicworld_default_owner")) {
    const db = await getDb();
    const emp = await db.collection("employees").findOne({
      $or: [
        { _id: user._id as any },
        { _id: (user as any).employee_id as any },
        ...(user.phone ? [{ phone: user.phone }] : []),
        ...(user.email ? [{ email: user.email }] : []),
        ...(user.username ? [{ username: user.username }] : []),
        ...((user as any).login_code ? [{ login_code: (user as any).login_code }] : []),
      ]
    });
    if (emp && emp.owner_id && emp.owner_id !== user._id) {
      resolvedOwnerId = emp.owner_id;
      try {
        await db.collection("users").updateOne(
          { _id: user._id as any },
          { $set: { owner_id: emp.owner_id } }
        );
        user.owner_id = emp.owner_id;
        sessionUserCache.delete(payload.userId);
      } catch (_) {}
    }
  }

  const isOwner = role === "owner" && (!user.owner_id || user.owner_id === user._id);
  const ownerIdBase = isOwner ? (user._id as any as string) : (resolvedOwnerId || (user._id as any as string));
  const ownerId = activeProfile === "default" ? ownerIdBase : `${ownerIdBase}:${activeProfile}`;
  const permissions = (user.permissions as PermissionSet) || (role === "owner" ? OWNER_PERMISSIONS : {});

  return {
    userId: user._id as any as string,
    ownerId,
    email: user.email as string,
    role,
    businessId,
    activated,
    permissions: role === "owner" ? OWNER_PERMISSIONS : permissions,
    profileId: activeProfile,
  };
}

export function generateLicenseKey(prefix: string) {
  const seg = () => crypto.randomUUID().replace(/-/g, "").slice(0, 4).toUpperCase();
  return `${prefix}-${seg()}-${seg()}-${seg()}`;
}
