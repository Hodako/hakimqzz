/**
 * Centralized, type-safe employee and owner session resolution.
 * Prevents false "employee" role demotion for business owners.
 */

export function getActiveEmployeeSession(): any | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("cw_active_employee_session");
    if (!raw || raw === "null" || raw === "undefined" || raw === "{}" || raw.trim() === "") {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && (parsed.id || parsed.employee_id) && (parsed.name || parsed.full_name)) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function hasActiveEmployeeSession(): boolean {
  return getActiveEmployeeSession() !== null;
}

export function clearActiveEmployeeSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem("cw_active_employee_session");
    window.localStorage.removeItem("cw_active_session_role");
    window.localStorage.removeItem("cw_employee_device_link_id");
  } catch {}
}

/**
 * Accurately determines if the current session should be treated as an employee.
 * An authenticated shop owner (role === "owner" or "superadmin") is NEVER an employee
 * unless they have explicitly entered an active employee profile via PIN switcher.
 */
export function isUserEmployee(user: { role?: string } | null | undefined): boolean {
  if (!user) {
    return hasActiveEmployeeSession();
  }
  if (user.role === "owner" || user.role === "superadmin") {
    // True business owner is only treated as an employee if an active employee session is explicitly loaded
    return hasActiveEmployeeSession();
  }
  if (user.role === "employee") {
    return true;
  }
  return hasActiveEmployeeSession();
}
