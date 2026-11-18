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
    user = await db.collection("users").findOne({
      $or: [{ _id: payload.userId as any }, { firebase_uid: payload.userId }],
    } as any);
    const cleanPayloadEmail = (payload.email || "").toLowerCase().trim();
    const isGenericFallbackEmail = !cleanPayloadEmail || ["user@pos.local", "user@classicworld.pos", "user@classicworld.com"].includes(cleanPayloadEmail);
    if (!user && !isGenericFallbackEmail) {
      user = await db.collection("users").findOne({ email: cleanPayloadEmail } as any);
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

        if (!emp || !emp.owner_id || ["classicworld_default_owner", "classic-world-default"].includes(emp.owner_id)) {
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
        throw new Error("Unauthorized: Account not found.");
      }
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

  // Strict Authoritarian Owner Resolution: Never allow shared fallback owner IDs
  let resolvedOwnerId = user.owner_id;
  if (role === "employee") {
    if (!resolvedOwnerId || resolvedOwnerId === user._id || ["classicworld_default_owner", "classic-world-default"].includes(resolvedOwnerId)) {
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
      if (emp && emp.owner_id && !["classicworld_default_owner", "classic-world-default", user._id].includes(emp.owner_id)) {
        resolvedOwnerId = emp.owner_id;
        try {
          await db.collection("users").updateOne(
            { _id: user._id as any },
            { $set: { owner_id: emp.owner_id } }
          );
          user.owner_id = emp.owner_id;
          sessionUserCache.delete(payload.userId);
        } catch (_) {}
      } else {
        throw new Error("Unauthorized: Employee has no linked store owner.");
      }
    }
  } else if (role === "owner") {
    // If owner record previously inherited a corrupt or fallback owner_id, strictly re-anchor to their own unique user._id
    if (!user.owner_id || ["classicworld_default_owner", "classic-world-default", "owner"].includes(user.owner_id)) {
      user.owner_id = user._id;
      resolvedOwnerId = user._id;
      try {
        const db = await getDb();
        await db.collection("users").updateOne({ _id: user._id as any }, { $set: { owner_id: user._id } });
        sessionUserCache.delete(payload.userId);
      } catch (_) {}
    }
  }

  const ownerIdBase = role === "employee" ? (resolvedOwnerId as string) : (user._id as any as string);
  if (!ownerIdBase || ["classicworld_default_owner", "classic-world-default"].includes(ownerIdBase)) {
    throw new Error("Unauthorized: Invalid tenant identity.");
  }

  // Validate activeProfile against owner's declared profiles; employees stay on default
  let validatedProfile = "default";
  if (activeProfile !== "default" && role !== "employee") {
    const userProfiles = Array.isArray(user.profiles) ? user.profiles : [];
    const hasProfile = userProfiles.some((p: any) => p?.id === activeProfile);
    if (hasProfile) {
      validatedProfile = activeProfile;
    }
  }

  const ownerId = validatedProfile === "default" ? ownerIdBase : `${ownerIdBase}:${validatedProfile}`;
  let resolvedBusinessId = validatedProfile === "default" ? businessId : null;
  if (validatedProfile !== "default") {
    try {
      const db = await getDb();
      const profBiz = await db.collection("businesses").findOne({ owner_id: ownerId } as any);
      if (profBiz) resolvedBusinessId = profBiz._id as any as string;
    } catch (_) {}
  }
  const permissions = (user.permissions as PermissionSet) || (role === "owner" ? OWNER_PERMISSIONS : {});

  return {
    userId: user._id as any as string,
    ownerId,
    email: user.email as string,
    role,
    businessId: resolvedBusinessId,
    activated,
    permissions: role === "owner" ? OWNER_PERMISSIONS : permissions,
    profileId: validatedProfile,
  };
}

export function generateLicenseKey(prefix: string) {
  const seg = () => crypto.randomUUID().replace(/-/g, "").slice(0, 4).toUpperCase();
  return `${prefix}-${seg()}-${seg()}-${seg()}`;
}
