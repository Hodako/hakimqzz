import * as actions from "./rpc-admin-actions";

// Direct proxy client for admin functions as superadmin consoles require active network.
export const superAdminLoginFn = actions.superAdminLoginFn;
export const superAdminLogoutFn = actions.superAdminLogoutFn;
export const superAdminCheckFn = actions.superAdminCheckFn;
export const generatePlatformLicenseFn = actions.generatePlatformLicenseFn;
export const listPlatformLicensesFn = actions.listPlatformLicensesFn;
export const listBusinessesFn = actions.listBusinessesFn;
export const listAllUsersFn = actions.listAllUsersFn;
export const getPlatformStatsFn = actions.getPlatformStatsFn;
export const getPlatformActivitiesFn = actions.getPlatformActivitiesFn;
export const suspendBusinessFn = actions.suspendBusinessFn;
export const deleteBusinessFn = actions.deleteBusinessFn;
export const activateLicenseFn = actions.activateLicenseFn;
export const getBusinessSettingsFn = actions.getBusinessSettingsFn;
export const updateBusinessSettingsFn = actions.updateBusinessSettingsFn;
export const createEmployeeLicenseFn = actions.createEmployeeLicenseFn;
export const updateEmployeePermissionsFn = actions.updateEmployeePermissionsFn;
export const deleteLicenseFn = actions.deleteLicenseFn;
export const impersonateUserFn = actions.impersonateUserFn;
export const deleteUserFn = actions.deleteUserFn;
export const changeUserPasswordFn = actions.changeUserPasswordFn;
export const changeSuperAdminPasswordFn = actions.changeSuperAdminPasswordFn;
export const resetSalesFn = actions.resetSalesFn;
export const resetSomitiFn = actions.resetSomitiFn;
export const resetExpensesFn = actions.resetExpensesFn;
