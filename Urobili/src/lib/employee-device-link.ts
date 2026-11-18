import type { AuthUser } from "@/hooks/use-auth";
import { clearAuthProfile, readAuthProfile, writeAuthProfile } from "@/lib/local-cache";
import { clearQueryCache } from "@/lib/query-cache";
import {
  issueEmployeeDeviceCodeFn,
  redeemEmployeeDeviceCodeFn,
  listEmployeeDevicesFn,
  revokeEmployeeDeviceFn,
  getMeFn,
} from "@/lib/rpc";

export interface EmployeeDevice {
  id: string;
  employeeId: string;
  name: string;
  linkedAt: number;
}

export const DEVICE_LINK_KEY = "cw_employee_device_link_id";

export async function issueEmployeeDeviceCode(employeeId: string) {
  return await issueEmployeeDeviceCodeFn({ data: { employeeId } });
}

export async function redeemEmployeeDeviceCode(code: string, deviceName: string) {
  const res = await redeemEmployeeDeviceCodeFn({ data: { code, deviceName } });
  if (!res?.user || !res?.token) {
    throw new Error("Failed to link employee device.");
  }

  const user = res.user as AuthUser;
  const token = res.token as string;
  const deviceId = res.deviceId || `dev_${Date.now().toString(36)}`;

  clearAuthProfile();
  clearQueryCache();
  if (typeof window !== "undefined") {
    localStorage.setItem(DEVICE_LINK_KEY, deviceId);
    localStorage.setItem("cw_active_employee_session", JSON.stringify(user));
    localStorage.setItem("cw_active_session_role", "employee");
    localStorage.setItem("app_pin_unlocked", "true");
    localStorage.setItem("auth_token", token);
    localStorage.setItem("user", JSON.stringify(user));
    sessionStorage.setItem("app_pin_unlocked", "true");
  }
  writeAuthProfile(user);

  return { user, token };
}

export async function getLinkedEmployeeSession(): Promise<{ user: AuthUser }> {
  if (typeof window === "undefined") {
    throw new Error("Window unavailable");
  }
  try {
    const res = await getMeFn();
    if (res?.user) {
      return { user: res.user as AuthUser };
    }
  } catch {}

  const profile = readAuthProfile();
  if (profile && profile.role === "employee") {
    return { user: profile as any };
  }

  return expireLinkedSession();
}

function expireLinkedSession(): never {
  clearAuthProfile();
  if (typeof window !== "undefined") {
    localStorage.removeItem("cw_active_employee_session");
    localStorage.removeItem("cw_active_session_role");
    localStorage.removeItem(DEVICE_LINK_KEY);
    localStorage.removeItem("auth_token");
  }
  throw new Error("Unauthorized: This employee device is unlinked. Ask your owner for a new code.");
}

export async function listEmployeeDevices(): Promise<{ devices: EmployeeDevice[] }> {
  const devices = await listEmployeeDevicesFn();
  return { devices: Array.isArray(devices) ? devices : [] };
}

export async function revokeEmployeeDevice(deviceIdOrCode: string) {
  return await revokeEmployeeDeviceFn({ data: { deviceId: deviceIdOrCode } });
}
