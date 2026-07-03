// Detect if we are running inside the Capacitor Android/iOS native app
const isCapacitor = typeof window !== "undefined" && (
  window.location.origin.startsWith("capacitor:") ||
  window.location.origin.startsWith("http://localhost") ||
  window.location.origin.startsWith("file:")
);

// Point to hosted endpoint when in Capacitor, otherwise use relative path
const API_BASE = isCapacitor ? "https://hakim.qzz.io" : "";

async function callRemoteRpc(actionName: string, args: any) {
  const url = `${API_BASE}/api/rpc`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ actionName, args }),
  });

  const txt = await res.text();
  if (!res.ok) {
    throw new Error(txt || `RPC Request failed with status ${res.status}`);
  }

  try {
    return JSON.parse(txt);
  } catch (err) {
    console.error("Failed to parse RPC response as JSON. Server returned:", txt);
    throw new Error(`Server returned invalid response for ${actionName}. Please ensure your production server has been updated with the latest code (git pull & npm run build).`);
  }
}

const makeAdminAction = (name: string) => (args?: any) => callRemoteRpc(name, args);

// Expose admin actions
export const superAdminLoginFn = makeAdminAction("superAdminLoginFn");
export const superAdminLogoutFn = makeAdminAction("superAdminLogoutFn");
export const superAdminCheckFn = makeAdminAction("superAdminCheckFn");
export const generatePlatformLicenseFn = makeAdminAction("generatePlatformLicenseFn");
export const listPlatformLicensesFn = makeAdminAction("listPlatformLicensesFn");
export const listBusinessesFn = makeAdminAction("listBusinessesFn");
export const listAllUsersFn = makeAdminAction("listAllUsersFn");
export const getPlatformStatsFn = makeAdminAction("getPlatformStatsFn");
export const getPlatformActivitiesFn = makeAdminAction("getPlatformActivitiesFn");
export const suspendBusinessFn = makeAdminAction("suspendBusinessFn");
export const deleteBusinessFn = makeAdminAction("deleteBusinessFn");
export const activateLicenseFn = makeAdminAction("activateLicenseFn");
export const getBusinessSettingsFn = makeAdminAction("getBusinessSettingsFn");
export const updateBusinessSettingsFn = makeAdminAction("updateBusinessSettingsFn");
export const createEmployeeLicenseFn = makeAdminAction("createEmployeeLicenseFn");
export const updateEmployeePermissionsFn = makeAdminAction("updateEmployeePermissionsFn");
export const deleteLicenseFn = makeAdminAction("deleteLicenseFn");
export const impersonateUserFn = makeAdminAction("impersonateUserFn");
export const deleteUserFn = makeAdminAction("deleteUserFn");
export const changeUserPasswordFn = makeAdminAction("changeUserPasswordFn");
export const changeSuperAdminPasswordFn = makeAdminAction("changeSuperAdminPasswordFn");
export const resetSalesFn = makeAdminAction("resetSalesFn");
export const resetSomitiFn = makeAdminAction("resetSomitiFn");
export const resetExpensesFn = makeAdminAction("resetExpensesFn");
