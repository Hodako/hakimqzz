"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { canAccess, permissionForPath, resolvePermissions } from "@/lib/permissions";

/** Redirects employees away from routes they lack permission for. */
export function PermissionGuard({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname() || "";
  const router = useRouter();

  const perms = user ? resolvePermissions(user.role, user.permissions) : null;
  const required = permissionForPath(pathname);
  // Allow access if no user (public/auth page), or route requires no permission, or user has required permission
  const allowed = !user || (!required || canAccess(perms ?? undefined, required));

  useEffect(() => {
    if (!allowed) {
      router.replace("/dashboard");
    }
  }, [allowed, router]);

  if (!allowed) return null;

  return <>{children}</>;
}
