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
  const isEmployee = user?.role === "employee";
  const isOwnerOnlyRoute =
    pathname === "/employees" ||
    pathname.startsWith("/employees/") ||
    pathname === "/settings" ||
    pathname.startsWith("/settings/") ||
    pathname === "/owners-wallet" ||
    pathname.startsWith("/owners-wallet/");

  const allowed =
    !user ||
    !isEmployee ||
    (!isOwnerOnlyRoute && (!required || canAccess(perms ?? undefined, required)));

  useEffect(() => {
    if (!allowed) {
      router.replace(user?.industry === "restaurant" ? "/restaurant" : "/dashboard");
    }
  }, [allowed, router, user?.industry]);

  if (!allowed) return null;

  return <>{children}</>;
}
